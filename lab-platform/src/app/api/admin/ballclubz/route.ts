import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { parseBallclubzBoxScore } from '@/lib/ballclubz'
import { planBallclubzEnrollments, type BallclubzEnrollmentRow } from '@/lib/ballclubz-enroll'
import {
  ballclubzInnings,
  collectBallclubzPlayers,
  suggestBallclubzMappings,
  validateBallclubzMappings,
  type BallclubzClubRef,
  type BallclubzMappingSuggestions,
  type BallclubzPlayerRef,
} from '@/lib/ballclubz-import'
import { createClient } from '@/lib/supabase/server'
import type { Json, PosicionJugador } from '@/lib/database.types'

const MAX_FILE_SIZE = 2_000_000

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') return { error: NextResponse.json({ error: 'Se requiere rol de administrador' }, { status: 403 }) }
  return { supabase, user }
}

function parseMappings(value: FormDataEntryValue | null): BallclubzMappingSuggestions | null {
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const candidate = parsed as { clubs?: unknown; players?: unknown }
    if (!candidate.clubs || typeof candidate.clubs !== 'object' || Array.isArray(candidate.clubs)) return null
    if (!candidate.players || typeof candidate.players !== 'object' || Array.isArray(candidate.players)) return null
    const newPlayers = (candidate as { newPlayers?: unknown }).newPlayers
    return {
      clubs: Object.fromEntries(Object.entries(candidate.clubs).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      players: Object.fromEntries(Object.entries(candidate.players).filter((entry): entry is [string, string] => typeof entry[1] === 'string')),
      newPlayers: newPlayers && typeof newPlayers === 'object' && !Array.isArray(newPlayers)
        ? Object.fromEntries(Object.entries(newPlayers).flatMap(([key, value]) => {
          const nombre = value && typeof value === 'object' ? (value as { nombre?: unknown }).nombre : null
          return typeof nombre === 'string' ? [[key, { nombre }] as const] : []
        }))
        : {},
    }
  } catch {
    return null
  }
}

type AdminSupabase = Awaited<ReturnType<typeof createClient>>

/** Inserts one season inscription; returns the existing one when the identity is already enrolled. */
async function insertInscription(supabase: AdminSupabase, row: BallclubzEnrollmentRow) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = attempt === 0 ? row.slug : `${row.slug.slice(0, 140)}-${randomUUID().slice(0, 4)}`
    const { data, error } = await supabase
      .from('jugadores')
      .insert({ ...row, slug, posicion: row.posicion as PosicionJugador })
      .select('id')
      .single()
    if (!error && data) return { id: data.id, created: true }
    if (error?.code !== '23505') throw error ?? new Error(`No se pudo inscribir a ${row.nombre}`)
    if (row.stable_id) {
      const { data: existing } = await supabase
        .from('jugadores')
        .select('id')
        .eq('stable_id', row.stable_id)
        .eq('club_id', row.club_id)
        .eq('temporada_id', row.temporada_id)
        .maybeSingle()
      if (existing) return { id: existing.id, created: false }
    }
  }
  throw new Error(`No se pudo generar un identificador único para ${row.nombre}`)
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  try {
    const form = await request.formData()
    const mode = form.get('mode')
    const file = form.get('file')
    if (mode !== 'preview' && mode !== 'apply') return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
    if (!(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo HTML' }, { status: 400 })
    if (!/\.html?$/i.test(file.name)) return NextResponse.json({ error: 'El archivo debe tener extensión .html o .htm' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'El archivo debe pesar entre 1 byte y 2 MB' }, { status: 400 })

    const html = await file.text()
    const fileHash = createHash('sha256').update(html).digest('hex')
    const game = parseBallclubzBoxScore(html)
    const gameYear = Number(game.date.slice(0, 4))
    const { data: season } = await supabase.from('temporadas').select('id, nombre, anio').eq('anio', gameYear).single()
    if (!season) return NextResponse.json({ error: `No existe la temporada ${gameYear} en LAB` }, { status: 409 })
    const [{ data: clubs }, { data: players }, { data: existingGame }, { data: memberships }] = await Promise.all([
      supabase.from('clubes').select('id, nombre, nombre_corto, slug').order('nombre'),
      supabase.from('jugadores').select('id, nombre, club_id, temporada_id, stable_id, posicion').eq('activo', true).order('nombre'),
      supabase.from('partidos').select('id, estado, updated_at').eq('external_source', 'ballclubz').eq('external_key', game.externalKey).maybeSingle(),
      supabase.from('temporada_clubes').select('club_id').eq('temporada_id', season.id).eq('visible', true),
    ])
    const allowedClubIds = new Set((memberships ?? []).map((membership) => membership.club_id))
    const clubRefs = ((clubs ?? []) as BallclubzClubRef[]).filter((club) => allowedClubIds.has(club.id))
    const playerRefs = (players ?? []) as BallclubzPlayerRef[]
    const suggestions = suggestBallclubzMappings(game, clubRefs, playerRefs, season.id)
    const sourcePlayers = collectBallclubzPlayers(game)

    if (mode === 'preview') {
      const unresolved = validateBallclubzMappings(game, clubRefs, playerRefs, suggestions)
      const { data: lote, error } = await supabase
        .from('import_lotes')
        .insert({
          fuente: 'ballclubz',
          temporada_id: season.id,
          estado: unresolved.length > 0 ? 'bloqueado' : 'preview',
          creado_por: user.id,
          resumen: {
            fileName: file.name,
            fileHash,
            externalKey: game.externalKey,
            battingRows: game.visitor.batting.length + game.home.batting.length,
            pitchingRows: game.visitor.pitching.length + game.home.pitching.length,
            unresolved: unresolved.length,
          },
          conflictos: unresolved,
        })
        .select('id, estado, created_at')
        .single()
      if (error) throw error
      return NextResponse.json({
        lote,
        game,
        season,
        clubs: clubRefs,
        players: playerRefs.filter((player) => allowedClubIds.has(player.club_id)),
        sourcePlayers,
        suggestions,
        existingGame,
      })
    }

    const loteId = form.get('lote_id')
    const mappings = parseMappings(form.get('mappings'))
    if (typeof loteId !== 'string' || !loteId || !mappings) return NextResponse.json({ error: 'Faltan el lote o los mapeos' }, { status: 400 })
    const { data: lote, error: loteError } = await supabase.from('import_lotes').select('*').eq('id', loteId).single()
    if (loteError || !lote || lote.fuente !== 'ballclubz') return NextResponse.json({ error: 'Lote BallClubz no encontrado' }, { status: 404 })
    if (lote.temporada_id !== season.id) return NextResponse.json({ error: 'La temporada del archivo no coincide con el preview' }, { status: 409 })
    const summary = lote.resumen && typeof lote.resumen === 'object' && !Array.isArray(lote.resumen) ? lote.resumen as Record<string, Json | undefined> : {}
    if (summary.fileHash !== fileHash || summary.externalKey !== game.externalKey) {
      return NextResponse.json({ error: 'El archivo no coincide con el preview aprobado' }, { status: 409 })
    }
    const mappingErrors = validateBallclubzMappings(game, clubRefs, playerRefs, mappings)
    if (mappingErrors.length > 0) return NextResponse.json({ error: 'Hay mapeos inválidos', errors: mappingErrors }, { status: 409 })

    const clubFor = (teamSourceKey: string) => mappings.clubs[teamSourceKey]
    // Players picked from another season, or created here, are enrolled in this season first.
    // If the transactional import fails afterwards the new inscriptions are removed again.
    const enrolledPlayers = new Map<string, string>()
    const createdPlayerIds: string[] = []
    const discardCreatedPlayers = async () => {
      if (createdPlayerIds.length > 0) await supabase.from('jugadores').delete().in('id', createdPlayerIds)
    }
    try {
      for (const step of planBallclubzEnrollments({ game, season, clubs: clubRefs, players: playerRefs, mappings })) {
        if (step.kind === 'existing') {
          enrolledPlayers.set(step.sourceKey, step.jugadorId)
          continue
        }
        const inserted = await insertInscription(supabase, step.row)
        if (inserted.created) createdPlayerIds.push(inserted.id)
        enrolledPlayers.set(step.sourceKey, inserted.id)
      }
    } catch (enrollError) {
      await discardCreatedPlayers()
      throw enrollError
    }
    const playerFor = (sourceKey: string) => {
      const playerId = enrolledPlayers.get(sourceKey)
      if (!playerId) throw new Error(`Jugador no mapeado: ${sourceKey}`)
      return playerId
    }
    const gameId = existingGame?.id ?? randomUUID()
    const dateTime = `${game.date}T${game.startTime ?? '12:00'}:00-03:00`
    const startedAt = new Date(dateTime)
    const finishedAt = new Date(startedAt.getTime() + (game.durationMinutes ?? 0) * 60_000)
    const partido = {
      id: gameId,
      temporada_id: season.id,
      external_key: game.externalKey,
      fecha_numero: game.gameNumber,
      local_id: clubFor(game.home.sourceKey),
      visitante_id: clubFor(game.visitor.sourceKey),
      fecha_hora: startedAt.toISOString(),
      finalizado_at: finishedAt.toISOString(),
      estadio: game.venue,
      fase: 'regular',
      marcador_local: game.home.score,
      marcador_visitante: game.visitor.score,
      marcador_innings: ballclubzInnings(game),
    }
    const batting = [game.visitor, game.home].flatMap((team) => team.batting.map((row, index) => ({
      jugador_id: playerFor(row.sourceKey), club_id: clubFor(team.sourceKey), orden_bateo: index + 1,
      ab: row.ab, r: row.r, h: row.h, doble: row.doble, triple: row.triple, hr: row.hr,
      rbi: row.rbi, bb: row.bb, so: row.so, sb: row.sb, cs: row.cs, sf: row.sf, hbp: row.hbp,
      extras: { source: 'ballclubz', name: row.name, position: row.position, sh: row.sh, ibb: row.ibb, kl: row.kl, gdp: row.gdp },
    })))
    const pitching = [game.visitor, game.home].flatMap((team) => team.pitching.map((row) => ({
      jugador_id: playerFor(row.sourceKey), club_id: clubFor(team.sourceKey), ip: row.ip,
      h: row.h, r: row.r, er: row.er, bb: row.bb, so: row.so, hr: row.hr,
      w: row.w, l: row.l, sv: row.sv, wp: row.wp, bk: row.bk, bf: row.bf,
      extras: { source: 'ballclubz', name: row.name, hbp: row.hbp, ibb: row.ibb, sh: row.sh, sf: row.sf, doble: row.doble, triple: row.triple, ab: row.ab, fo: row.fo, go: row.go, np: row.np },
    })))
    const fielding = [game.visitor, game.home].flatMap((team) => team.batting.map((row) => ({
      jugador_id: playerFor(row.sourceKey), club_id: clubFor(team.sourceKey),
      po: row.po, a: row.a, e: row.e, dp: 0,
      extras: { source: 'ballclubz', name: row.name, position: row.position },
    })))

    try {
      const { data: applied, error: applyError } = await supabase.rpc('apply_ballclubz_game', {
        p_lote_id: lote.id,
        p_partido: partido as Json,
        p_bateo: batting as Json,
        p_pitcheo: pitching as Json,
        p_fildeo: fielding as Json,
      })
      if (applyError) throw applyError
      if (!applied || typeof applied !== 'object' || Array.isArray(applied)) throw new Error('Respuesta inválida de la importación')
      const result = applied as Record<string, Json | undefined>
      if (result.status === 'failed') throw new Error(typeof result.error === 'string' ? result.error : 'Falló la importación transaccional')
      return NextResponse.json({ result, partidoId: result.partido_id ?? gameId, inscriptionsCreated: createdPlayerIds.length })
    } catch (applyFailure) {
      await discardCreatedPlayers()
      throw applyFailure
    }
  } catch (error) {
    console.error('[ballclubz/import]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar el HTML' }, { status: 500 })
  }
}
