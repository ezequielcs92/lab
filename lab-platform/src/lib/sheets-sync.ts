import { createHash } from 'node:crypto'
import { SHEET_HEADERS, type SheetName } from './sheets-schema'

export type SheetSyncStatus = 'new' | 'changed_external' | 'unchanged'
export type ConflictResolution = 'pendiente' | 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido'

export interface ParsedSheetRow {
  sheet: SheetName
  key: string
  hash: string
  values: string[]
  payload: Record<string, string>
}

export interface SheetParseResult {
  rows: ParsedSheetRow[]
  errors: string[]
}

export interface SyncRow {
  [key: string]: string
  fuente: 'google_sheets'
  pestaña: SheetName
  clave_externa: string
  lab_hash: string
  sheet_hash: string
}

export type SheetSnapshot = Record<string, string>

const KEY_COLUMNS: Record<SheetName, string> = {
  Partidos: 'external_key',
  Bateo: 'partido_external_key',
  Pitcheo: 'partido_external_key',
  Fildeo: 'partido_external_key',
}

function rowKey(sheet: SheetName, payload: Record<string, string>): string {
  const base = payload[KEY_COLUMNS[sheet]]?.trim() ?? ''
  if (sheet === 'Partidos') return base
  const player = payload.jugador_stable_id?.trim() ?? ''
  return `${base}:${player}`
}

export function hashSheetRow(values: string[]): string {
  return createHash('sha256').update(JSON.stringify(values)).digest('hex')
}

export function parseSheetRows(sheet: SheetName, values: string[][]): SheetParseResult {
  const expected = [...SHEET_HEADERS[sheet]]
  const header = values[0] ?? []
  const errors: string[] = []

  if (header.length !== expected.length || expected.some((name, index) => header[index] !== name)) {
    return { rows: [], errors: [`La cabecera de ${sheet} no coincide con la plantilla LAB`] }
  }

  const rows: ParsedSheetRow[] = []
  const seen = new Set<string>()
  values.slice(1).forEach((raw, index) => {
    const valuesForRow = expected.map((_, column) => (raw[column] ?? '').trim())
    if (valuesForRow.every((value) => value === '')) return

    const payload = Object.fromEntries(expected.map((name, column) => [name, valuesForRow[column]]))
    const key = rowKey(sheet, payload)
    if (!key) {
      errors.push(`${sheet}, fila ${index + 2}: falta la clave externa`)
      return
    }
    if (seen.has(key)) {
      errors.push(`${sheet}, fila ${index + 2}: clave externa duplicada (${key})`)
      return
    }
    seen.add(key)
    rows.push({ sheet, key, hash: hashSheetRow(valuesForRow), values: valuesForRow, payload })
  })

  return { rows, errors }
}

export function classifySheetRows(
  rows: ParsedSheetRow[],
  previous: Map<string, { sheet_hash: string | null }>
): Record<SheetSyncStatus, ParsedSheetRow[]> {
  const result: Record<SheetSyncStatus, ParsedSheetRow[]> = {
    new: [],
    changed_external: [],
    unchanged: [],
  }
  for (const row of rows) {
    const prior = previous.get(`${row.sheet}:${row.key}`)
    if (!prior) result.new.push(row)
    else if (prior.sheet_hash !== row.hash) result.changed_external.push(row)
    else result.unchanged.push(row)
  }
  return result
}

export function shouldApplyExternalRow(resolution?: ConflictResolution): boolean {
  return resolution !== 'usar_lab' && resolution !== 'omitido'
}

export function buildAcceptedSyncRows(
  rowsBySheet: Map<SheetName, ParsedSheetRow[]>,
  resolutions: Map<string, ConflictResolution>
): SyncRow[] {
  return [...rowsBySheet.entries()].flatMap(([sheet, rows]) => rows.flatMap((row) => {
    const resolution = resolutions.get(`${sheet}:${row.key}`)
    if (!shouldApplyExternalRow(resolution)) return []
    return [{
      fuente: 'google_sheets' as const,
      pestaña: sheet,
      clave_externa: row.key,
      lab_hash: row.hash,
      sheet_hash: row.hash,
    }]
  }))
}

export function buildSheetSnapshot(rowsBySheet: Map<SheetName, ParsedSheetRow[]>): SheetSnapshot {
  return Object.fromEntries(
    [...rowsBySheet.entries()].flatMap(([sheet, rows]) => rows.map((row) => [`${sheet}:${row.key}`, row.hash]))
  )
}

export function compareSheetSnapshot(expected: SheetSnapshot, rowsBySheet: Map<SheetName, ParsedSheetRow[]>): string[] {
  const current = buildSheetSnapshot(rowsBySheet)
  const keys = new Set([...Object.keys(expected), ...Object.keys(current)])
  return [...keys].filter((key) => expected[key] !== current[key]).sort()
}
