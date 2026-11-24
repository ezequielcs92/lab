import { describe, expect, it } from 'vitest'
import { describeStatSaveError, emptyStatValues, parseStatValues, statValuesFromRow, type StatFieldDef } from './stat-editor'

const BATTING: StatFieldDef[] = [
  { name: 'ab', label: 'AB' },
  { name: 'h', label: 'H' },
]
const PITCHING: StatFieldDef[] = [
  { name: 'ip', label: 'IP', type: 'float' },
  { name: 'er', label: 'ER' },
  { name: 'w', label: 'W', type: 'boolean' },
]

describe('stat editor values', () => {
  it('starts a new row at zero', () => {
    expect(emptyStatValues(PITCHING)).toEqual({ ip: '0', er: '0', w: false })
  })

  it('loads a saved row so the numbers already there are kept', () => {
    expect(statValuesFromRow(PITCHING, { ip: 5.2, er: 3, w: true, extras: {} })).toEqual({ ip: '5.2', er: '3', w: true })
    expect(statValuesFromRow(BATTING, { ab: null })).toEqual({ ab: '0', h: '0' })
  })

  it('parses typed numbers and treats blank as zero', () => {
    expect(parseStatValues(BATTING, { ab: '4', h: '' })).toEqual({ ok: true, stats: { ab: 4, h: 0 } })
    expect(parseStatValues(PITCHING, { ip: '6.1', er: '2', w: true })).toEqual({ ok: true, stats: { ip: 6.1, er: 2, w: true } })
  })

  it('rejects negative, non numeric, fractional and impossible innings values', () => {
    expect(parseStatValues(BATTING, { ab: '-1', h: '0' })).toMatchObject({ ok: false })
    expect(parseStatValues(BATTING, { ab: 'abc', h: '0' })).toMatchObject({ ok: false })
    expect(parseStatValues(BATTING, { ab: '2.5', h: '0' })).toMatchObject({ ok: false })
    expect(parseStatValues(PITCHING, { ip: '5.3', er: '0', w: false })).toMatchObject({ ok: false })
  })

  it('explains a duplicate player in the same game', () => {
    expect(describeStatSaveError({ code: '23505', message: 'duplicate key' })).toMatch(/ya tiene estadísticas/)
    expect(describeStatSaveError({ message: 'other' })).toBe('other')
  })
})
