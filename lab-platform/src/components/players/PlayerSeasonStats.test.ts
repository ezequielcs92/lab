import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: { view: string; column: string; value: string }[] = []

vi.mock('@/lib/supabase/public', () => ({
  PROFILE_DATA_CACHE_SECONDS: 300,
  createPublicClient: () => ({
    from: (view: string) => ({
      select: () => ({
        eq: (column: string, value: string) => {
          calls.push({ view, column, value })
          return Promise.resolve({ data: [], error: null, status: 200 })
        },
      }),
    }),
  }),
}))

import PlayerSeasonStats from './PlayerSeasonStats'

describe('PlayerSeasonStats', () => {
  beforeEach(() => {
    calls.length = 0
  })

  it('asks the three statistics views for one person by stable_id, so the database narrows before it aggregates', async () => {
    await PlayerSeasonStats({ playerId: 'row-1', stableId: 'person-1' })
    expect(calls).toEqual([
      { view: 'v_stats_bateo_completo', column: 'stable_id', value: 'person-1' },
      { view: 'v_stats_pitcheo_completo', column: 'stable_id', value: 'person-1' },
      { view: 'v_stats_fildeo_completo', column: 'stable_id', value: 'person-1' },
    ])
  })

  it('falls back to the profile row when the player has no stable identity', async () => {
    await PlayerSeasonStats({ playerId: 'row-1', stableId: null })
    expect(calls.map((call) => [call.column, call.value])).toEqual([
      ['jugador_id', 'row-1'],
      ['jugador_id', 'row-1'],
      ['jugador_id', 'row-1'],
    ])
  })
})
