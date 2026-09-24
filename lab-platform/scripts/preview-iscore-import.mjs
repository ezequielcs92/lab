import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REQUIRED_FILES = [
  'statsHomeBatting.csv',
  'statsHomePitching.csv',
  'statsHomeFielding.csv',
  'statsVisitorBatting.csv',
  'statsVisitorPitching.csv',
  'statsVisitorFielding.csv',
]
const CLUB_SLUGS = new Map([
  ['aguilas', 'cachorros'],
  ['condores', 'arias'],
  ['falcons', 'falcons'],
  ['infernales', 'infernales'],
  ['pampas', 'pampas'],
  ['pumas', 'pumas'],
])

function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function parseCsv(content) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }
  if (rows.length === 0) return { headers: [], rows: [] }

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ''))
  return {
    headers,
    rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))),
  }
}

function isTotalsRow(row) {
  return /^(team\s+)?totals?$/.test(normalizeText(row.Name ?? ''))
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const directories = [directory]
  for (const entry of entries) {
    if (entry.isDirectory()) directories.push(...await walk(path.join(directory, entry.name)))
  }
  return directories
}

function parseGameFolder(folderName) {
  const match = folderName.match(/^Juego\s+(\d+)\s+_?\s*(.+?)\s+vs\.?\s+(.+?)\s+(\d{1,2})-(\d{1,2})-(\d{4})$/i)
  if (!match) return null
  const [, number, visitor, home, day, month, year] = match
  return {
    number: Number(number),
    visitor: visitor.trim(),
    home: home.trim(),
    date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    year: Number(year),
  }
}

async function inspectCopy(directory, game) {
  const names = new Set((await readdir(directory)).map((name) => name.toLowerCase()))
  const missingFiles = REQUIRED_FILES.filter((name) => !names.has(name.toLowerCase()))
  const csv = {}
  const hash = createHash('sha256')

  for (const filename of REQUIRED_FILES) {
    if (missingFiles.includes(filename)) continue
    const content = await readFile(path.join(directory, filename), 'utf8')
    hash.update(filename).update('\0').update(content).update('\0')
    csv[filename] = parseCsv(content)
  }

  const runs = (filename) => {
    const rows = csv[filename]?.rows ?? []
    const totals = rows.find(isTotalsRow)
    return totals ? Number(totals.R) || 0 : rows.reduce((total, row) => total + (Number(row.R) || 0), 0)
  }
  return {
    ...game,
    directory,
    externalKey: `iscore:${game.year}:game:${game.number}`,
    fingerprint: missingFiles.length === 0 ? hash.digest('hex') : null,
    missingFiles,
    scoreVisitor: runs('statsVisitorBatting.csv'),
    scoreHome: runs('statsHomeBatting.csv'),
    csv,
  }
}

async function collectGames(root) {
  const directories = await walk(path.resolve(root))
  const games = []
  const unparsedDirectories = []
  for (const directory of directories) {
    const files = await readdir(directory)
    if (!files.some((name) => /^stats(Home|Visitor)/i.test(name))) continue
    const game = parseGameFolder(path.basename(directory))
    if (!game) {
      if (files.some((name) => /^statsHome/i.test(name))) unparsedDirectories.push(directory)
      continue
    }
    games.push(await inspectCopy(directory, game))
  }
  return { games, unparsedDirectories }
}

function copyMetadata(copy) {
  return [normalizeText(copy.visitor), normalizeText(copy.home), copy.date, copy.scoreVisitor, copy.scoreHome].join('|')
}

function summarize(games, unparsedDirectories) {
  const groups = new Map()
  for (const game of games) {
    const copies = groups.get(game.externalKey) ?? []
    copies.push(game)
    groups.set(game.externalKey, copies)
  }

  const conflicts = []
  const uniqueGames = []
  const headers = { batting: new Set(), pitching: new Set(), fielding: new Set() }
  const players = new Map()
  const clubs = new Set()
  const statRows = { batting: 0, pitching: 0, fielding: 0 }

  for (const [externalKey, copies] of groups) {
    const metadata = new Set(copies.map(copyMetadata))
    const fingerprints = new Set(copies.map((copy) => copy.fingerprint).filter(Boolean))
    const incomplete = copies.filter((copy) => copy.missingFiles.length > 0)
    if (metadata.size > 1) conflicts.push({ type: 'GAME_METADATA_MISMATCH', externalKey, copies: copies.map((copy) => copy.directory) })
    if (fingerprints.size > 1) conflicts.push({ type: 'GAME_CONTENT_MISMATCH', externalKey, copies: copies.map((copy) => copy.directory) })
    for (const copy of incomplete) conflicts.push({ type: 'INCOMPLETE_GAME', externalKey, directory: copy.directory, missingFiles: copy.missingFiles })

    const canonical = copies.find((copy) => copy.missingFiles.length === 0) ?? copies[0]
    uniqueGames.push({
      externalKey,
      year: canonical.year,
      number: canonical.number,
      date: canonical.date,
      visitor: canonical.visitor,
      home: canonical.home,
      scoreVisitor: canonical.scoreVisitor,
      scoreHome: canonical.scoreHome,
      copies: copies.length,
    })
    clubs.add(canonical.visitor)
    clubs.add(canonical.home)

    for (const side of ['Home', 'Visitor']) {
      const club = side === 'Home' ? canonical.home : canonical.visitor
      for (const kind of ['Batting', 'Pitching', 'Fielding']) {
        const parsed = canonical.csv[`stats${side}${kind}.csv`]
        const key = kind.toLowerCase()
        if (!parsed) continue
        parsed.headers.forEach((header) => headers[key].add(header))
        const playerRows = parsed.rows.filter((row) => !isTotalsRow(row))
        statRows[key] += playerRows.length
        for (const row of playerRows) {
          const name = (row.Name ?? '').replace(/\s+/g, ' ').trim()
          if (!name) continue
          const normalizedName = normalizeText(name)
          const player = players.get(normalizedName) ?? { names: new Set(), clubs: new Set(), rows: 0 }
          player.names.add(name)
          player.clubs.add(club)
          player.rows += 1
          players.set(normalizedName, player)
        }
      }
    }
  }

  const crossClubPlayers = [...players.entries()]
    .filter(([, player]) => player.clubs.size > 1)
    .map(([normalizedName, player]) => ({ normalizedName, names: [...player.names], clubs: [...player.clubs] }))
  const clubMappings = [...clubs]
    .sort()
    .map((name) => ({ name, slug: CLUB_SLUGS.get(normalizeText(name)) ?? null }))
  const unmappedClubs = clubMappings.filter((club) => club.slug === null)

  return {
    summary: {
      gameCopies: games.length,
      uniqueGames: uniqueGames.length,
      duplicateCopies: games.length - uniqueGames.length,
      clubs: [...clubs].sort(),
      normalizedPlayers: players.size,
      crossClubPlayers: crossClubPlayers.length,
      mappedClubs: clubMappings.length - unmappedClubs.length,
      unmappedClubs: unmappedClubs.length,
       blockingConflicts: conflicts.length + unmappedClubs.length,
       identityReviews: crossClubPlayers.length,
      statRows,
      headerCounts: Object.fromEntries(Object.entries(headers).map(([key, values]) => [key, values.size])),
      conflicts: conflicts.length,
      unparsedGameDirectories: unparsedDirectories.length,
    },
    conflicts,
    clubMappings,
    unmappedClubs,
    crossClubPlayers,
    unparsedDirectories,
    games: uniqueGames.sort((a, b) => a.year - b.year || a.number - b.number),
    headers: Object.fromEntries(Object.entries(headers).map(([key, values]) => [key, [...values]])),
  }
}

async function main() {
  const root = process.argv[2]
  if (!root) throw new Error('Uso: node scripts/preview-iscore-import.mjs <carpeta-extraida> [--json]')

  const { games, unparsedDirectories } = await collectGames(root)

  const report = summarize(games, unparsedDirectories)
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
    return
  }
  console.log(JSON.stringify(report.summary, null, 2))
  if (process.argv.includes('--headers')) console.log('\nEncabezados:\n' + JSON.stringify(report.headers, null, 2))
  if (process.argv.includes('--details')) {
    if (report.conflicts.length > 0) console.log('\nConflictos:\n' + JSON.stringify(report.conflicts, null, 2))
    if (report.unmappedClubs.length > 0) console.log('\nClubes sin mapear:\n' + JSON.stringify(report.unmappedClubs, null, 2))
    if (report.crossClubPlayers.length > 0) console.log('\nJugadores para revisar entre clubes:\n' + JSON.stringify(report.crossClubPlayers, null, 2))
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}

export {
  CLUB_SLUGS,
  collectGames,
  copyMetadata,
  inspectCopy,
  isTotalsRow,
  normalizeText,
  parseCsv,
  parseGameFolder,
  summarize,
}
