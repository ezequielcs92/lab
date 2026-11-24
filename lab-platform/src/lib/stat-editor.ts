import { isValidBaseballInnings } from './baseball'

export type StatFieldType = 'number' | 'boolean' | 'float'
export interface StatFieldDef {
  name: string
  label: string
  type?: StatFieldType
}

/** What the admin types in the editor: numbers stay as text until they are saved. */
export type StatFormValues = Record<string, string | boolean>
export type StatNumbers = Record<string, number | boolean>

/** A new row starts at zero. */
export function emptyStatValues(fields: readonly StatFieldDef[]): StatFormValues {
  return Object.fromEntries(fields.map((field) => [field.name, field.type === 'boolean' ? false : '0']))
}

/** Loads a saved row into the editor, so saving one number never wipes the others. */
export function statValuesFromRow(fields: readonly StatFieldDef[], row: Record<string, unknown>): StatFormValues {
  return Object.fromEntries(fields.map((field) => {
    const value = row[field.name]
    return [field.name, field.type === 'boolean' ? Boolean(value) : String(value ?? 0)]
  }))
}

export type StatValidation = { ok: true; stats: StatNumbers } | { ok: false; error: string }

/** Turns the typed values into the numbers to store; blank means 0, as it always did. */
export function parseStatValues(fields: readonly StatFieldDef[], values: StatFormValues): StatValidation {
  const stats: StatNumbers = {}
  for (const field of fields) {
    const raw = values[field.name]
    if (field.type === 'boolean') {
      stats[field.name] = raw === true
      continue
    }
    const text = typeof raw === 'string' ? raw.trim() : ''
    const value = text === '' ? 0 : Number(text)
    if (!Number.isFinite(value)) return { ok: false, error: `${field.label} no es un número válido` }
    if (value < 0) return { ok: false, error: 'Las estadísticas no pueden ser negativas' }
    if (field.name === 'ip' && !isValidBaseballInnings(value)) {
      return { ok: false, error: 'IP debe terminar en .0, .1 o .2 según los outs lanzados' }
    }
    if (field.type !== 'float' && !Number.isInteger(value)) return { ok: false, error: `${field.label} debe ser un número entero` }
    stats[field.name] = value
  }
  return { ok: true, stats }
}

/** Postgres answers 23505 when the player already has a row in that game. */
export function describeStatSaveError(error: { code?: string; message: string }): string {
  return error.code === '23505'
    ? 'Ese jugador ya tiene estadísticas en este partido. Editá esa fila o eliminala antes de reasignar.'
    : error.message
}
