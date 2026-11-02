import { sortStandings } from './standings'
import type { PosicionEfectiva } from './database.types'

export interface StandingEditRow {
  club_id: string
  club_nombre: string
  jj: number
  jg: number
  jp: number
  pct: number
  gb: number
  racha: string | null
}

export interface ExistingStandingAdjustment {
  club_id: string
  division_id: string | null
  gb: number | null
  orden_manual: number | null
}

export interface StandingAdjustmentUpsert {
  temporada_id: string
  club_id: string
  division_id: string | null
  jj: number
  jg: number
  jp: number
  pct: number
  gb: number | null
  racha: string | null
  orden_manual: number | null
  motivo: string
}

/** Rows of one table (general when divisionId is null, or a zone) as the public site sorts them. */
export function buildStandingRows(
  positions: readonly PosicionEfectiva[],
  clubs: readonly { id: string; nombre: string; nombre_corto: string | null }[],
  divisionId: string | null,
): StandingEditRow[] {
  const clubsById = new Map(clubs.map((club) => [club.id, club]))
  return sortStandings(positions.filter((position) => position.division_id === divisionId)).flatMap((position) => {
    const club = clubsById.get(position.club_id)
    return club ? [{
      club_id: position.club_id,
      club_nombre: club.nombre_corto ?? club.nombre,
      jj: position.jj,
      jg: position.jg,
      jp: position.jp,
      pct: Number(position.pct),
      gb: Number(position.gb),
      racha: position.racha,
    }] : []
  })
}

/** Winning percentage with the same 4-decimal precision the database stores. */
export function computePct(jj: number, jg: number): number {
  return jj > 0 ? Math.round((jg / jj) * 10_000) / 10_000 : 0
}

export function validateStandingRows(rows: readonly StandingEditRow[]): string | null {
  for (const row of rows) {
    if (![row.jj, row.jg, row.jp].every((value) => Number.isInteger(value) && value >= 0)) {
      return `${row.club_nombre}: JJ, JG y JP deben ser enteros no negativos`
    }
    if (row.jg + row.jp > row.jj) return `${row.club_nombre}: JG + JP no puede superar JJ`
    if (!(row.pct >= 0 && row.pct <= 1)) return `${row.club_nombre}: PCT debe estar entre 0 y 1`
    if (!(row.gb >= 0)) return `${row.club_nombre}: GB no puede ser negativo`
  }
  return null
}

function sameRow(a: StandingEditRow, b: StandingEditRow): boolean {
  return a.jj === b.jj && a.jg === b.jg && a.jp === b.jp && a.pct === b.pct && a.gb === b.gb
    && (a.racha ?? '') === (b.racha ?? '')
}

/**
 * Builds the adjustments to save for one table (general or a zone). Only clubs that
 * changed compared to what the table showed are written, so the rest keep following
 * the automatic calculation. GB is stored as an override only when it was edited, or
 * when the club already had one in this same table.
 */
export function buildAdjustmentUpserts(params: {
  temporadaId: string
  divisionId: string | null
  rows: readonly StandingEditRow[]
  baseline: readonly StandingEditRow[]
  existing: readonly ExistingStandingAdjustment[]
  reason: string
}): StandingAdjustmentUpsert[] {
  const baselineByClub = new Map(params.baseline.map((row) => [row.club_id, row]))
  const existingByClub = new Map(
    params.existing
      .filter((adjustment) => adjustment.division_id === params.divisionId)
      .map((adjustment) => [adjustment.club_id, adjustment]),
  )

  return params.rows.flatMap((row) => {
    const original = baselineByClub.get(row.club_id)
    if (original && sameRow(row, original)) return []
    const existing = existingByClub.get(row.club_id)
    const gbEdited = !original || row.gb !== original.gb
    return [{
      temporada_id: params.temporadaId,
      club_id: row.club_id,
      division_id: params.divisionId,
      jj: row.jj,
      jg: row.jg,
      jp: row.jp,
      pct: row.pct,
      gb: gbEdited ? row.gb : existing?.gb ?? null,
      racha: row.racha?.trim() ? row.racha.trim() : null,
      orden_manual: existing?.orden_manual ?? null,
      motivo: params.reason,
    }]
  })
}
