import { describe, expect, it } from 'vitest'
import { sortStandings } from './standings'

const base = {
  orden_manual: null,
  pct: 0.5,
  serie_ganada: null,
  tqb: null,
  carreras_empatados: null,
  jg: 5,
  jp: 5,
}

describe('sortStandings', () => {
  it('prioritizes a manual order over automatic tie breakers', () => {
    const sorted = sortStandings([
      { ...base, id: 'automatic', pct: 0.9 },
      { ...base, id: 'manual', pct: 0.1, orden_manual: 1 },
    ])
    expect(sorted.map((row) => row.id)).toEqual(['manual', 'automatic'])
  })

  it('applies PCT, head-to-head, TQB and tied-team runs in order', () => {
    const sorted = sortStandings([
      { ...base, id: 'runs', carreras_empatados: 10 },
      { ...base, id: 'tqb', tqb: 0.2 },
      { ...base, id: 'series', serie_ganada: 1 },
      { ...base, id: 'pct', pct: 0.6 },
    ])
    expect(sorted.map((row) => row.id)).toEqual(['pct', 'series', 'tqb', 'runs'])
  })

  it('does not mutate the source array', () => {
    const rows = [{ ...base, id: 'b' }, { ...base, id: 'a', pct: 0.8 }]
    sortStandings(rows)
    expect(rows.map((row) => row.id)).toEqual(['b', 'a'])
  })
})
