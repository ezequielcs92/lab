import { describe, expect, it } from 'vitest'
import { chooseCanonicalPlayerProfile, choosePlayerProfiles } from './player-identity'

const profiles = [
  { id: '2017', stable_id: 'same-person', club_id: 'club-a', temporada_id: 'season-2017', updated_at: '2026-01-01' },
  { id: 'unassigned', stable_id: 'same-person', club_id: 'club-a', temporada_id: null, updated_at: '2026-02-01' },
  { id: 'current', stable_id: 'same-person', club_id: 'club-a', temporada_id: 'season-2026', updated_at: '2026-03-01' },
  { id: 'trade', stable_id: 'same-person', club_id: 'club-b', temporada_id: 'season-2026', updated_at: '2026-04-01' },
  { id: 'homonym', stable_id: 'other-person', club_id: 'club-a', temporada_id: 'season-2026', updated_at: '2026-05-01' },
]

describe('player identity profiles', () => {
  it('chooses the most recently updated active-season profile as canonical', () => {
    expect(chooseCanonicalPlayerProfile(profiles.filter((profile) => profile.stable_id === 'same-person'), 'season-2026')?.id).toBe('trade')
  })

  it('shows a person once in the global roster and retains separate club registrations in a club roster', () => {
    expect(choosePlayerProfiles(profiles, 'season-2026').map((profile) => profile.id)).toEqual(['homonym', 'trade'])
    expect(choosePlayerProfiles(profiles, 'season-2026', true).map((profile) => profile.id)).toEqual(['homonym', 'trade', 'current'])
  })
})
