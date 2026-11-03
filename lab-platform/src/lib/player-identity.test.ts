import { describe, expect, it } from 'vitest'
import { chooseCanonicalPlayerProfile, choosePlayerProfiles, matchesPlayerSearch, missingSeasonEnrollments, planSeasonEnrollment } from './player-identity'

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

describe('season enrollment', () => {
  const seasonless = { id: 'a', stable_id: 'same-person', club_id: 'club-a', temporada_id: null, updated_at: '2026-01-01' }

  it('turns a seasonless profile into the first missing season and copies it to the rest', () => {
    const plan = planSeasonEnrollment(seasonless, [...profiles, seasonless], ['season-2017', 'season-2023', 'season-2024', 'season-2026'])
    expect(plan).toEqual({ assignTo: 'season-2023', copyTo: ['season-2024'] })
  })

  it('skips seasons the person already has at that club but not at another club', () => {
    expect(missingSeasonEnrollments(seasonless, [...profiles, seasonless], ['season-2026', 'season-2017'])).toEqual([])
    const otherClub = { ...seasonless, id: 'c', club_id: 'club-c' }
    expect(missingSeasonEnrollments(otherClub, [...profiles, otherClub], ['season-2026'])).toEqual(['season-2026'])
  })

  it('never reassigns a profile that already has a season, it only adds copies', () => {
    const plan = planSeasonEnrollment(profiles[0], profiles, ['season-2017', 'season-2030'])
    expect(plan).toEqual({ assignTo: null, copyTo: ['season-2030'] })
  })
})

describe('player name search', () => {
  it('ignores accents, case and word order', () => {
    expect(matchesPlayerSearch('Agustín Figueras (R)', 'agustin figu')).toBe(true)
    expect(matchesPlayerSearch('Franco Agüero', 'AGUERO franco')).toBe(true)
  })

  it('requires every typed word and accepts an empty query', () => {
    expect(matchesPlayerSearch('Pedro Figueras', 'pedro lopez')).toBe(false)
    expect(matchesPlayerSearch('Pedro Figueras', '   ')).toBe(true)
  })
})
