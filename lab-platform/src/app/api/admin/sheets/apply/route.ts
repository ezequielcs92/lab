import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readSheet, SHEET_HEADERS, type SheetName } from '@/lib/google-sheets'
import { parseSheetRows, type ParsedSheetRow } from '@/lib/sheets-sync'
import type { Database, Json, SyncConflicto, SyncRegistro } from '@/lib/database.types'

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
  if (lote.fuente !== 'google_sheets' || !['preview', 'listo'].includes(lote.estado)) {
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

    const [{ data: season }, { data: clubs }, { data: players }, { data: previous }] = await Promise.all([
      lote.temporada_id
        ? supabase.from('temporadas').select('id').eq('id', lote.temporada_id).single()
        : supabase.from('temporadas').select('id').eq('activa', true).single(),
      supabase.from('clubes').select('id, slug'),
      supabase.from('jugadores').select('id, stable_id, club_id, temporada_id').not('stable_id', 'is', null),
      supabase.from('sync_registros').select('*'),
    ])
    if (!season) return failBatch(supabase, lote.id, [{ sheet: 'Partidos', key: '', message: 'No hay temporada destino' }])

    const clubBySlug = new Map((clubs ?? []).map((club) => [club.slug, club as ClubRef]))
    const playerByStableId = new Map(
      (players ?? []).filter((player) => player.stable_id).map((player) => [player.stable_id as string, player as PlayerRef])
    )
    const conflictByKey = new Map(
      (conflicts ?? []).map((conflict) => [`${conflict.entidad}:${conflict.clave_externa}`, conflict as SyncConflicto])
    )
    const priorByKey = new Map(
      ((previous ?? []) as SyncRegistro[]).map((row) => [`${row.pestaña}:${row.clave_externa}`, row])
    )
    const games = new Map<string, { id: string; key: string }>()
    const gameRows = parsed.get('Partidos') ?? []
    const partidoPayloads: Database['public']['Tables']['partidos']['Insert'][] = []

    for (const row of gameRows) {
      const conflict = conflictByKey.get(`Partidos:${row.key}`)
      if (conflict?.estado === 'usar_lab' || conflict?.estado === 'omitido') continue
      try {
        const local = clubBySlug.get(row.payload.local_slug)
        const visitante = clubBySlug.get(row.payload.visitante_slug)
        if (!local || !visitante) throw new Error('club local o visitante no encontrado por slug')
        if (!row.payload.fecha_hora) throw new Error('fecha_hora es obligatoria')
        if (!VALID_STATES.has(row.payload.estado)) throw new Error('estado de partido inválido')
        if (!VALID_PHASES.has(row.payload.fase)) throw new Error('fase inválida')
        const marcadorLocal = row.payload.marcador_local === '' ? null : requiredNumber(row.payload.marcador_local, 'marcador_local')
        const marcadorVisitante = row.payload.marcador_visitante === '' ? null : requiredNumber(row.payload.marcador_visitante, 'marcador_visitante')
        partidoPayloads.push({
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

    await markApplying(supabase, lote.id)
    if (partidoPayloads.length > 0) {
      const { data: savedGames, error } = await supabase
        .from('partidos')
        .upsert(partidoPayloads, { onConflict: 'external_source,external_key' })
        .select('id, external_key')
      if (error) throw error
      ;(savedGames ?? []).forEach((game) => games.set(game.external_key ?? '', { id: game.id, key: game.external_key ?? '' }))
    }

    const statRows = [
      ...buildBattingRows(parsed.get('Bateo') ?? [], games, playerByStableId, clubBySlug, season.id, conflictByKey, errors),
      ...buildPitchingRows(parsed.get('Pitcheo') ?? [], games, playerByStableId, clubBySlug, season.id, conflictByKey, errors),
      ...buildFieldingRows(parsed.get('Fildeo') ?? [], games, playerByStableId, clubBySlug, season.id, conflictByKey, errors),
    ]
    if (errors.length > 0) return failBatch(supabase, lote.id, errors)

    for (const group of [
      { table: 'estadisticas_bateo' as const, rows: statRows.filter((row) => row.kind === 'bateo').map((row) => row.payload) },
      { table: 'estadisticas_pitcheo' as const, rows: statRows.filter((row) => row.kind === 'pitcheo').map((row) => row.payload) },
      { table: 'estadisticas_fildeo' as const, rows: statRows.filter((row) => row.kind === 'fildeo').map((row) => row.payload) },
    ]) {
      if (group.rows.length === 0) continue
      const { error } = await supabase.from(group.table).upsert(group.rows, { onConflict: 'partido_id,jugador_id' })
      if (error) throw error
    }

    const syncRows = sheets.flatMap((sheet) => (parsed.get(sheet) ?? []).map((row) => {
      const prior = priorByKey.get(`${sheet}:${row.key}`)
      return {
        fuente: 'google_sheets' as const,
        pestaña: sheet,
        clave_externa: row.key,
        lab_hash: prior?.lab_hash ?? row.hash,
        sheet_hash: row.hash,
      }
    }))
    if (syncRows.length > 0) {
      const { error } = await supabase.from('sync_registros').upsert(syncRows, { onConflict: 'fuente,pestaña,clave_externa' })
      if (error) throw error
    }
    const { data: applied, error: appliedError } = await supabase
      .from('import_lotes')
      .update({ estado: 'aplicado', applied_at: new Date().toISOString(), resumen: { appliedRows: syncRows.length } })
      .eq('id', lote.id)
      .select('id, estado, applied_at')
      .single()
    if (appliedError) throw appliedError
    return NextResponse.json({ lote: applied, appliedRows: syncRows.length })
  } catch (error) {
    await supabase.from('import_lotes').update({ estado: 'fallido' }).eq('id', lote.id)
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
  if (conflict?.estado === 'usar_lab' || conflict?.estado === 'omitido') return null
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

async function markApplying(supabase: Awaited<ReturnType<typeof createClient>>, loteId: string) {
  const { error } = await supabase.from('import_lotes').update({ estado: 'aplicando' }).eq('id', loteId)
  if (error) throw error
}

async function failBatch(supabase: Awaited<ReturnType<typeof createClient>>, loteId: string, errors: ApplyError[]) {
  await supabase.from('import_lotes').update({ estado: 'bloqueado', conflictos: errors }).eq('id', loteId)
  return NextResponse.json({ error: 'El lote contiene filas inválidas', errors }, { status: 409 })
}
