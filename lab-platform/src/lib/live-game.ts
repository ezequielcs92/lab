import type { EstadoPartido, MitadInning } from './database.types'

export interface LiveGameState {
  inning_actual: number | null
  mitad_inning: MitadInning | null
  hits_local: number | null
  hits_visitante: number | null
  errores_local: number | null
  errores_visitante: number | null
}

export interface LiveGameInput {
  estado: EstadoPartido
  inning: string
  mitad: string
  hitsLocal: string
  hitsVisitante: string
  erroresLocal: string
  erroresVisitante: string
}

export type LiveGameResult = { ok: true; value: LiveGameState } | { ok: false; error: string }

const MAX_INNING = 30
const MAX_COUNT = 99

function parseCount(raw: string, label: string, min: number, max: number): number | null | Error {
  const text = raw.trim()
  if (text === '') return null
  const value = Number(text)
  if (!Number.isInteger(value) || value < min || value > max) {
    return new Error(`${label} debe ser un entero entre ${min} y ${max}`)
  }
  return value
}

/** Validates the manual live-game fields. Inning and half only apply while the game is live. */
export function buildLiveGameState(input: LiveGameInput): LiveGameResult {
  const inning = parseCount(input.inning, 'El inning', 1, MAX_INNING)
  const hitsLocal = parseCount(input.hitsLocal, 'Los hits del local', 0, MAX_COUNT)
  const hitsVisitante = parseCount(input.hitsVisitante, 'Los hits del visitante', 0, MAX_COUNT)
  const erroresLocal = parseCount(input.erroresLocal, 'Los errores del local', 0, MAX_COUNT)
  const erroresVisitante = parseCount(input.erroresVisitante, 'Los errores del visitante', 0, MAX_COUNT)
  for (const parsed of [inning, hitsLocal, hitsVisitante, erroresLocal, erroresVisitante]) {
    if (parsed instanceof Error) return { ok: false, error: parsed.message }
  }

  const mitad = input.mitad.trim()
  if (mitad !== '' && mitad !== 'alta' && mitad !== 'baja') {
    return { ok: false, error: 'La mitad del inning debe ser alta o baja' }
  }
  const live = input.estado === 'en_curso'
  if (live && mitad !== '' && inning === null) {
    return { ok: false, error: 'Indicá el inning para registrar si está en la alta o en la baja' }
  }

  return {
    ok: true,
    value: {
      inning_actual: live ? (inning as number | null) : null,
      mitad_inning: live && inning !== null && mitad !== '' ? (mitad as MitadInning) : null,
      hits_local: hitsLocal as number | null,
      hits_visitante: hitsVisitante as number | null,
      errores_local: erroresLocal as number | null,
      errores_visitante: erroresVisitante as number | null,
    },
  }
}

export interface InningDisplay {
  /** "Inning 7" */
  label: string
  /** "▲" for the top (alta) half, "▼" for the bottom (baja) half, "" when unknown. */
  arrow: string
  /** Full text for assistive technology: "Inning 7, alta". */
  accessibleLabel: string
}

export function describeInning(game: { inning_actual: number | null; mitad_inning: MitadInning | null }): InningDisplay | null {
  if (!game.inning_actual) return null
  const label = `Inning ${game.inning_actual}`
  const arrow = game.mitad_inning === 'alta' ? '▲' : game.mitad_inning === 'baja' ? '▼' : ''
  const half = game.mitad_inning ? `, ${game.mitad_inning}` : ''
  return { label, arrow, accessibleLabel: `${label}${half}` }
}

export function hasHitsOrErrors(game: Pick<LiveGameState, 'hits_local' | 'hits_visitante' | 'errores_local' | 'errores_visitante'>): boolean {
  return [game.hits_local, game.hits_visitante, game.errores_local, game.errores_visitante].some((value) => value !== null && value !== undefined)
}
