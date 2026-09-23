import { describe, expect, it } from 'vitest'
import { parseBallclubzBoxScore } from './ballclubz'

const example = `<!-- saved from url=(0058)https://my.wbsc.org/legacy/?m=games&t=3173&boxscore=176358 -->
<html><body><pre>
            Liga Argentina de Béisbol 25
            Club Daom 2, Patriots 1 - Composite Box Score
            Oct 11, 2025 at Federación Argentina de Béisbol (Estadio Nacional de Béisbol)

            -------------------------------------------------------------------------------------------
            Club Daom..........002 000 0 -  2   5  2
            Patriots...........000 010 0 -  1   2  1
            -------------------------------------------------------------------------------------------

                                             Club Daom  2

            PLAYER                         AB  R  H BI 2B 3B HR BB SB CS HP SH SF SO IBB KL GDP   PO  A  E
            ----------------------------------------------------------------------------------------------
            ABARCA LUGO Jose Dan dh         4  0  0  0  0  0  0  0  0  0  0  0  0  1   0  1   0    0  0  0
            GALINDO Jesus lf                4  1  1  0  0  0  0  0  0  0  0  0  0  2   0  0   0    1  0  0
            BALDOVI Matias cf               2  1  1  0  1  0  0  1  0  0  0  0  0  0   0  0   0    2  0  0
            Totals                         10  2  2  0  1  0  0  1  0  0  0  0  0  3   0  1   0    3  0  0

                                             Patriots  1

            PLAYER                         AB  R  H BI 2B 3B HR BB SB CS HP SH SF SO IBB KL GDP   PO  A  E
            ----------------------------------------------------------------------------------------------
            CALANCHE NIEVES Luis 2b         3  0  0  0  0  0  0  0  0  0  0  0  0  0   0  0   0    1  1  0
            CARROLL Julian 3b               3  1  0  0  0  0  0  0  0  0  0  0  0  0   0  0   1    0  1  0
            Totals                          6  1  0  0  0  0  0  0  0  0  0  0  0  0   0  0   1    1  2  0

            Club Daom                       IP  H  R ER BB SO WP HP BK IBB SH SF 2B 3B HR AB BF FO GO  NP
            ---------------------------------------------------------------------------------------------
            GONZALEZ Luis  W,1-0           7.0  2  1  0  2  7  0  0  0   0  0  0  1  0  0 23 25  6  6  93

            Patriots                        IP  H  R ER BB SO WP HP BK IBB SH SF 2B 3B HR AB BF FO GO  NP
            ---------------------------------------------------------------------------------------------
            PEREZ Franco Daniel  L,0-1     2.2  4  2  2  2  2  0  2  0   0  0  0  1  0  0 11 15  3  2  56
            MUJICA Juan Francisc           4.1  1  0  0  0  4  0  0  0   0  0  0  1  0  0 14 14  5  4  54

            Start: 15:14  Time: 2:04  Attendance: 0
            Game: 1
</pre><script>throw new Error('never execute')</script></body></html>`

describe('BallClubz box score parser', () => {
  it('extracts game identity, score and innings from the saved HTML', () => {
    const game = parseBallclubzBoxScore(example)
    expect(game.externalKey).toBe('ballclubz:3173:boxscore:176358')
    expect(game.date).toBe('2025-10-11')
    expect(game.startTime).toBe('15:14')
    expect(game.durationMinutes).toBe(124)
    expect(game.gameNumber).toBe(1)
    expect(game.visitor).toMatchObject({ name: 'Club Daom', score: 2, hits: 5, errors: 2, innings: [0, 0, 2, 0, 0, 0, 0] })
    expect(game.home).toMatchObject({ name: 'Patriots', score: 1, hits: 2, errors: 1, innings: [0, 0, 0, 0, 1, 0, 0] })
  })

  it('parses batting, fielding, pitching and decisions', () => {
    const game = parseBallclubzBoxScore(example)
    expect(game.visitor.batting[0]).toMatchObject({ name: 'ABARCA LUGO Jose Dan', position: 'dh', ab: 4, so: 1, po: 0, a: 0, e: 0 })
    expect(game.visitor.batting[2]).toMatchObject({ name: 'BALDOVI Matias', doble: 1, bb: 1, po: 2 })
    expect(game.visitor.pitching[0]).toMatchObject({ name: 'GONZALEZ Luis', ip: 7, h: 2, er: 0, so: 7, np: 93, w: true, l: false })
    expect(game.home.pitching[0]).toMatchObject({ name: 'PEREZ Franco Daniel', ip: 2.2, l: true })
    expect(game.home.pitching[1]).toMatchObject({ name: 'MUJICA Juan Francisc', ip: 4.1, w: false, l: false })
  })

  it('rejects cumulative team totals as a per-game box score', () => {
    expect(() => parseBallclubzBoxScore('<html><body><pre>Overall Statistics for Arias</pre></body></html>'))
      .toThrow('Composite Box Score')
  })

  it('ignores markup injected outside the pre block', () => {
    expect(parseBallclubzBoxScore(example).competition).toBe('Liga Argentina de Béisbol 25')
  })
})
