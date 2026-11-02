import { describe, expect, it } from 'vitest'
import { orderScoreboardGames, type ScoreboardOrderable } from './scoreboard-order'

const now = new Date('2026-11-02T15:00:00Z').getTime()
const game = (id: string, estado: ScoreboardOrderable['estado'], fecha_hora: string, finalizado_at: string | null = null) =>
  ({ id, estado, fecha_hora, finalizado_at })

describe('orderScoreboardGames', () => {
  it('puts live games first, then recently finished, then upcoming', () => {
    const ordered = orderScoreboardGames([
      game('next', 'programado', '2026-11-04T23:00:00Z'),
      game('done-old', 'finalizado', '2026-10-20T16:00:00Z'),
      game('done-recent', 'finalizado', '2026-11-01T18:00:00Z'),
      game('live', 'en_curso', '2026-11-02T14:00:00Z'),
      game('later', 'programado', '2026-11-06T18:00:00Z'),
    ], now)
    expect(ordered.map((g) => g.id)).toEqual(['live', 'done-recent', 'next', 'later', 'done-old'])
  })

  it('orders recently finished games with the latest first', () => {
    const ordered = orderScoreboardGames([
      game('a', 'finalizado', '2026-10-31T16:00:00Z'),
      game('b', 'finalizado', '2026-11-01T18:00:00Z'),
    ], now)
    expect(ordered.map((g) => g.id)).toEqual(['b', 'a'])
  })

  it('uses the finish time when it is known', () => {
    const ordered = orderScoreboardGames([
      game('long', 'finalizado', '2026-10-30T10:00:00Z', '2026-11-02T10:00:00Z'),
    ], now)
    expect(ordered.map((g) => g.id)).toEqual(['long'])
  })

  it('keeps the original opening order when nothing has been played', () => {
    const ordered = orderScoreboardGames([
      game('second', 'programado', '2026-11-07T18:00:00Z'),
      game('first', 'programado', '2026-10-31T16:00:00Z'),
    ], now)
    expect(ordered.map((g) => g.id)).toEqual(['first', 'second'])
  })

  it('puts suspended and cancelled games last and does not mutate the input', () => {
    const input = [
      game('cancelled', 'cancelado', '2026-11-03T18:00:00Z'),
      game('next', 'programado', '2026-11-04T18:00:00Z'),
    ]
    const copy = [...input]
    expect(orderScoreboardGames(input, now).map((g) => g.id)).toEqual(['next', 'cancelled'])
    expect(input).toEqual(copy)
  })
})
