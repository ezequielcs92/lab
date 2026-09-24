import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readSheet, SHEET_HEADERS, type SheetName } from '@/lib/google-sheets'
import { buildAcceptedSyncRows, compareSheetSnapshot, parseSheetRows, shouldApplyExternalRow, type ConflictResolution, type ParsedSheetRow, type SheetSnapshot } from '@/lib/sheets-sync'
import type { Database, Json, SyncConflicto } from '@/lib/database.types'

type ClubRef = Pick<Database['public']['Tables']['clubes']['Row'], 'id' | 'slug'>
type PlayerRef = Pick<Database['public']['Tables']['jugadores']['Row'], 'id' | 'stable_id' | 'club_id' | 'temporada_id'>
type ApplyError = { sheet: SheetName; key: string; message: string }
type StatInsert =
  | Database['public']['Tables']['estadisticas_bateo']['Insert']
  | Database['public']['Tables']['estadisticas_pitcheo']['Insert']
  | Database['public']['Tables']['estadisticas_fildeo']['Insert']

const VALID_STATES = new Set(['programado', 'en_curso', 'finalizado', 'suspendido', 'cancelado'])
const VALID_PHASES = new Set(['regular', 'playoffs'])

function requiredNumber(value: string, field: string): number {
  if (value.trim() === '') return 0
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${field} debe ser un número no negativo`)
  return parsed
}

function optionalInteger(value: string, field: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${field} debe ser un entero no negativo`)
  return parsed
}

function parseJson(value: string, field: string): Json {
  if (!value.trim()) return []
  try {
    return JSON.parse(value) as Json
  } catch {
    throw new Error(`${field} debe contener JSON válido`)
  }
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'sí', 'si', 'yes', 'on'].includes(value.trim().toLowerCase())
}

function errorFor(errors: ApplyError[], row: ParsedSheetRow, message: string) {
  errors.push({ sheet: row.sheet, key: row.key, message })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') return NextResponse.json({ error: 'Se requiere rol de administrador' }, { status: 403 })

  const body = await request.json() as { lote_id?: string }
  if (!body.lote_id) return NextResponse.json({ error: 'Falta lote_id' }, { status: 400 })

  const { data: lote, error: loteError } = await supabase
    .from('import_lotes')
    .select('*')
    .eq('id', body.lote_id)
    .single()
  if (loteError || !lote) return NextResponse.json({ error: loteError?.message ?? 'Lote no encontrado' }, { status: 404 })
  if (lote.fuente !== 'google_sheets') {
    return NextResponse.json({ error: 'El lote no pertenece a Google Sheets' }, { status: 409 })
  }
  if (lote.estado === 'aplicado') {
    const summary = lote.resumen && typeof lote.resumen === 'object' && !Array.isArray(lote.resumen)
      ? lote.resumen as Record<string, Json | undefined>
      : {}
    return NextResponse.json({ lote, appliedRows: summary.appliedRows ?? 0, idempotent: true })
  }
  if (!['preview', 'listo'].includes(lote.estado)) {
    return NextResponse.json({ error: `El lote está en estado ${lote.estado} y no puede aplicarse` }, { status: 409 })
  }

  const { data: conflicts, error: conflictsError } = await supabase
    .from('sync_conflictos')
    .select('*')
    .eq('lote_id', lote.id)
  if (conflictsError) return NextResponse.json({ error: conflictsError.message }, { status: 500 })
  const pending = (conflicts ?? []).filter((conflict) => conflict.estado === 'pendiente')
  if (pending.length > 0) {
    return NextResponse.json({ error: 'El lote tiene conflictos pendientes', pending: pending.length }, { status: 409 })
  }

  try {
    const sheets = Object.keys(SHEET_HEADERS) as SheetName[]
    const values = await Promise.all(sheets.map((sheet) => readSheet(sheet)))
    const parsed = new Map<SheetName, ParsedSheetRow[]>()
    const errors: ApplyError[] = []
    sheets.forEach((sheet, index) => {
      const result = parseSheetRows(sheet, values[index])
      result.errors.forEach((message) => errors.push({ sheet, key: '', message }))
      parsed.set(sheet, result.rows)
    })
    if (errors.length > 0) return failBatch(supabase, lote.id, errors)

    const summary = lote.resumen && typeof lote.resumen === 'object' && !Array.isArray(lote.resumen)
      ? lote.resumen as Record<string, Json | undefined>
      : {}
    const snapshotValue = summary.snapshot
    if (!snapshotValue || typeof snapshotValue !== 'object' || Array.isArray(snapshotValue)) {
      return failBatch(supabase, lote.id, [{ sheet: 'Partidos', key: '', message: 'El lote no tiene una instantánea válida; generá un preview nuevo' }])
    }
    const snapshot = Object.fromEntries(
      Object.entries(snapshotValue).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    ) as SheetSnapshot
    const changedSincePreview = compareSheetSnapshot(snapshot, parsed)
    if (changedSincePreview.length > 0) {
      return failBatch(supabase, lote.id, changedSincePreview.map((key) => ({
        sheet: key.split(':', 1)[0] as SheetName,
        key: key.slice(key.indexOf(':') + 1),
        message: 'La fila cambió después del preview; generá un preview nuevo',
      })))
    }

    const gameKeys = (parsed.get('Partidos') ?? []).map((row) => row.key)
    const [{ data: season }, { data: clubs }, { data: players }, existingGamesResult] = await Promise.all([
      lote.temporada_id
        ? supabase.from('temporadas').select('id').eq('id', lote.temporada_id).single()
        : supabase.from('temporadas').select('id').eq('activa', true).single(),
      supabase.from('clubes').select('id, slug'),
      supabase.from('jugadores').select('id, stable_id, club_id, temporada_id').not('stable_id', 'is', null),
      gameKeys.length > 0
        ? supabase.from('partidos').select('id, external_key').eq('external_source', 'google_sheets').in('external_key', gameKeys)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (!season) return failBatch(supabase, lote.id, [{ sheet: 'Partidos', key: '', message: 'No hay temporada destino' }])
    if (existingGamesResult.error) throw existingGamesResult.error

    const clubBySlug = new Map((clubs ?? []).map((club) => [club.slug, club as ClubRef]))
    const playerByStableId = new Map(
      (players ?? []).filter((player) => player.stable_id).map((player) => [player.stable_id as string, player as PlayerRef])
    )
    const conflictByKey = new Map(
      (conflicts ?? []).map((conflict) => [`${conflict.entidad}:${conflict.clave_externa}`, conflict as SyncConflicto])
    )
    const conflictResolutions = new Map(
      (conflicts ?? []).map((conflict) => [
        `${conflict.entidad}:${conflict.clave_externa}`,
        conflict.estado as ConflictResolution,
      ])
    )
    const existingGameByKey = new Map(
      (existingGamesResult.data ?? []).flatMap((game) => game.external_key ? [[game.external_key, game.id] as const] : [])
    )
    const games = new Map<string, { id: string; key: string }>()
    const gameRows = parsed.get('Partidos') ?? []
    const partidoPayloads: Database['public']['Tables']['partidos']['Insert'][] = []

    for (const row of gameRows) {
      const conflict = conflictByKey.get(`Partidos:${row.key}`)
      const existingId = existingGameByKey.get(row.key)
      if (!shouldApplyExternalRow(conflict?.estado as ConflictResolution | undefined)) {
        if (existingId) games.set(row.key, { id: existingId, key: row.key })
        continue
      }
      try {
        const local = clubBySlug.get(row.payload.local_slug)
        const visitante = clubBySlug.get(row.payload.visitante_slug)
        if (!local || !visitante) throw new Error('club local o visitante no encontrado por slug')
        if (!row.payload.fecha_hora) throw new Error('fecha_hora es obligatoria')
        if (!VALID_STATES.has(row.payload.estado)) throw new Error('estado de partido inválido')
        if (!VALID_PHASES.has(row.payload.fase)) throw new Error('fase inválida')
        const marcadorLocal = row.payload.marcador_local === '' ? null : requiredNumber(row.payload.marcador_local, 'marcador_local')
        const marcadorVisitante = row.payload.marcador_visitante === '' ? null : requiredNumber(row.payload.marcador_visitante, 'marcador_visitante')
        const gameId = existingId ?? randomUUID()
        games.set(row.key, { id: gameId, key: row.key })
        partidoPayloads.push({
          id: gameId,
          temporada_id: season.id,
          external_source: 'google_sheets',
          external_key: row.key,
          fecha_numero: optionalInteger(row.payload.fecha_numero, 'fecha_numero'),
          local_id: local.id,
          visitante_id: visitante.id,
          fecha_hora: new Date(row.payload.fecha_hora).toISOString(),
          estadio: row.payload.estadio || null,
          estado: row.payload.estado as Database['public']['Enums']['estado_partido'],
          fase: row.payload.fase as 'regular' | 'playoffs',
          marcador_local: marcadorLocal,
          marcador_visitante: marcadorVisitante,
          marcador_innings: parseJson(row.payload.marcador_innings_json, 'marcador_innings_json'),
          streaming_url: row.payload.streaming_url || null,
        })
      } catch (error) {
        errorFor(errors, row, error instanceof Error ? error.message : 'fila inválida')
      }
    }
    if (errors.length > 0) return failBatch(supabase, lote.id, errors)

    const statRows = [
      ...buildBattingRows(parsed.get('Bateo') ?? [], games, playerByStableId, clubBySlug, season.id, conflictByKey, errors),
      ...buildPitchingRows(parsed.get('Pitcheo') ?? [], games, playerByStableId, clubBySlug, season.id, conflictByKey, errors),
      ...buildFieldingRows(parsed.get('Fildeo') ?? [], games, playerByStableId, clubBySlug, season.id, conflictByKey, errors),
    ]
    if (errors.length > 0) return failBatch(supabase, lote.id, errors)

    const syncRows = buildAcceptedSyncRows(parsed, conflictResolutions)
    const { data: applied, error: appliedError } = await supabase.rpc('apply_google_sheets_batch', {
      p_lote_id: lote.id,
      p_partidos: partidoPayloads as Json,
      p_bateo: statRows.filter((row) => row.kind === 'bateo').map((row) => row.payload) as Json,
      p_pitcheo: statRows.filter((row) => row.kind === 'pitcheo').map((row) => row.payload) as Json,
      p_fildeo: statRows.filter((row) => row.kind === 'fildeo').map((row) => row.payload) as Json,
      p_sync: syncRows as Json,
    })
    if (appliedError) throw appliedError
    if (!applied || typeof applied !== 'object' || Array.isArray(applied)) throw new Error('Respuesta inválida al aplicar el lote')
    const result = applied as Record<string, Json | undefined>
    if (result.status === 'failed') throw new Error(typeof result.error === 'string' ? result.error : 'Falló la transacción del lote')
    return NextResponse.json({ lote: applied, appliedRows: result.appliedRows ?? syncRows.length, idempotent: result.status === 'already_applied' })
  } catch (error) {
    console.error('[sheets/apply]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo aplicar el lote' }, { status: 500 })
  }
}

type StatKind = 'bateo' | 'pitcheo' | 'fildeo'
type StatPayload = { kind: StatKind; payload: StatInsert }

function resolveContext(
  row: ParsedSheetRow,
  games: Map<string, { id: string; key: string }>,
  players: Map<string, PlayerRef>,
  clubs: Map<string, ClubRef>,
  seasonId: string,
  conflicts: Map<string, SyncConflicto>,
  errors: ApplyError[]
) {
  const conflict = conflicts.get(`${row.sheet}:${row.key}`)
  if (!shouldApplyExternalRow(conflict?.estado as ConflictResolution | undefined)) return null
  const game = games.get(row.payload.partido_external_key)
  const player = players.get(row.payload.jugador_stable_id)
  const club = clubs.get(row.payload.club_slug)
  if (!game) errorFor(errors, row, 'partido_external_key no encontrado')
  if (!player) errorFor(errors, row, 'jugador_stable_id no encontrado')
  if (!club) errorFor(errors, row, 'club_slug no encontrado')
  if (player && player.temporada_id && player.temporada_id !== seasonId) errorFor(errors, row, 'jugador pertenece a otra temporada')
  if (player && club && player.club_id !== club.id) errorFor(errors, row, 'el jugador no pertenece al club indicado')
  if (!game || !player || !club) return null
  return { partido_id: game.id, jugador_id: player.id, temporada_id: seasonId, club_id: club.id }
}

function buildBattingRows(rows: ParsedSheetRow[], games: Map<string, { id: string; key: string }>, players: Map<string, PlayerRef>, clubs: Map<string, ClubRef>, seasonId: string, conflicts: Map<string, SyncConflicto>, errors: ApplyError[]): StatPayload[] {
  return rows.flatMap((row) => {
    const context = resolveContext(row, games, players, clubs, seasonId, conflicts, errors)
    if (!context) return []
    try {
      return [{ kind: 'bateo', payload: { ...context, orden_bateo: optionalInteger(row.payload.orden_bateo, 'orden_bateo'), ...numericFields(row, ['ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp']), extras: parseJson(row.payload.extras_json, 'extras_json') } }]
    } catch (error) { errorFor(errors, row, error instanceof Error ? error.message : 'fila inválida'); return [] }
  })
}

function buildPitchingRows(rows: ParsedSheetRow[], games: Map<string, { id: string; key: string }>, players: Map<string, PlayerRef>, clubs: Map<string, ClubRef>, seasonId: string, conflicts: Map<string, SyncConflicto>, errors: ApplyError[]): StatPayload[] {
  return rows.flatMap((row) => {
    const context = resolveContext(row, games, players, clubs, seasonId, conflicts, errors)
    if (!context) return []
    try {
      const numeric = numericFields(row, ['ip', 'h', 'r', 'er', 'bb', 'so', 'hr', 'hld', 'wp', 'bk', 'bf'])
      const ip = numeric.ip as number
      const outs = Math.round((ip - Math.trunc(ip)) * 10)
      if (![0, 1, 2].includes(outs)) throw new Error('ip debe terminar en .0, .1 o .2')
      return [{ kind: 'pitcheo', payload: { ...context, ...numeric, w: parseBoolean(row.payload.w), l: parseBoolean(row.payload.l), sv: parseBoolean(row.payload.sv), extras: parseJson(row.payload.extras_json, 'extras_json') } }]
    } catch (error) { errorFor(errors, row, error instanceof Error ? error.message : 'fila inválida'); return [] }
  })
}

function buildFieldingRows(rows: ParsedSheetRow[], games: Map<string, { id: string; key: string }>, players: Map<string, PlayerRef>, clubs: Map<string, ClubRef>, seasonId: string, conflicts: Map<string, SyncConflicto>, errors: ApplyError[]): StatPayload[] {
  return rows.flatMap((row) => {
    const context = resolveContext(row, games, players, clubs, seasonId, conflicts, errors)
    if (!context) return []
    try {
      return [{ kind: 'fildeo', payload: { ...context, ...numericFields(row, ['po', 'a', 'e', 'dp']), extras: parseJson(row.payload.extras_json, 'extras_json') } }]
    } catch (error) { errorFor(errors, row, error instanceof Error ? error.message : 'fila inválida'); return [] }
  })
}

function numericFields(row: ParsedSheetRow, fields: string[]): Record<string, number> {
  return Object.fromEntries(fields.map((field) => [field, requiredNumber(row.payload[field] ?? '', field)]))
}

async function failBatch(supabase: Awaited<ReturnType<typeof createClient>>, loteId: string, errors: ApplyError[]) {
  await supabase.from('import_lotes').update({ estado: 'bloqueado', conflictos: errors }).eq('id', loteId)
  return NextResponse.json({ error: 'El lote contiene filas inválidas', errors }, { status: 409 })
}
