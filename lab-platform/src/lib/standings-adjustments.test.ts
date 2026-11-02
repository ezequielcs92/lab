import { describe, expect, it } from 'vitest'
import { buildAdjustmentUpserts, buildStandingRows, computePct, validateStandingRows, type StandingEditRow } from './standings-adjustments'
import type { PosicionEfectiva } from './database.types'

const row = (club_id: string, overrides: Partial<StandingEditRow> = {}): StandingEditRow => ({
  club_id, club_nombre: club_id.toUpperCase(), jj: 3, jg: 1, jp: 2, pct: 0.3333, gb: 1, racha: 'P2', ...overrides,
})

describe('computePct', () => {
  it('rounds to four decimals and handles zero games', () => {
    expect(computePct(3, 1)).toBe(0.3333)
    expect(computePct(4, 3)).toBe(0.75)
    expect(computePct(0, 0)).toBe(0)
  })
})

describe('validateStandingRows', () => {
  it('accepts consistent rows', () => {
    expect(validateStandingRows([row('a')])).toBeNull()
  })

  it('names the club with the problem', () => {
    expect(validateStandingRows([row('a', { jg: 3, jp: 2 })])).toContain('A')
    expect(validateStandingRows([row('b', { pct: 1.2 })])).toContain('PCT')
    expect(validateStandingRows([row('c', { gb: -1 })])).toContain('GB')
    expect(validateStandingRows([row('d', { jj: 2.5 })])).toContain('enteros')
  })
})

describe('buildAdjustmentUpserts', () => {
  const base = { temporadaId: 't1', reason: 'Corrección manual', existing: [] }

  it('writes only the clubs that changed', () => {
    const baseline = [row('a'), row('b')]
    const upserts = buildAdjustmentUpserts({ ...base, divisionId: null, baseline, rows: [row('a'), row('b', { jj: 4, jg: 2, pct: 0.5 })] })
    expect(upserts.map((u) => u.club_id)).toEqual(['b'])
    expect(upserts[0]).toMatchObject({ temporada_id: 't1', division_id: null, jj: 4, jg: 2, pct: 0.5, motivo: 'Corrección manual' })
  })

  it('does not store a GB override unless GB was edited', () => {
    const baseline = [row('a')]
    const [unchanged] = buildAdjustmentUpserts({ ...base, divisionId: 'zona', baseline, rows: [row('a', { jj: 4, jg: 1, jp: 3 })] })
    expect(unchanged.gb).toBeNull()
    const [edited] = buildAdjustmentUpserts({ ...base, divisionId: 'zona', baseline, rows: [row('a', { gb: 2 })] })
    expect(edited.gb).toBe(2)
  })

  it('keeps the GB override and manual order the club already had in the same table', () => {
    const [upsert] = buildAdjustmentUpserts({
      ...base,
      divisionId: 'zona',
      baseline: [row('a')],
      rows: [row('a', { jj: 4, jg: 1, jp: 3 })],
      existing: [
        { club_id: 'a', division_id: 'zona', gb: 0.5, orden_manual: 2 },
        { club_id: 'a', division_id: null, gb: 9, orden_manual: 7 },
      ],
    })
    expect(upsert.gb).toBe(0.5)
    expect(upsert.orden_manual).toBe(2)
  })

  it('normalizes an empty streak to null and returns nothing when nothing changed', () => {
    const [upsert] = buildAdjustmentUpserts({ ...base, divisionId: null, baseline: [row('a')], rows: [row('a', { racha: '  ', jj: 5, jp: 4 })] })
    expect(upsert.racha).toBeNull()
    expect(buildAdjustmentUpserts({ ...base, divisionId: null, baseline: [row('a')], rows: [row('a')] })).toEqual([])
  })
})

describe('buildStandingRows', () => {
  const pos = (club_id: string, division_id: string | null, jg: number, jp: number): PosicionEfectiva => ({
    id: club_id, temporada_id: 't1', club_id, division_id, jj: jg + jp, jg, jp,
    pct: jg / (jg + jp), gb: 0, racha: null, orden_manual: null, serie_ganada: null, tqb: null, carreras_empatados: null,
  })
  const clubs = [
    { id: 'a', nombre: 'Alfa', nombre_corto: null },
    { id: 'b', nombre: 'Beta', nombre_corto: 'BET' },
    { id: 'c', nombre: 'Gamma', nombre_corto: null },
  ]

  it('returns only the requested table sorted like the public site', () => {
    const positions = [pos('a', null, 1, 2), pos('b', null, 3, 0), pos('c', 'zona', 1, 0), pos('a', 'zona', 1, 2)]
    expect(buildStandingRows(positions, clubs, null).map((r) => r.club_id)).toEqual(['b', 'a'])
    expect(buildStandingRows(positions, clubs, 'zona').map((r) => r.club_id)).toEqual(['c', 'a'])
  })

  it('uses the short name when available', () => {
    expect(buildStandingRows([pos('b', null, 1, 0)], clubs, null)[0].club_nombre).toBe('BET')
    expect(buildStandingRows([pos('a', null, 1, 0)], clubs, null)[0].club_nombre).toBe('Alfa')
  })
})
