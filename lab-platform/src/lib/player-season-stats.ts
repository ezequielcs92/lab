import type {
  StatsBateoAgregado,
  StatsFildeoAgregado,
  StatsPitcheoAgregado,
} from './database.types'

export interface SeasonSummary {
  id: string
  anio: number
  nombre: string
}

interface SeasonLine {
  key: string
  label: string
  year: number | null
}

export interface BattingSeasonLine extends SeasonLine {
  ab: number
  h: number
  doble: number
  triple: number
  hr: number
  rbi: number
  r: number
  bb: number
  so: number
  sb: number
  avg: number
  obp: number
  slg: number
  ops: number
}

export interface PitchingSeasonLine extends SeasonLine {
  ip: string
  h: number
  r: number
  er: number
  hr: number
  bb: number
  so: number | null
  w: number
  l: number
  sv: number
  era: number
  whip: number
}

export interface FieldingSeasonLine extends SeasonLine {
  po: number
  a: number
  e: number
  dp: number
  fld_pct: number
}

function value(value: number | null): number {
  return value ?? 0
}

function rounded(value: number, decimals = 3): number {
  return Number(value.toFixed(decimals))
}

function groupBySeasonAndPhase<Row extends { temporada_id: string; fase: string }>(rows: readonly Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>()
  for (const row of rows) {
    const key = `${row.temporada_id}|${row.fase}`
    const group = grouped.get(key) ?? []
    group.push(row)
    grouped.set(key, group)
  }
  return grouped
}

function orderedSeasons<Row extends { temporada_id: string; fase: string }>(
  rows: readonly Row[],
  seasons: readonly SeasonSummary[],
): { id: string; phase: string; label: string; year: number; rows: Row[] }[] {
  const seasonById = new Map(seasons.map((season) => [season.id, season]))
  const grouped = groupBySeasonAndPhase(rows)
  return [...grouped].flatMap(([key, seasonRows]) => {
    const [id, phase] = key.split('|')
    const season = seasonById.get(id)
    const phaseLabel = phase === 'playoffs' ? 'Playoffs' : 'Ronda regular'
    return season
      ? [{ id: key, phase, label: `${season.anio} · ${phaseLabel}`, year: season.anio, rows: seasonRows }]
      : []
  }).sort((a, b) => b.year - a.year || (a.phase === b.phase ? 0 : a.phase === 'regular' ? -1 : 1))
}

export function buildBattingSeasonLines(
  rows: readonly StatsBateoAgregado[],
  seasons: readonly SeasonSummary[],
): BattingSeasonLine[] {
  const groups = orderedSeasons(rows, seasons)
  const lines = groups.map((group) => ({ ...aggregateBatting(group.label, group.year, group.rows), key: group.id }))
  if (rows.length > 0) lines.push(aggregateBatting('Carrera', null, rows))
  return lines
}

function aggregateBatting(
  label: string,
  year: number | null,
  rows: readonly StatsBateoAgregado[],
): BattingSeasonLine {
  const ab = rows.reduce((sum, row) => sum + value(row.ab), 0)
  const h = rows.reduce((sum, row) => sum + value(row.h), 0)
  const doble = rows.reduce((sum, row) => sum + value(row.doble), 0)
  const triple = rows.reduce((sum, row) => sum + value(row.triple), 0)
  const hr = rows.reduce((sum, row) => sum + value(row.hr), 0)
  const rbi = rows.reduce((sum, row) => sum + value(row.rbi), 0)
  const r = rows.reduce((sum, row) => sum + value(row.r), 0)
  const bb = rows.reduce((sum, row) => sum + value(row.bb), 0)
  const so = rows.reduce((sum, row) => sum + value(row.so), 0)
  const sb = rows.reduce((sum, row) => sum + value(row.sb), 0)
  const sf = rows.reduce((sum, row) => sum + value(row.sf), 0)
  const hbp = rows.reduce((sum, row) => sum + value(row.hbp), 0)
  const obpDenominator = ab + bb + hbp + sf
  const avg = ab > 0 ? rounded(h / ab) : 0
  const obp = obpDenominator > 0 ? rounded((h + bb + hbp) / obpDenominator) : 0
  const slg = ab > 0 ? rounded((h + doble + 2 * triple + 3 * hr) / ab) : 0

  return {
    key: year === null ? 'career' : `season-${year}`,
    label,
    year,
    ab, h, doble, triple, hr, rbi, r, bb, so, sb, avg, obp, slg,
    ops: rounded(obp + slg),
  }
}

export function buildPitchingSeasonLines(
  rows: readonly StatsPitcheoAgregado[],
  seasons: readonly SeasonSummary[],
): PitchingSeasonLine[] {
  const groups = orderedSeasons(rows, seasons)
  const lines = groups.map((group) => ({ ...aggregatePitching(
    group.label,
    group.year,
    group.rows,
  ), key: group.id }))
  if (rows.length > 0) {
    lines.push(aggregatePitching(
      'Carrera',
      null,
      rows,
    ))
  }
  return lines
}

function inningsToOuts(ip: number | null): number {
  const innings = value(ip)
  const whole = Math.trunc(innings)
  const outs = Math.round((innings - whole) * 10)
  return whole * 3 + outs
}

function outsToInnings(outs: number): string {
  return `${Math.trunc(outs / 3)}.${outs % 3}`
}

function aggregatePitching(
  label: string,
  year: number | null,
  rows: readonly StatsPitcheoAgregado[],
): PitchingSeasonLine {
  const outs = rows.reduce((sum, row) => sum + inningsToOuts(row.ip), 0)
  const h = rows.reduce((sum, row) => sum + value(row.h), 0)
  const er = rows.reduce((sum, row) => sum + value(row.er), 0)
  const bb = rows.reduce((sum, row) => sum + value(row.bb), 0)
  const so = rows.reduce((sum, row) => sum + value(row.so), 0)
  const w = rows.reduce((sum, row) => sum + value(row.w), 0)
  const l = rows.reduce((sum, row) => sum + value(row.l), 0)
  const sv = rows.reduce((sum, row) => sum + value(row.sv), 0)

  return {
    key: year === null ? 'career' : `season-${year}`,
    label,
    year,
    ip: outsToInnings(outs),
    h,
    r: rows.reduce((sum, row) => sum + value(row.r), 0),
    er,
    hr: rows.reduce((sum, row) => sum + value(row.hr), 0),
    bb,
    so,
    w,
    l,
    sv,
    era: outs > 0 ? rounded(27 * er / outs, 2) : 0,
    whip: outs > 0 ? rounded(3 * (bb + h) / outs) : 0,
  }
}

export function buildFieldingSeasonLines(
  rows: readonly StatsFildeoAgregado[],
  seasons: readonly SeasonSummary[],
): FieldingSeasonLine[] {
  const groups = orderedSeasons(rows, seasons)
  const lines = groups.map((group) => ({ ...aggregateFielding(group.label, group.year, group.rows), key: group.id }))
  if (rows.length > 0) lines.push(aggregateFielding('Carrera', null, rows))
  return lines
}

function aggregateFielding(
  label: string,
  year: number | null,
  rows: readonly StatsFildeoAgregado[],
): FieldingSeasonLine {
  const po = rows.reduce((sum, row) => sum + value(row.po), 0)
  const a = rows.reduce((sum, row) => sum + value(row.a), 0)
  const e = rows.reduce((sum, row) => sum + value(row.e), 0)
  const dp = rows.reduce((sum, row) => sum + value(row.dp), 0)
  return {
    key: year === null ? 'career' : `season-${year}`,
    label,
    year,
    po, a, e, dp,
    fld_pct: po + a + e > 0 ? rounded((po + a) / (po + a + e)) : 0,
  }
}
