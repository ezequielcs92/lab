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
  stable_id?: string
  posicion?: string | null
}

export interface BallclubzSourcePlayer {
  sourceKey: string
  name: string
  teamSourceKey: string
  batting: boolean
  pitching: boolean
}

export interface BallclubzNewPlayer {
  nombre: string
}

export interface BallclubzMappingSuggestions {
  clubs: Record<string, string>
  /** Source player -> any inscription of the same club; one from another season is enrolled on import. */
  players: Record<string, string>
  /** Source players that do not exist yet and are created and enrolled on import. */
  newPlayers?: Record<string, BallclubzNewPlayer>
}

// BallClubz cuts player names around 20 characters, ending mid-word.
const TRUNCATED_NAME_LENGTH = 17
export const MIN_PLAYER_NAME_LENGTH = 3
export const MAX_PLAYER_NAME_LENGTH = 80

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

/**
 * True when a BallClubz name ("RIELLO Kevin", "FIGUERAS Pedro Agust") describes the stored
 * name ("Kevin Riello", "Pedro Agustín Figueras"). Word order is ignored; only the last word
 * of a truncated source name may be a prefix.
 */
export function matchesBallclubzPlayerName(sourceName: string, playerName: string): boolean {
  const source = normalizeBallclubzText(sourceName).split(' ').filter(Boolean)
  const candidate = normalizeBallclubzText(playerName).split(' ').filter(Boolean)
  if (source.length === 0 || candidate.length < source.length) return false
  const truncated = sourceName.trim().length >= TRUNCATED_NAME_LENGTH
  if (!truncated && candidate.length !== source.length) return false

  const remaining = [...candidate]
  const lastIndex = source.length - 1
  for (const [index, token] of source.entries()) {
    const canBePrefix = truncated && index === lastIndex
    const hit = remaining.findIndex((word) => word === token || (canBePrefix && word.startsWith(token)))
    if (hit === -1) return false
    remaining.splice(hit, 1)
  }
  return true
}

function isSurnameToken(token: string): boolean {
  const letters = token.replace(/[^A-Za-z]/g, '')
  if (letters.length < 2) return false
  const upper = letters.replace(/[^A-Z]/g, '').length
  return upper >= Math.ceil(letters.length * 0.6)
}

function titleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

/** "RHODES Charles Aaron" -> "Charles Aaron Rhodes". Cut-off names are returned as-is for the admin to edit. */
export function suggestBallclubzPlayerName(sourceName: string): string {
  const tokens = sourceName.trim().split(/\s+/).filter(Boolean)
  let surnameCount = 0
  while (surnameCount < tokens.length && isSurnameToken(tokens[surnameCount])) surnameCount += 1
  if (surnameCount === 0 || surnameCount === tokens.length) return tokens.map(titleCase).join(' ')
  const surnames = tokens.slice(0, surnameCount)
  const given = tokens.slice(surnameCount)
  return [...given, ...surnames.map(titleCase)].join(' ')
}

export function ballclubzPlayerSlug(name: string, clubSlug: string, year: number | string): string {
  const base = normalizeBallclubzText(`${name} ${clubSlug} ${year}`).replace(/\s+/g, '-')
  return base.slice(0, 140)
}

/**
 * One option per identity for a club: the inscription already in the season when there is one,
 * otherwise the most recent row. Picking an option from another season enrolls it on import.
 */
export function playerOptionsForClub(players: BallclubzPlayerRef[], clubId: string, seasonId: string): BallclubzPlayerRef[] {
  const byIdentity = new Map<string, BallclubzPlayerRef>()
  for (const player of players) {
    if (player.club_id !== clubId) continue
    const identity = player.stable_id ?? player.id
    const current = byIdentity.get(identity)
    if (!current || (player.temporada_id === seasonId && current.temporada_id !== seasonId)) byIdentity.set(identity, player)
  }
  return [...byIdentity.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
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
    const options = playerOptionsForClub(players, clubId, seasonId)
    const sourceName = normalizeBallclubzText(sourcePlayer.name)
    const exact = options.filter((player) => normalizeBallclubzText(player.nombre) === sourceName)
    const matches = exact.length > 0 ? exact : options.filter((player) => matchesBallclubzPlayerName(sourcePlayer.name, player.nombre))
    if (matches.length === 1) playerMappings[sourcePlayer.sourceKey] = matches[0].id
  }
  return { clubs: clubMappings, players: playerMappings, newPlayers: {} }
}

export function validateBallclubzMappings(
  game: BallclubzGame,
  clubs: BallclubzClubRef[],
  players: BallclubzPlayerRef[],
  mappings: BallclubzMappingSuggestions
): string[] {
  const errors: string[] = []
  const clubById = new Map(clubs.map((club) => [club.id, club]))
  const playerById = new Map(players.map((player) => [player.id, player]))
  const newPlayers = mappings.newPlayers ?? {}
  for (const team of [game.visitor, game.home]) {
    if (!clubById.has(mappings.clubs[team.sourceKey])) errors.push(`Falta mapear el club ${team.name}`)
  }

  const identitiesInGame = new Map<string, string>()
  const newNamesInGame = new Map<string, string>()
  for (const sourcePlayer of collectBallclubzPlayers(game)) {
    const clubId = mappings.clubs[sourcePlayer.teamSourceKey]
    const creating = newPlayers[sourcePlayer.sourceKey]
    if (creating) {
      const name = creating.nombre.trim()
      const normalized = normalizeBallclubzText(name)
      if (name.length < MIN_PLAYER_NAME_LENGTH || name.length > MAX_PLAYER_NAME_LENGTH) {
        errors.push(`El nombre nuevo de ${sourcePlayer.name} debe tener entre ${MIN_PLAYER_NAME_LENGTH} y ${MAX_PLAYER_NAME_LENGTH} caracteres`)
      } else if (players.some((player) => player.club_id === clubId && normalizeBallclubzText(player.nombre) === normalized)) {
        errors.push(`${name} ya existe en ese club: elegilo de la lista en lugar de crearlo`)
      } else if (newNamesInGame.has(normalized)) {
        errors.push(`${name} aparece dos veces entre los jugadores nuevos`)
      }
      newNamesInGame.set(normalized, sourcePlayer.sourceKey)
      continue
    }

    const player = playerById.get(mappings.players[sourcePlayer.sourceKey])
    if (!player) {
      errors.push(`Falta mapear el jugador ${sourcePlayer.name}`)
      continue
    }
    if (player.club_id !== clubId) {
      errors.push(`${sourcePlayer.name} no pertenece al club seleccionado`)
      continue
    }
    const identity = player.stable_id ?? player.id
    const previous = identitiesInGame.get(identity)
    if (previous) errors.push(`${sourcePlayer.name} y ${previous} apuntan al mismo jugador`)
    identitiesInGame.set(identity, sourcePlayer.name)
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
