import { describe, expect, it } from 'vitest'
import { orderScoreboardGames, pickBannerGame, type ScoreboardOrderable } from './scoreboard-order'

const game = (id: string, estado: ScoreboardOrderable['estado'], fecha_hora: string, finalizado_at: string | null = null, streaming_url: string | null = null) =>
  ({ id, estado, fecha_hora, finalizado_at, streaming_url })

describe('pickBannerGame', () => {
  const now = new Date('2026-11-24T12:00:00Z').getTime()

  it('shows the last game played even when it has no YouTube link and an older one does', () => {
    const picked = pickBannerGame([
      game('with-link', 'finalizado', '2026-11-14T18:00:00Z', null, 'https://youtu.be/abc'),
      game('last-played', 'finalizado', '2026-11-23T17:34:00Z', '2026-11-23T19:26:00Z'),
      game('week-4-early', 'finalizado', '2026-11-20T16:00:00Z'),
    ], now)
    expect(picked?.id).toBe('last-played')
  })

  it('shows the game in progress before the last one played', () => {
    const picked = pickBannerGame([
      game('done', 'finalizado', '2026-11-23T17:34:00Z'),
      game('live', 'en_curso', '2026-11-24T11:00:00Z'),
    ], now)
    expect(picked?.id).toBe('live')
  })

  it('is not taken over by an upcoming transmission once games have been played', () => {
    const picked = pickBannerGame([
      game('done', 'finalizado', '2026-11-23T17:34:00Z'),
      game('next', 'programado', '2026-11-28T18:00:00Z', null, 'https://youtu.be/abc'),
    ], now)
    expect(picked?.id).toBe('done')
  })

  it('falls back to the next streamed game before anything has been played', () => {
    const picked = pickBannerGame([
      game('no-link', 'programado', '2026-11-25T18:00:00Z'),
      game('past-link', 'programado', '2026-11-20T18:00:00Z', null, 'https://youtu.be/old'),
      game('next-link', 'programado', '2026-11-28T18:00:00Z', null, 'https://youtu.be/abc'),
    ], now)
    expect(picked?.id).toBe('next-link')
  })

  it('returns nothing when there is nothing to show', () => {
    expect(pickBannerGame([game('no-link', 'programado', '2026-11-25T18:00:00Z')], now)).toBeUndefined()
    expect(pickBannerGame([], now)).toBeUndefined()
  })
})

describe('orderScoreboardGames', () => {
  it('puts live games first, then the last games played, then upcoming', () => {
    const ordered = orderScoreboardGames([
      game('next', 'programado', '2026-11-04T23:00:00Z'),
      game('done-old', 'finalizado', '2026-10-20T16:00:00Z'),
      game('done-recent', 'finalizado', '2026-11-01T18:00:00Z'),
      game('live', 'en_curso', '2026-11-02T14:00:00Z'),
      game('later', 'programado', '2026-11-06T18:00:00Z'),
    ])
    expect(ordered.map((g) => g.id)).toEqual(['live', 'done-recent', 'next', 'later', 'done-old'])
  })

  it('keeps the last game played first even when it finished many days ago', () => {
    const ordered = orderScoreboardGames([
      game('next', 'programado', '2026-11-14T18:00:00Z'),
      game('saturday', 'finalizado', '2026-11-07T18:00:00Z'),
      game('two-weeks-ago', 'finalizado', '2026-10-24T18:00:00Z'),
    ])
    expect(ordered.map((g) => g.id)).toEqual(['saturday', 'next', 'two-weeks-ago'])
  })

  it('orders the games of the last weekend with the latest first', () => {
    const ordered = orderScoreboardGames([
      game('a', 'finalizado', '2026-10-31T16:00:00Z'),
      game('b', 'finalizado', '2026-11-01T18:00:00Z'),
      game('upcoming', 'programado', '2026-11-07T18:00:00Z'),
    ])
    expect(ordered.map((g) => g.id)).toEqual(['b', 'a', 'upcoming'])
  })

  it('uses the finish time when it is known', () => {
    const ordered = orderScoreboardGames([
      game('long', 'finalizado', '2026-10-30T10:00:00Z', '2026-11-02T10:00:00Z'),
      game('short', 'finalizado', '2026-11-01T10:00:00Z'),
    ])
    expect(ordered.map((g) => g.id)).toEqual(['long', 'short'])
  })

  it('keeps the original opening order when nothing has been played', () => {
    const ordered = orderScoreboardGames([
      game('second', 'programado', '2026-11-07T18:00:00Z'),
      game('first', 'programado', '2026-10-31T16:00:00Z'),
    ])
    expect(ordered.map((g) => g.id)).toEqual(['first', 'second'])
  })

  it('puts suspended and cancelled games last and does not mutate the input', () => {
    const input = [
      game('cancelled', 'cancelado', '2026-11-03T18:00:00Z'),
      game('next', 'programado', '2026-11-04T18:00:00Z'),
    ]
    const copy = [...input]
    expect(orderScoreboardGames(input).map((g) => g.id)).toEqual(['next', 'cancelled'])
    expect(input).toEqual(copy)
  })
})
