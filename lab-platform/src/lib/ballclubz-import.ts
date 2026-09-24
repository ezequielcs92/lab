import type { BallclubzGame, BallclubzTeam } from './ballclubz'
import { normalizeBallclubzText } from './ballclubz'

export interface BallclubzClubRef {
  id: string
  nombre: string
  nombre_corto: string | null
  slug: string
}

export interface BallclubzPlayerRef {
  id: string
  nombre: string
  club_id: string
  temporada_id: string | null
}

export interface BallclubzSourcePlayer {
  sourceKey: string
  name: string
  teamSourceKey: string
  batting: boolean
  pitching: boolean
}

export interface BallclubzMappingSuggestions {
  clubs: Record<string, string>
  players: Record<string, string>
}

function normalizedClubValues(club: BallclubzClubRef): string[] {
  return [club.nombre, club.nombre_corto ?? '', club.slug]
    .map((value) => normalizeBallclubzText(value).replace(/^club\s+/, ''))
    .filter(Boolean)
}

export function collectBallclubzPlayers(game: BallclubzGame): BallclubzSourcePlayer[] {
  const players = new Map<string, BallclubzSourcePlayer>()
  for (const team of [game.visitor, game.home]) {
    for (const row of team.batting) {
      players.set(row.sourceKey, {
        sourceKey: row.sourceKey,
        name: row.name,
        teamSourceKey: team.sourceKey,
        batting: true,
        pitching: players.get(row.sourceKey)?.pitching ?? false,
      })
    }
    for (const row of team.pitching) {
      const current = players.get(row.sourceKey)
      players.set(row.sourceKey, {
        sourceKey: row.sourceKey,
        name: row.name,
        teamSourceKey: team.sourceKey,
        batting: current?.batting ?? false,
        pitching: true,
      })
    }
  }
  return [...players.values()]
}

export function suggestBallclubzMappings(
  game: BallclubzGame,
  clubs: BallclubzClubRef[],
  players: BallclubzPlayerRef[],
  seasonId: string
): BallclubzMappingSuggestions {
  const clubMappings: Record<string, string> = {}
  for (const team of [game.visitor, game.home]) {
    const source = normalizeBallclubzText(team.name).replace(/^club\s+/, '')
    const matches = clubs.filter((club) => normalizedClubValues(club).includes(source))
    if (matches.length === 1) clubMappings[team.sourceKey] = matches[0].id
  }

  const playerMappings: Record<string, string> = {}
  for (const sourcePlayer of collectBallclubzPlayers(game)) {
    const clubId = clubMappings[sourcePlayer.teamSourceKey]
    if (!clubId) continue
    const sourceName = normalizeBallclubzText(sourcePlayer.name)
    const matches = players.filter((player) =>
      player.club_id === clubId
      && player.temporada_id === seasonId
      && normalizeBallclubzText(player.nombre) === sourceName
    )
    if (matches.length === 1) playerMappings[sourcePlayer.sourceKey] = matches[0].id
  }
  return { clubs: clubMappings, players: playerMappings }
}

export function validateBallclubzMappings(
  game: BallclubzGame,
  seasonId: string,
  clubs: BallclubzClubRef[],
  players: BallclubzPlayerRef[],
  mappings: BallclubzMappingSuggestions
): string[] {
  const errors: string[] = []
  const clubById = new Map(clubs.map((club) => [club.id, club]))
  const playerById = new Map(players.map((player) => [player.id, player]))
  for (const team of [game.visitor, game.home]) {
    if (!clubById.has(mappings.clubs[team.sourceKey])) errors.push(`Falta mapear el club ${team.name}`)
  }
  for (const sourcePlayer of collectBallclubzPlayers(game)) {
    const player = playerById.get(mappings.players[sourcePlayer.sourceKey])
    const clubId = mappings.clubs[sourcePlayer.teamSourceKey]
    if (!player) errors.push(`Falta mapear el jugador ${sourcePlayer.name}`)
    else if (player.club_id !== clubId || player.temporada_id !== seasonId) {
      errors.push(`${sourcePlayer.name} no pertenece al club y temporada seleccionados`)
    }
  }
  return errors
}

export function teamForSourceKey(game: BallclubzGame, sourceKey: string): BallclubzTeam {
  const team = [game.visitor, game.home].find((candidate) => candidate.sourceKey === sourceKey)
  if (!team) throw new Error(`Equipo BallClubz desconocido: ${sourceKey}`)
  return team
}

export function ballclubzInnings(game: BallclubzGame) {
  const length = Math.max(game.home.innings.length, game.visitor.innings.length)
  return Array.from({ length }, (_, index) => ({
    inning: index + 1,
    local: game.home.innings[index] ?? 0,
    visitante: game.visitor.innings[index] ?? 0,
  }))
}
