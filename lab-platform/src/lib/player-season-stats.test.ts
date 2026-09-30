import { describe, expect, it } from 'vitest'
import {
  buildBattingSeasonLines,
  buildFieldingSeasonLines,
  buildPitchingSeasonLines,
  type SeasonSummary,
} from './player-season-stats'
import type { StatsBateoAgregado, StatsFildeoAgregado, StatsPitcheoAgregado } from './database.types'

const seasons: SeasonSummary[] = [
  { id: 'season-2017', anio: 2017, nombre: 'Temporada 2017' },
  { id: 'season-2018', anio: 2018, nombre: 'Temporada 2018' },
]

describe('player season statistics', () => {
  it('combines batting lines across clubs and recalculates rates from totals', () => {
    const rows = [
      { jugador_id: 'a', temporada_id: 'season-2017', club_id: 'one', ab: 10, h: 4, doble: 1, triple: 0, hr: 1, rbi: 3, r: 2, bb: 2, so: 3, sb: 1, cs: 0, sf: 0, hbp: 0, avg: 0.4, obp: 0.5, slg: 0.7, ops: 1.2, fase: 'regular' },
      { jugador_id: 'b', temporada_id: 'season-2017', club_id: 'two', ab: 10, h: 2, doble: 0, triple: 0, hr: 0, rbi: 1, r: 1, bb: 0, so: 4, sb: 0, cs: 0, sf: 0, hbp: 0, avg: 0.2, obp: 0.2, slg: 0.2, ops: 0.4, fase: 'regular' },
      { jugador_id: 'c', temporada_id: 'season-2018', club_id: 'one', ab: 5, h: 2, doble: 1, triple: 0, hr: 0, rbi: 2, r: 1, bb: 1, so: 1, sb: 0, cs: 0, sf: 0, hbp: 0, avg: 0.4, obp: 0.5, slg: 0.6, ops: 1.1, fase: 'regular' },
    ] as unknown as StatsBateoAgregado[]

    const lines = buildBattingSeasonLines(rows, seasons)

    expect(lines.map(({ label }) => label)).toEqual(['2018', '2017', 'Carrera'])
    expect(lines[1]).toMatchObject({ ab: 20, h: 6, avg: 0.3, obp: 0.364, slg: 0.5, ops: 0.864 })
    expect(lines[2]).toMatchObject({ ab: 25, h: 8, hr: 1, rbi: 6 })
  })

  it('sums innings as outs and hides unverified iScore strikeouts for 2017/2018', () => {
    const rows = [
      { jugador_id: 'a', temporada_id: 'season-2017', club_id: 'one', ip: 2.2, h: 3, r: 2, er: 1, bb: 1, so: 7, hr: 0, w: 1, l: 0, sv: 0, hld: 0, wp: 0, bk: 0, bf: 10, era: 1.13, whip: 1.5, so_pct: 0.7, fase: 'regular' },
      { jugador_id: 'b', temporada_id: 'season-2018', club_id: 'one', ip: 1.1, h: 2, r: 1, er: 1, bb: 0, so: 4, hr: 0, w: 0, l: 1, sv: 0, hld: 0, wp: 0, bk: 0, bf: 5, era: 2.25, whip: 1.5, so_pct: 0.8, fase: 'regular' },
    ] as unknown as StatsPitcheoAgregado[]

    const lines = buildPitchingSeasonLines(rows, seasons)

    expect(lines.map(({ label }) => label)).toEqual(['2018', '2017', 'Carrera'])
    expect(lines[0]).toMatchObject({ ip: '1.1', so: null })
    expect(lines[1]).toMatchObject({ ip: '2.2', so: null })
    expect(lines[2]).toMatchObject({ ip: '4.0', so: null, w: 1, l: 1 })
  })

  it('calculates fielding percentage from combined totals', () => {
    const rows = [
      { jugador_id: 'a', temporada_id: 'season-2017', club_id: 'one', po: 5, a: 4, e: 1, dp: 2, fld_pct: 0.9, fase: 'regular' },
      { jugador_id: 'b', temporada_id: 'season-2017', club_id: 'two', po: 4, a: 3, e: 0, dp: 1, fld_pct: 1, fase: 'regular' },
    ] as unknown as StatsFildeoAgregado[]

    const lines = buildFieldingSeasonLines(rows, seasons)

    expect(lines[0]).toMatchObject({ label: '2017', po: 9, a: 7, e: 1, dp: 3, fld_pct: 0.941 })
    expect(lines[1]).toMatchObject({ label: 'Carrera', fld_pct: 0.941 })
  })
})
