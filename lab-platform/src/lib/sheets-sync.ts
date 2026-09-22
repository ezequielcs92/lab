import { createHash } from 'node:crypto'
import { SHEET_HEADERS, type SheetName } from './sheets-schema'

export type SheetSyncStatus = 'new' | 'changed_external' | 'unchanged'

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
