import { describe, expect, it } from 'vitest'
import { orderScoreboardGames, type ScoreboardOrderable } from './scoreboard-order'

const game = (id: string, estado: ScoreboardOrderable['estado'], fecha_hora: string, finalizado_at: string | null = null) =>
  ({ id, estado, fecha_hora, finalizado_at })

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
