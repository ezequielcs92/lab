import { createHash, randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { parseBallclubzBoxScore } from '@/lib/ballclubz'
import { planBallclubzEnrollments } from '@/lib/ballclubz-enroll'
import {
  ballclubzInnings,
  collectBallclubzPlayers,
  suggestBallclubzMappings,
  validateBallclubzMappings,
  type BallclubzClubRef,
  type BallclubzMappingSuggestions,
  type BallclubzPlayerRef,
} from '@/lib/ballclubz-import'
import { findScheduledGame } from '@/lib/ballclubz-schedule'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/database.types'

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

const PROFILE_FIELDS = 'id, numero_camiseta, fecha_nacimiento, lugar_nacimiento, batea, lanza, foto_url, bio'

/**
 * Resolves every player of the box score to a jugador id. Inscriptions that do not exist yet get a
 * fresh id and are returned so apply_ballclubz_game inserts them in the same transaction as the
 * statistics: nothing is written here, so a failed import leaves no stray rows behind.
 */
async function resolveInscriptions(
  supabase: AdminSupabase,
  steps: ReturnType<typeof planBallclubzEnrollments>,
  seasonId: string,
) {
  const enroll = steps.filter((step) => step.kind === 'enroll')
  const profileIds = enroll.map((step) => step.sourceId)
  const stableIds = enroll.flatMap((step) => (step.row.stable_id ? [step.row.stable_id] : []))
  const slugs = steps.flatMap((step) => (step.kind === 'existing' ? [] : [step.row.slug]))

  const [{ data: profiles }, { data: sameSeason }, { data: takenSlugs }] = await Promise.all([
    profileIds.length ? supabase.from('jugadores').select(PROFILE_FIELDS).in('id', profileIds) : Promise.resolve({ data: [] }),
    stableIds.length
      ? supabase.from('jugadores').select('id, stable_id, club_id').eq('temporada_id', seasonId).in('stable_id', stableIds)
      : Promise.resolve({ data: [] }),
    slugs.length ? supabase.from('jugadores').select('slug').in('slug', slugs) : Promise.resolve({ data: [] }),
  ])
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const usedSlugs = new Set((takenSlugs ?? []).map((row) => row.slug))

  const playerIds = new Map<string, string>()
  const inscriptions: Record<string, Json>[] = []
  for (const step of steps) {
    if (step.kind === 'existing') {
      playerIds.set(step.sourceKey, step.jugadorId)
      continue
    }
    // An inactive inscription of the same identity is invisible to the mapping list but would
    // still violate the unique index, so reuse it.
    const already = step.kind === 'enroll'
      ? (sameSeason ?? []).find((row) => row.stable_id === step.row.stable_id && row.club_id === step.row.club_id)
      : undefined
    if (already) {
      playerIds.set(step.sourceKey, already.id)
      continue
    }
    let slug = step.row.slug
    for (let suffix = 2; usedSlugs.has(slug); suffix += 1) slug = `${step.row.slug.slice(0, 140)}-${suffix}`
    usedSlugs.add(slug)

    const profile = step.kind === 'enroll' ? profileById.get(step.sourceId) : undefined
    const id = randomUUID()
    playerIds.set(step.sourceKey, id)
    inscriptions.push({
      ...step.row,
      id,
      slug,
      stable_id: step.row.stable_id ?? null,
      numero_camiseta: profile?.numero_camiseta ?? null,
      fecha_nacimiento: profile?.fecha_nacimiento ?? null,
      lugar_nacimiento: profile?.lugar_nacimiento ?? null,
      batea: profile?.batea ?? null,
      lanza: profile?.lanza ?? null,
      foto_url: profile?.foto_url ?? null,
      bio: profile?.bio ?? null,
    })
  }
  return { playerIds, inscriptions }
}

/** The game scheduled by hand for these two clubs on this day, if there is exactly one. */
async function findScheduledGameFor(
  supabase: AdminSupabase,
  seasonId: string,
  clubA: string | undefined,
  clubB: string | undefined,
  date: string,
) {
  if (!clubA || !clubB) return null
  const { data, error } = await supabase
    .from('partidos')
    .select('id, estado, fecha_hora, local_id, visitante_id, external_key, fecha_numero')
    .eq('temporada_id', seasonId)
    .is('external_key', null)
    .in('local_id', [clubA, clubB])
    .in('visitante_id', [clubA, clubB])
  if (error) throw error
  return findScheduledGame(data ?? [], clubA, clubB, date)
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
      supabase.from('partidos').select('id, estado, updated_at, fecha_numero').eq('external_source', 'ballclubz').eq('external_key', game.externalKey).maybeSingle(),
      supabase.from('temporada_clubes').select('club_id').eq('temporada_id', season.id).eq('visible', true),
    ])
    const allowedClubIds = new Set((memberships ?? []).map((membership) => membership.club_id))
    const clubRefs = ((clubs ?? []) as BallclubzClubRef[]).filter((club) => allowedClubIds.has(club.id))
    const playerRefs = (players ?? []) as BallclubzPlayerRef[]
    const suggestions = suggestBallclubzMappings(game, clubRefs, playerRefs, season.id)
    const sourcePlayers = collectBallclubzPlayers(game)

    if (mode === 'preview') {
      const scheduledGame = existingGame
        ? null
        : await findScheduledGameFor(supabase, season.id, suggestions.clubs[game.home.sourceKey], suggestions.clubs[game.visitor.sourceKey], game.date)
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
        scheduledGame: scheduledGame ? { id: scheduledGame.id, fecha_hora: scheduledGame.fecha_hora } : null,
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
    const { playerIds, inscriptions } = await resolveInscriptions(
      supabase,
      planBallclubzEnrollments({ game, season, clubs: clubRefs, players: playerRefs, mappings }),
      season.id,
    )
    const playerFor = (sourceKey: string) => {
      const playerId = playerIds.get(sourceKey)
      if (!playerId) throw new Error(`Jugador no mapeado: ${sourceKey}`)
      return playerId
    }
    // A game scheduled by hand for the same clubs and day is completed by the box score instead of
    // being duplicated: tagging it with the box score key makes apply_ballclubz_game update it.
    let scheduledGameId: string | null = null
    let scheduledWeek: number | null = null
    if (!existingGame) {
      const scheduled = await findScheduledGameFor(supabase, season.id, clubFor(game.home.sourceKey), clubFor(game.visitor.sourceKey), game.date)
      if (scheduled) {
        const { error: linkError } = await supabase
          .from('partidos')
          .update({ external_source: 'ballclubz', external_key: game.externalKey })
          .eq('id', scheduled.id)
          .is('external_key', null)
        if (linkError) throw linkError
        scheduledGameId = scheduled.id
        scheduledWeek = scheduled.fecha_numero
      }
    }
    const gameId = existingGame?.id ?? scheduledGameId ?? randomUUID()
    const dateTime = `${game.date}T${game.startTime ?? '12:00'}:00-03:00`
    const startedAt = new Date(dateTime)
    const finishedAt = new Date(startedAt.getTime() + (game.durationMinutes ?? 0) * 60_000)
    const partido = {
      id: gameId,
      temporada_id: season.id,
      external_key: game.externalKey,
      // The week belongs to the league's own schedule. The BallClubz game number counts something else,
      // so an import keeps the week already set on the game and never writes the box score's number.
      fecha_numero: existingGame?.fecha_numero ?? scheduledWeek,
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

    const { data: applied, error: applyError } = await supabase.rpc('apply_ballclubz_game', {
      p_lote_id: lote.id,
      p_partido: partido as Json,
      p_bateo: batting as Json,
      p_pitcheo: pitching as Json,
      p_fildeo: fielding as Json,
      p_jugadores: inscriptions as Json,
    })
    if (applyError) throw applyError
    if (!applied || typeof applied !== 'object' || Array.isArray(applied)) throw new Error('Respuesta inválida de la importación')
    const result = applied as Record<string, Json | undefined>
    if (result.status === 'failed') throw new Error(typeof result.error === 'string' ? result.error : 'Falló la importación transaccional')
    return NextResponse.json({ result, partidoId: result.partido_id ?? gameId, inscriptionsCreated: inscriptions.length })
  } catch (error) {
    console.error('[ballclubz/import]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar el HTML' }, { status: 500 })
  }
}
