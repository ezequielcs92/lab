import { describe, expect, it } from 'vitest'
import { isMatchVotable, isPlayerEligible, isUuid, parseVotePayload, type VotableMatch } from './mvp-voting'

const match: VotableMatch = {
  estado: 'finalizado',
  fecha_hora: '2026-09-22T10:00:00.000Z',
  finalizado_at: '2026-09-22T12:00:00.000Z',
  temporada_id: '11111111-1111-1111-1111-111111111111',
  local_id: '22222222-2222-2222-2222-222222222222',
  visitante_id: '33333333-3333-3333-3333-333333333333',
}

describe('MVP vote validation', () => {
  it('validates UUID payloads and ignores client session identifiers', () => {
    const parsed = parseVotePayload({
      partido_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jugador_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      session_id: 'client-controlled',
    })
    expect(parsed).toEqual({
      partidoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      jugadorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    })
    expect(isUuid('not-a-uuid')).toBe(false)
  })

  it('rejects matches that are not final or are outside the 24-hour window', () => {
    expect(isMatchVotable({ ...match, estado: 'en_curso' }, new Date('2026-09-22T13:00:00.000Z'))).toBe(false)
    expect(isMatchVotable(match, new Date('2026-09-23T12:00:00.000Z'))).toBe(false)
    expect(isMatchVotable(match, new Date('2026-09-23T11:59:59.999Z'))).toBe(true)
  })

  it('rejects inactive players, players from another club, and players from another season', () => {
    expect(isPlayerEligible(match, { club_id: match.local_id, temporada_id: match.temporada_id, activo: true })).toBe(true)
    expect(isPlayerEligible(match, { club_id: '44444444-4444-4444-4444-444444444444', temporada_id: match.temporada_id, activo: true })).toBe(false)
    expect(isPlayerEligible(match, { club_id: match.local_id, temporada_id: '55555555-5555-5555-5555-555555555555', activo: true })).toBe(false)
    expect(isPlayerEligible(match, { club_id: match.local_id, temporada_id: match.temporada_id, activo: false })).toBe(false)
  })
})
