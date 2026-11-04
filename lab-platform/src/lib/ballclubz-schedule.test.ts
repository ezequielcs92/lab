import { describe, expect, it } from 'vitest'
import { findScheduledGame, type ScheduledGameCandidate } from './ballclubz-schedule'

const game = (overrides: Partial<ScheduledGameCandidate> = {}): ScheduledGameCandidate => ({
  id: 'g1',
  fecha_hora: '2026-10-31T13:00:00-03:00',
  local_id: 'velez',
  visitante_id: 'daom',
  external_key: null,
  ...overrides,
})

describe('findScheduledGame', () => {
  it('finds the scheduled game even when home and visitor are the other way round', () => {
    expect(findScheduledGame([game()], 'daom', 'velez', '2026-10-31')?.id).toBe('g1')
    expect(findScheduledGame([game({ local_id: 'daom', visitante_id: 'velez' })], 'daom', 'velez', '2026-10-31')?.id).toBe('g1')
  })

  it('uses the league time zone, not UTC, to compare days', () => {
    expect(findScheduledGame([game({ fecha_hora: '2026-10-31T22:30:00-03:00' })], 'daom', 'velez', '2026-10-31')?.id).toBe('g1')
    expect(findScheduledGame([game({ fecha_hora: '2026-10-31T22:30:00-03:00' })], 'daom', 'velez', '2026-11-01')).toBeNull()
  })

  it('ignores games on another day, with other clubs or already linked to a box score', () => {
    expect(findScheduledGame([game()], 'daom', 'velez', '2026-11-07')).toBeNull()
    expect(findScheduledGame([game()], 'daom', 'patriots', '2026-10-31')).toBeNull()
    expect(findScheduledGame([game({ external_key: 'ballclubz:1:boxscore:2' })], 'daom', 'velez', '2026-10-31')).toBeNull()
  })

  it('does not guess when two games match (doubleheader)', () => {
    expect(findScheduledGame([game(), game({ id: 'g2', fecha_hora: '2026-10-31T16:00:00-03:00' })], 'daom', 'velez', '2026-10-31')).toBeNull()
  })

  it('rejects an invalid pair of clubs', () => {
    expect(findScheduledGame([game()], 'daom', 'daom', '2026-10-31')).toBeNull()
    expect(findScheduledGame([game()], '', 'velez', '2026-10-31')).toBeNull()
  })
})
