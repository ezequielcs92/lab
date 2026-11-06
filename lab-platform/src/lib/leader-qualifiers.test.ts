import { describe, expect, it } from 'vitest'
import { isQualifiedMetric, qualifies, qualifyingMinimum, rankByMetric, teamGamesPlayed } from './leader-qualifiers'

describe('leader qualifiers', () => {
  it('asks for 2 AB and 1 IP per team game, up to the full-season minimum', () => {
    expect(qualifyingMinimum('bateo', 1)).toBe(2)
    expect(qualifyingMinimum('bateo', 2)).toBe(4)
    expect(qualifyingMinimum('bateo', 24)).toBe(48)
    expect(qualifyingMinimum('bateo', 30)).toBe(48)
    expect(qualifyingMinimum('pitcheo', 1)).toBe(1)
    expect(qualifyingMinimum('pitcheo', 24)).toBe(24)
    expect(qualifyingMinimum('pitcheo', 40)).toBe(24)
  })

  it('never lets a player with no volume qualify, even before the club has played', () => {
    const games = new Map<string, number>()
    expect(qualifies('bateo', { club_id: 'a', ab: 0 }, games)).toBe(false)
    expect(qualifies('bateo', { club_id: 'a', ab: 1 }, games)).toBe(true)
    expect(qualifies('pitcheo', { club_id: 'a', ip: 0 }, games)).toBe(false)
  })

  it('counts the games of each club on both sides of the schedule', () => {
    const played = teamGamesPlayed([
      { local_id: 'a', visitante_id: 'b' },
      { local_id: 'b', visitante_id: 'c' },
      { local_id: 'a', visitante_id: 'c' },
    ])
    expect([...played]).toEqual([['a', 2], ['b', 2], ['c', 2]])
  })

  it('qualifies a player once he reaches the minimum of his own club', () => {
    const games = new Map([['a', 2], ['b', 1]])
    expect(qualifies('bateo', { club_id: 'a', ab: 3 }, games)).toBe(false)
    expect(qualifies('bateo', { club_id: 'a', ab: 4 }, games)).toBe(true)
    expect(qualifies('bateo', { club_id: 'b', ab: 2 }, games)).toBe(true)
    expect(qualifies('pitcheo', { club_id: 'a', ip: 2 }, games)).toBe(true)
    expect(qualifies('pitcheo', { club_id: 'b', ip: 0.1 }, games)).toBe(false)
  })

  it('applies only to the rate metrics', () => {
    expect(isQualifiedMetric('bateo', 'avg')).toBe(true)
    expect(isQualifiedMetric('bateo', 'hr')).toBe(false)
    expect(isQualifiedMetric('pitcheo', 'era')).toBe(true)
    expect(isQualifiedMetric('pitcheo', 'so')).toBe(false)
    expect(isQualifiedMetric('fildeo', 'fld_pct')).toBe(false)
  })

  it('ranks best first and leaves rows without the metric last', () => {
    const rows = [{ id: 'a', avg: 0.3 }, { id: 'b', avg: null }, { id: 'c', avg: 0.5 }]
    expect(rankByMetric(rows, 'avg', false).map((row) => row.id)).toEqual(['c', 'a', 'b'])
    expect(rankByMetric(rows, 'avg', true).map((row) => row.id)).toEqual(['a', 'c', 'b'])
  })
})
