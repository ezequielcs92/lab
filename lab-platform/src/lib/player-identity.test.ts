import { describe, expect, it } from 'vitest'
import { chooseCanonicalPlayerProfile, choosePlayerProfiles, duplicateCandidates, matchesPlayerSearch, missingSeasonEnrollments, planSeasonEnrollment, withoutTeamIdentities } from './player-identity'

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

describe('players without a team', () => {
  const base = { stable_id: 'p1', club_id: 'club-a', updated_at: '2026-01-01' }

  it('lists the people whose representative profile is flagged', () => {
    const rows = [
      { ...base, id: 'old', temporada_id: null, sin_equipo_motivo: 'retirado' },
      { ...base, id: 'old-2019', temporada_id: 'season-2019', sin_equipo_motivo: 'retirado' },
      { id: 'other', stable_id: 'p2', club_id: 'club-a', temporada_id: null, updated_at: '2026-01-01', sin_equipo_motivo: null },
    ]
    expect([...withoutTeamIdentities(rows, 'season-2026')]).toEqual([['p1', 'retirado']])
  })

  it('does not list a person whose only flagged inscription is at a club he left', () => {
    const rows = [
      { ...base, id: 'popeye', club_id: 'popeye', temporada_id: 'season-2026', sin_equipo_motivo: 'otro_equipo' },
      { ...base, id: 'cachorros', club_id: 'cachorros', temporada_id: 'season-2026', sin_equipo_motivo: null },
    ]
    expect(withoutTeamIdentities(rows, 'season-2026').size).toBe(0)
    expect(withoutTeamIdentities([rows[0]], 'season-2026').size).toBe(0)
  })

  it('lets a newer unflagged inscription in the active season bring the person back', () => {
    const rows = [
      { ...base, id: 'old', temporada_id: null, sin_equipo_motivo: 'no_juega' },
      { ...base, id: 'back', temporada_id: 'season-2026', sin_equipo_motivo: null },
    ]
    expect(withoutTeamIdentities(rows, 'season-2026').size).toBe(0)
  })

  it('does not treat people without the field as flagged', () => {
    expect(withoutTeamIdentities(profiles, 'season-2026').size).toBe(0)
  })
})

describe('duplicate candidates', () => {
  const rows = [
    { id: 'a1', nombre: 'Joyner Villalta', stable_id: 'a' },
    { id: 'b1', nombre: 'Joyner Villalta', stable_id: 'b' },
    { id: 'b2', nombre: 'Joyner Villalta', stable_id: 'b' },
    { id: 'c1', nombre: 'Villalta Joyner José', stable_id: 'c' },
    { id: 'd1', nombre: 'Carlos Chirinos', stable_id: 'd' },
    { id: 'e1', nombre: 'Sin identidad Villalta', stable_id: null },
  ]

  it('offers one profile per other identity that shares a word with the name', () => {
    expect(duplicateCandidates(rows, rows[0], '').map((row) => row.id)).toEqual(['b1', 'e1', 'c1'])
  })

  it('never offers the same identity as the profile being edited', () => {
    expect(duplicateCandidates(rows, rows[1], '').map((row) => row.stable_id)).not.toContain('b')
  })

  it('searches by every word typed, ignoring accents and order', () => {
    expect(duplicateCandidates(rows, rows[0], 'chirinos carlos').map((row) => row.id)).toEqual(['d1'])
    expect(duplicateCandidates(rows, rows[0], 'jose villalta').map((row) => row.id)).toEqual(['c1'])
  })
})
