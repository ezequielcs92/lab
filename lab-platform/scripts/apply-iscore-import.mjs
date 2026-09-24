import { createHash } from 'node:crypto'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { CLUB_SLUGS, collectGames, isTotalsRow, normalizeText, summarize } from './preview-iscore-import.mjs'

function arg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function sql(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`
}

function sqlJson(value) {
  return `${sql(JSON.stringify(value ?? {}))}::jsonb`
}

function raw(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== '') return row[name]
  }
  return ''
}

function numberValue(row, names, label) {
  const value = raw(row, names)
  if (value === '') return 0
  const result = Number(value)
  if (!Number.isFinite(result) || result < 0) throw new Error(`${label} inválido: ${value}`)
  return result
}

function inningsValue(row) {
  const value = raw(row, ['IP', 'Ip', 'Innings Pitched'])
  if (!value) return 0
  const result = Number(value)
  const whole = Math.trunc(result)
  const fraction = Math.round((result - whole) * 100)
  if (!Number.isFinite(result) || ![0, 1, 2, 33, 67].includes(fraction)) throw new Error(`IP histórico inválido: ${value}`)
  // iScore exports thirds as .33/.67; the database stores baseball innings as .1/.2.
  return whole + (fraction === 33 ? 0.1 : fraction === 67 ? 0.2 : fraction)
}

function booleanValue(row, names) {
  return ['1', 'true', 'yes', 'y', 'w', 'l', 'sv'].includes(String(raw(row, names)).trim().toLowerCase())
}

function stableExpression(name) {
  return `uuid_generate_v5(uuid_ns_url(), ${sql(`lab:historical:player:${normalizeText(name)}`)})`
}

function playerSlug(year, clubSlug, name) {
  const digest = createHash('sha256').update(`${year}|${clubSlug}|${normalizeText(name)}`).digest('hex').slice(0, 16)
  return `historical-${year}-${clubSlug}-${digest}`
}

function canonicalGames(games) {
  const groups = new Map()
  for (const game of games) {
    const list = groups.get(game.externalKey) ?? []
    list.push(game)
    groups.set(game.externalKey, list)
  }
  const result = []
  for (const [externalKey, copies] of groups) {
    const metadata = new Set(copies.map((copy) => [normalizeText(copy.visitor), normalizeText(copy.home), copy.date, copy.scoreVisitor, copy.scoreHome].join('|')))
    const fingerprints = new Set(copies.map((copy) => copy.fingerprint).filter(Boolean))
    if (metadata.size > 1 || fingerprints.size > 1) {
      throw new Error(`Copias incompatibles para ${externalKey}`)
    }
    const canonical = copies.find((copy) => copy.missingFiles.length === 0) ?? copies[0]
    if (canonical.missingFiles.length > 0) throw new Error(`Archivos faltantes para ${externalKey}: ${canonical.missingFiles.join(', ')}`)
    result.push(canonical)
  }
  return result.sort((a, b) => a.year - b.year || a.number - b.number)
}

function canonicalClub(rawName) {
  const slug = CLUB_SLUGS.get(normalizeText(rawName))
  if (!slug) throw new Error(`Club histórico sin mapeo: ${rawName}`)
  return slug
}

function rowsFor(game, side, kind) {
  return (game.csv[`stats${side}${kind}.csv`]?.rows ?? []).filter((row) => !isTotalsRow(row))
}

function collectPlayers(games) {
  const players = new Map()
  for (const game of games) {
    for (const side of ['Home', 'Visitor']) {
      const club = canonicalClub(side === 'Home' ? game.home : game.visitor)
      for (const kind of ['Batting', 'Pitching', 'Fielding']) {
        for (const row of rowsFor(game, side, kind)) {
          const name = String(row.Name ?? '').replace(/\s+/g, ' ').trim()
          if (!name) continue
          const key = `${game.year}|${club}|${normalizeText(name)}`
          if (!players.has(key)) players.set(key, { year: game.year, club, name })
        }
      }
    }
  }
  return [...players.values()]
}

function playerLookup(year, club, name) {
  return `(SELECT id FROM jugadores WHERE stable_id = ${stableExpression(name)} AND temporada_id = (SELECT id FROM temporadas WHERE anio = ${year}) AND club_id = (SELECT id FROM clubes WHERE slug = ${sql(club)}) LIMIT 1)`
}

function gameLookup(game) {
  return `(SELECT id FROM partidos WHERE external_source = 'iscore' AND external_key = ${sql(game.externalKey)})`
}

function splitSql(statements, maxBytes = 350_000) {
  const parts = []
  let current = []
  let currentBytes = Buffer.byteLength('BEGIN;\nSET LOCAL lock_timeout = \'30s\';\nCOMMIT;\n')

  for (const statement of statements) {
    const statementBytes = Buffer.byteLength(`${statement}\n`)
    if (current.length > 0 && currentBytes + statementBytes > maxBytes) {
      parts.push(`BEGIN;\nSET LOCAL lock_timeout = '30s';\n${current.join('\n')}\nCOMMIT;\n`)
      current = []
      currentBytes = Buffer.byteLength('BEGIN;\nSET LOCAL lock_timeout = \'30s\';\nCOMMIT;\n')
    }
    current.push(statement)
    currentBytes += statementBytes
  }
  if (current.length > 0) parts.push(`BEGIN;\nSET LOCAL lock_timeout = '30s';\n${current.join('\n')}\nCOMMIT;\n`)
  return parts
}

function statRows(games) {
  const statements = { batting: [], pitching: [], fielding: [] }
  for (const game of games) {
    const year = game.year
    const clubBySide = { Home: canonicalClub(game.home), Visitor: canonicalClub(game.visitor) }
    for (const side of ['Home', 'Visitor']) {
      const club = clubBySide[side]
      for (const row of rowsFor(game, side, 'Batting')) {
        const name = String(row.Name ?? '').replace(/\s+/g, ' ').trim()
        if (!name) continue
        const fields = ['AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'SB', 'CS', 'SF', 'HBP']
        const values = fields.map((field) => numberValue(row, [field], field))
        const extras = { ...row }
        statements.batting.push(`INSERT INTO estadisticas_bateo (partido_id, jugador_id, temporada_id, club_id, orden_bateo, ab, r, h, doble, triple, hr, rbi, bb, so, sb, cs, sf, hbp, extras) SELECT ${gameLookup(game)}, ${playerLookup(year, club, name)}, (SELECT id FROM temporadas WHERE anio = ${year}), (SELECT id FROM clubes WHERE slug = ${sql(club)}), ${numberValue(row, ['Lineup', 'Order', 'Batting Order'], 'orden_bateo') || 'NULL'}, ${values.join(', ')}, ${sqlJson(extras)} WHERE ${gameLookup(game)} IS NOT NULL AND ${playerLookup(year, club, name)} IS NOT NULL ON CONFLICT (partido_id, jugador_id) DO UPDATE SET ab = EXCLUDED.ab, r = EXCLUDED.r, h = EXCLUDED.h, doble = EXCLUDED.doble, triple = EXCLUDED.triple, hr = EXCLUDED.hr, rbi = EXCLUDED.rbi, bb = EXCLUDED.bb, so = EXCLUDED.so, sb = EXCLUDED.sb, cs = EXCLUDED.cs, sf = EXCLUDED.sf, hbp = EXCLUDED.hbp, extras = EXCLUDED.extras, updated_at = NOW();`)
      }
      for (const row of rowsFor(game, side, 'Pitching')) {
        const name = String(row.Name ?? '').replace(/\s+/g, ' ').trim()
        if (!name) continue
        const values = [
          inningsValue(row),
          ...['H', 'R', 'ER', 'BB', 'SO', 'HR'].map((field) => numberValue(row, [field], field)),
          booleanValue(row, ['W']), booleanValue(row, ['L']), booleanValue(row, ['SV']),
          ...['HLD', 'WP', 'BK', 'BF'].map((field) => numberValue(row, [field], field)),
        ]
        statements.pitching.push(`INSERT INTO estadisticas_pitcheo (partido_id, jugador_id, temporada_id, club_id, ip, h, r, er, bb, so, hr, w, l, sv, hld, wp, bk, bf, extras) SELECT ${gameLookup(game)}, ${playerLookup(year, club, name)}, (SELECT id FROM temporadas WHERE anio = ${year}), (SELECT id FROM clubes WHERE slug = ${sql(club)}), ${values.map((value) => typeof value === 'boolean' ? value : value).join(', ')}, ${sqlJson({ ...row })} WHERE ${gameLookup(game)} IS NOT NULL AND ${playerLookup(year, club, name)} IS NOT NULL ON CONFLICT (partido_id, jugador_id) DO UPDATE SET ip = EXCLUDED.ip, h = EXCLUDED.h, r = EXCLUDED.r, er = EXCLUDED.er, bb = EXCLUDED.bb, so = EXCLUDED.so, hr = EXCLUDED.hr, w = EXCLUDED.w, l = EXCLUDED.l, sv = EXCLUDED.sv, hld = EXCLUDED.hld, wp = EXCLUDED.wp, bk = EXCLUDED.bk, bf = EXCLUDED.bf, extras = EXCLUDED.extras, updated_at = NOW();`)
      }
      for (const row of rowsFor(game, side, 'Fielding')) {
        const name = String(row.Name ?? '').replace(/\s+/g, ' ').trim()
        if (!name) continue
        const values = ['PO', 'A', 'E', 'DP'].map((field) => numberValue(row, [field], field))
        statements.fielding.push(`INSERT INTO estadisticas_fildeo (partido_id, jugador_id, temporada_id, club_id, po, a, e, dp, extras) SELECT ${gameLookup(game)}, ${playerLookup(year, club, name)}, (SELECT id FROM temporadas WHERE anio = ${year}), (SELECT id FROM clubes WHERE slug = ${sql(club)}), ${values.join(', ')}, ${sqlJson({ ...row })} WHERE ${gameLookup(game)} IS NOT NULL AND ${playerLookup(year, club, name)} IS NOT NULL ON CONFLICT (partido_id, jugador_id) DO UPDATE SET po = EXCLUDED.po, a = EXCLUDED.a, e = EXCLUDED.e, dp = EXCLUDED.dp, extras = EXCLUDED.extras, updated_at = NOW();`)
      }
    }
  }
  return statements
}

function buildSql(games) {
  const players = collectPlayers(games)
  const stats = statRows(games)
  const statements = []
  for (const year of [2017, 2018]) {
    statements.push(`INSERT INTO temporadas (anio, nombre, fecha_inicio, fecha_fin, activa) VALUES (${year}, 'Temporada ${year}', '${year}-01-01', '${year}-12-31', false) ON CONFLICT (anio) DO UPDATE SET nombre = EXCLUDED.nombre;`)
  }
  for (const player of players) {
    statements.push(`INSERT INTO jugadores (stable_id, nombre, slug, posicion, club_id, temporada_id, activo) VALUES (${stableExpression(player.name)}, ${sql(player.name)}, ${sql(playerSlug(player.year, player.club, player.name))}, 'utility', (SELECT id FROM clubes WHERE slug = ${sql(player.club)}), (SELECT id FROM temporadas WHERE anio = ${player.year}), true) ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre, activo = true, updated_at = NOW();`)
  }
  for (const game of games) {
    const visitor = canonicalClub(game.visitor)
    const home = canonicalClub(game.home)
    if (game.scoreVisitor === game.scoreHome) throw new Error(`Partido empatado: ${game.externalKey}`)
    statements.push(`INSERT INTO partidos (temporada_id, external_source, external_key, fecha_numero, local_id, visitante_id, fecha_hora, estado, marcador_local, marcador_visitante, marcador_innings) VALUES ((SELECT id FROM temporadas WHERE anio = ${game.year}), 'iscore', ${sql(game.externalKey)}, ${game.number}, (SELECT id FROM clubes WHERE slug = ${sql(home)}), (SELECT id FROM clubes WHERE slug = ${sql(visitor)}), '${game.date}T12:00:00Z', 'finalizado', ${game.scoreHome}, ${game.scoreVisitor}, '[]'::jsonb) ON CONFLICT (external_source, external_key) WHERE external_source IS NOT NULL AND external_key IS NOT NULL DO UPDATE SET local_id = EXCLUDED.local_id, visitante_id = EXCLUDED.visitante_id, fecha_hora = EXCLUDED.fecha_hora, estado = EXCLUDED.estado, marcador_local = EXCLUDED.marcador_local, marcador_visitante = EXCLUDED.marcador_visitante, updated_at = NOW();`)
  }
  statements.push(...stats.batting, ...stats.pitching, ...stats.fielding)
  statements.push(`SELECT recalculate_standings(id) FROM temporadas WHERE anio IN (2017, 2018);`)
  statements.push(`DO $$ BEGIN IF (SELECT COUNT(*) FROM partidos WHERE external_source = 'iscore') <> ${games.length} THEN RAISE EXCEPTION 'Cantidad de partidos iScore inesperada'; END IF; END $$;`)
  const parts = splitSql(statements)
  return { parts, counts: { games: games.length, players: players.length, batting: stats.batting.length, pitching: stats.pitching.length, fielding: stats.fielding.length } }
}

async function executeWithSupabase(sqlPath) {
  const executable = process.platform === 'win32' ? process.execPath : 'npx'
  const args = process.platform === 'win32'
    ? [path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), 'supabase', 'db', 'query', '--linked', '--file', sqlPath]
    : ['supabase', 'db', 'query', '--linked', '--file', sqlPath]
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      stdio: 'inherit',
      shell: false,
    })
    child.on('error', reject)
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`supabase db query terminó con código ${code}`)))
  })
}

async function main() {
  const root = arg('--root') ?? process.argv[2]
  if (!root) throw new Error('Uso: npm run iscore:apply -- <carpeta-extraida> --staging-ref <project-ref> [--execute]')
  const ref = arg('--staging-ref')
  if (hasFlag('--execute') && !ref) throw new Error('--staging-ref es obligatorio para ejecutar; no se permite apuntar a producción por accidente')
  const { games, unparsedDirectories } = await collectGames(root)
  if (unparsedDirectories.length > 0) throw new Error(`Hay carpetas sin parsear: ${unparsedDirectories.join(', ')}`)
  const report = summarize(games, unparsedDirectories)
  if (report.summary.blockingConflicts > 0) throw new Error(`El preview tiene ${report.summary.blockingConflicts} bloqueos técnicos`)
  const canonical = canonicalGames(games)
  const built = buildSql(canonical)
   console.log(JSON.stringify({ preview: report.summary, apply: built.counts, sqlParts: built.parts.length, execute: hasFlag('--execute'), stagingRef: ref ?? null }, null, 2))
  if (!hasFlag('--execute')) return
  const linkedRef = (await readFile(path.join(process.cwd(), 'supabase', '.temp', 'project-ref'), 'utf8')).trim()
  if (linkedRef !== ref) throw new Error(`El proyecto vinculado (${linkedRef}) no coincide con --staging-ref (${ref})`)
   const sqlPaths = built.parts.map((part, index) => path.join(os.tmpdir(), `lab-iscore-${Date.now()}-${index + 1}.sql`))
   await Promise.all(sqlPaths.map((sqlPath, index) => writeFile(sqlPath, built.parts[index], 'utf8')))
   try {
     for (const sqlPath of sqlPaths) await executeWithSupabase(sqlPath)
     console.log('Importación iScore aplicada correctamente en el proyecto staging vinculado.')
   } finally {
     await Promise.all(sqlPaths.map((sqlPath) => unlink(sqlPath).catch(() => undefined)))
   }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
