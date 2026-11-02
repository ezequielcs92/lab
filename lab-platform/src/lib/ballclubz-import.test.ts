import { describe, expect, it } from 'vitest'
import { parseBallclubzBoxScore } from './ballclubz'
import { planBallclubzEnrollments } from './ballclubz-enroll'
import {
  ballclubzPlayerSlug,
  matchesBallclubzPlayerName,
  playerOptionsForClub,
  suggestBallclubzMappings,
  suggestBallclubzPlayerName,
  validateBallclubzMappings,
  type BallclubzClubRef,
  type BallclubzPlayerRef,
} from './ballclubz-import'

const html = `<html><body><pre>
            Liga Argentina de Béisbol 26/27
            Vélez Sarsfield 3, Club Daom 1 - Composite Box Score
            Oct 31, 2026 at Federación Argentina de Béisbol (Estadio Nacional de Béisbol)

            -------------------------------------------------------------------------------------------
            Club Daom..........100 000 0    -  1   4  1
            Vélez Sarsfield...000 210 (X) -  3   6  1
            -------------------------------------------------------------------------------------------

                                             Club Daom  1

            PLAYER                         AB  R  H BI 2B 3B HR BB SB CS HP SH SF SO IBB KL GDP   PO  A  E
            ----------------------------------------------------------------------------------------------
            GALINDO Jesus lf                3  0  1  0  1  0  0  0  0  0  0  0  0  0   0  0   0    0  0  0
            ABARCA LUGO Jose Dan dh         3  0  1  0  0  0  0  0  0  1  0  0  0  0   0  0   0    0  0  0
            Totals                          6  0  2  0  1  0  0  0  0  1  0  0  0  0   0  0   0    0  0  0

                                             Vélez Sarsfield  3

            PLAYER                         AB  R  H BI 2B 3B HR BB SB CS HP SH SF SO IBB KL GDP   PO  A  E
            ----------------------------------------------------------------------------------------------
            RHODES Charles Aaron 3b         2  0  0  1  0  0  0  0  0  0  1  0  0  2   0  0   0    1  3  1
            Totals                          2  0  0  1  0  0  0  0  0  0  1  0  0  2   0  0   0    1  3  1

            Club Daom                       IP  H  R ER BB SO WP HP BK IBB SH SF 2B 3B HR AB BF FO GO  NP
            ---------------------------------------------------------------------------------------------
            RIELLO Kevin  L,0-1            4.0  6  3  3  2  3  1  1  0   0  0  0  0  0  0 18 21  4  4  60

            Vélez Sarsfield                IP  H  R ER BB SO WP HP BK IBB SH SF 2B 3B HR AB BF FO GO  NP
            ---------------------------------------------------------------------------------------------
            MERA Rodrigo  W,1-0            4.0  3  1  1  1  2  0  1  0   0  0  0  0  0  0 14 16  4  4  68

            Start: 13:02  Time: 1:55  Attendance: 0
            Game: 1
</pre></body></html>`

const game = parseBallclubzBoxScore(html)
const SEASON = 'season-2026'
const OLD_SEASON = 'season-2017'
const clubs: BallclubzClubRef[] = [
  { id: 'daom', nombre: 'Club DAOM', nombre_corto: 'DAOM', slug: 'daom' },
  { id: 'velez', nombre: 'Vélez Sarsfield', nombre_corto: 'Velez', slug: 'velez' },
]
const players: BallclubzPlayerRef[] = [
  { id: 'galindo-none', nombre: 'Jesús Galindo', club_id: 'daom', temporada_id: null, stable_id: 'id-galindo', posicion: 'left_field' },
  { id: 'abarca-2026', nombre: 'José Daniel Abarca Lugo', club_id: 'daom', temporada_id: SEASON, stable_id: 'id-abarca' },
  { id: 'abarca-none', nombre: 'José Daniel Abarca Lugo', club_id: 'daom', temporada_id: null, stable_id: 'id-abarca' },
  { id: 'riello-2017', nombre: 'Kevin Riello', club_id: 'daom', temporada_id: OLD_SEASON, stable_id: 'id-riello' },
]

describe('BallClubz player name matching', () => {
  it('matches surname-first, accent-less and truncated names to stored names', () => {
    expect(matchesBallclubzPlayerName('RIELLO Kevin', 'Kevin Riello')).toBe(true)
    expect(matchesBallclubzPlayerName('FIGUERAS Pedro Agust', 'Pedro Agustín Figueras')).toBe(true)
    expect(matchesBallclubzPlayerName('ABARCA LUGO Jose Dan', 'José Daniel Abarca Lugo')).toBe(true)
    expect(matchesBallclubzPlayerName('ESPAnA DELGADILLO Se', 'Sergio José España Delgadillo')).toBe(true)
  })

  it('does not match different people or names with extra words when the source is complete', () => {
    expect(matchesBallclubzPlayerName('AMMA Pedro', 'Pedro Amma Lopez')).toBe(false)
    expect(matchesBallclubzPlayerName('ALVARADO Matias', 'Nicolás Alvarado')).toBe(false)
    expect(matchesBallclubzPlayerName('RIELLO Kevin', 'Maximiliano Riello')).toBe(false)
  })
})

describe('BallClubz suggested player names', () => {
  it('moves leading capitalized surnames after the given names', () => {
    expect(suggestBallclubzPlayerName('RHODES Charles Aaron')).toBe('Charles Aaron Rhodes')
    expect(suggestBallclubzPlayerName('ABARCA LUGO Jose Dan')).toBe('Jose Dan Abarca Lugo')
    expect(suggestBallclubzPlayerName('GARCiA RODRiGUEZ Jes')).toBe('Jes Garcia Rodriguez')
  })

  it('keeps names without a recognizable surname and builds stable slugs', () => {
    expect(suggestBallclubzPlayerName('Mera Rodrigo')).toBe('Mera Rodrigo')
    expect(ballclubzPlayerSlug('Charles Aaron Rhodes', 'velez', 2026)).toBe('charles-aaron-rhodes-velez-2026')
  })
})

describe('BallClubz mapping suggestions', () => {
  it('maps clubs and links players of the club even when they are not enrolled in the season', () => {
    const suggestions = suggestBallclubzMappings(game, clubs, players, SEASON)
    expect(suggestions.clubs).toEqual({ 'club daom': 'daom', 'velez sarsfield': 'velez' })
    const byName = (name: string) => suggestions.players[game.visitor.batting.concat(game.home.batting).find((row) => row.name === name)!.sourceKey]
    expect(byName('GALINDO Jesus')).toBe('galindo-none')
    expect(byName('ABARCA LUGO Jose Dan')).toBe('abarca-2026')
    expect(byName('RHODES Charles Aaron')).toBeUndefined()
  })

  it('offers one option per identity and prefers the inscription in the season', () => {
    const options = playerOptionsForClub(players, 'daom', SEASON)
    expect(options.map((player) => player.id).sort()).toEqual(['abarca-2026', 'galindo-none', 'riello-2017'])
  })
})

describe('BallClubz mapping validation', () => {
  const base = suggestBallclubzMappings(game, clubs, players, SEASON)
  const keyOf = (name: string) => [...game.visitor.batting, ...game.home.batting, ...game.visitor.pitching, ...game.home.pitching].find((row) => row.name === name)!.sourceKey

  it('lists the players that still need a decision', () => {
    const errors = validateBallclubzMappings(game, clubs, players, base)
    expect(errors).toEqual(expect.arrayContaining(['Falta mapear el jugador RHODES Charles Aaron', 'Falta mapear el jugador MERA Rodrigo']))
  })

  it('accepts new players with a name and rejects duplicates of an existing one', () => {
    const rhodes = keyOf('RHODES Charles Aaron')
    const mera = keyOf('MERA Rodrigo')
    const riello = keyOf('RIELLO Kevin')
    const ok = { ...base, newPlayers: { [rhodes]: { nombre: 'Charles Aaron Rhodes' }, [mera]: { nombre: 'Rodrigo Mera' } } }
    expect(validateBallclubzMappings(game, clubs, players, ok)).toEqual([])

    const duplicate = { ...ok, newPlayers: { ...ok.newPlayers, [riello]: { nombre: 'Kevin Riello' } } }
    expect(validateBallclubzMappings(game, clubs, players, duplicate).join(' ')).toContain('ya existe en ese club')

    const tooShort = { ...ok, newPlayers: { ...ok.newPlayers, [mera]: { nombre: 'R' } } }
    expect(validateBallclubzMappings(game, clubs, players, tooShort).join(' ')).toContain('entre 3 y 80 caracteres')
  })

  it('rejects a player from another club and two source players for the same person', () => {
    const rhodes = keyOf('RHODES Charles Aaron')
    const mera = keyOf('MERA Rodrigo')
    const foreign = { ...base, newPlayers: { [mera]: { nombre: 'Rodrigo Mera' } }, players: { ...base.players, [rhodes]: 'galindo-none' } }
    expect(validateBallclubzMappings(game, clubs, players, foreign).join(' ')).toContain('no pertenece al club seleccionado')

    const galindo = keyOf('GALINDO Jesus')
    const riello = keyOf('RIELLO Kevin')
    const same = { ...base, newPlayers: { [rhodes]: { nombre: 'Charles Aaron Rhodes' }, [mera]: { nombre: 'Rodrigo Mera' } }, players: { ...base.players, [riello]: base.players[galindo] } }
    expect(validateBallclubzMappings(game, clubs, players, same).join(' ')).toContain('apuntan al mismo jugador')
  })
})

describe('BallClubz enrollment plan', () => {
  const season = { id: SEASON, anio: 2026 }
  const keyOf = (name: string) => [...game.visitor.batting, ...game.home.batting, ...game.visitor.pitching, ...game.home.pitching].find((row) => row.name === name)!.sourceKey

  it('reuses inscriptions already in the season, links other seasons and creates new players', () => {
    const base = suggestBallclubzMappings(game, clubs, players, SEASON)
    const mappings = {
      ...base,
      players: { ...base.players, [keyOf('RIELLO Kevin')]: 'riello-2017' },
      newPlayers: {
        [keyOf('RHODES Charles Aaron')]: { nombre: 'Charles Aaron Rhodes' },
        [keyOf('MERA Rodrigo')]: { nombre: 'Rodrigo Mera' },
      },
    }
    const steps = planBallclubzEnrollments({ game, season, clubs, players, mappings })
    const stepFor = (name: string) => steps.find((step) => step.sourceKey === keyOf(name))!

    expect(stepFor('ABARCA LUGO Jose Dan')).toMatchObject({ kind: 'existing', jugadorId: 'abarca-2026' })
    expect(stepFor('GALINDO Jesus')).toMatchObject({
      kind: 'enroll',
      row: { nombre: 'Jesús Galindo', stable_id: 'id-galindo', temporada_id: SEASON, club_id: 'daom', posicion: 'left_field', slug: 'jesus-galindo-daom-2026' },
    })
    expect(stepFor('RIELLO Kevin')).toMatchObject({ kind: 'enroll', row: { stable_id: 'id-riello', posicion: 'pitcher' } })
    const created = stepFor('RHODES Charles Aaron')
    expect(created).toMatchObject({ kind: 'create', row: { nombre: 'Charles Aaron Rhodes', club_id: 'velez', posicion: 'utility', slug: 'charles-aaron-rhodes-velez-2026' } })
    expect('stable_id' in (created as { row: object }).row).toBe(false)
    expect(stepFor('MERA Rodrigo')).toMatchObject({ kind: 'create', row: { posicion: 'pitcher' } })
  })

  it('points to the inscription of the same identity when the mapped row is from another season', () => {
    const mappings = { clubs: { 'club daom': 'daom', 'velez sarsfield': 'velez' }, players: { [keyOf('ABARCA LUGO Jose Dan')]: 'abarca-none' }, newPlayers: {} }
    const partial = { ...mappings, players: { ...mappings.players, [keyOf('GALINDO Jesus')]: 'galindo-none', [keyOf('RIELLO Kevin')]: 'riello-2017' }, newPlayers: { [keyOf('RHODES Charles Aaron')]: { nombre: 'Charles Aaron Rhodes' }, [keyOf('MERA Rodrigo')]: { nombre: 'Rodrigo Mera' } } }
    const steps = planBallclubzEnrollments({ game, season, clubs, players, mappings: partial })
    expect(steps.find((step) => step.sourceKey === keyOf('ABARCA LUGO Jose Dan'))).toMatchObject({ kind: 'existing', jugadorId: 'abarca-2026' })
  })
})
