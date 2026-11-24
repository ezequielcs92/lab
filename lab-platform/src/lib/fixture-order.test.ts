import { describe, expect, it } from 'vitest'
import { sortResultsLatestFirst } from './fixture-order'

describe('sortResultsLatestFirst', () => {
  it('puts the latest game of the week first', () => {
    const sorted = sortResultsLatestFirst([
      { id: 'wed', fecha_hora: '2026-11-04T23:00:00Z' },
      { id: 'sat', fecha_hora: '2026-11-07T18:00:00Z' },
      { id: 'fri', fecha_hora: '2026-11-06T22:00:00Z' },
    ])
    expect(sorted.map((game) => game.id)).toEqual(['sat', 'fri', 'wed'])
  })

  it('does not mutate the input', () => {
    const input = [
      { id: 'a', fecha_hora: '2026-11-04T23:00:00Z' },
      { id: 'b', fecha_hora: '2026-11-07T18:00:00Z' },
    ]
    sortResultsLatestFirst(input)
    expect(input.map((game) => game.id)).toEqual(['a', 'b'])
  })
})
