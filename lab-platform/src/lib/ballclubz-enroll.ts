import type { BallclubzGame } from './ballclubz'
import {
  ballclubzPlayerSlug,
  collectBallclubzPlayers,
  type BallclubzClubRef,
  type BallclubzMappingSuggestions,
  type BallclubzPlayerRef,
} from './ballclubz-import'

export interface BallclubzEnrollmentRow {
  nombre: string
  slug: string
  club_id: string
  temporada_id: string
  posicion: string
  activo: true
  /** Present when linking an existing identity; omitted so the database creates a new one. */
  stable_id?: string
}

export type BallclubzEnrollmentStep =
  | { sourceKey: string; kind: 'existing'; jugadorId: string }
  | { sourceKey: string; kind: 'enroll' | 'create'; row: BallclubzEnrollmentRow }

/**
 * Decides, for every player in the box score, whether the mapped inscription already belongs to
 * the season or a new one has to be inserted. Mappings must already have passed validation.
 */
export function planBallclubzEnrollments(input: {
  game: BallclubzGame
  season: { id: string; anio: number }
  clubs: BallclubzClubRef[]
  players: BallclubzPlayerRef[]
  mappings: BallclubzMappingSuggestions
}): BallclubzEnrollmentStep[] {
  const { game, season, clubs, players, mappings } = input
  const clubById = new Map(clubs.map((club) => [club.id, club]))
  const playerById = new Map(players.map((player) => [player.id, player]))
  const steps: BallclubzEnrollmentStep[] = []

  for (const source of collectBallclubzPlayers(game)) {
    const clubId = mappings.clubs[source.teamSourceKey]
    const club = clubById.get(clubId)
    if (!club) throw new Error(`Club no mapeado para ${source.name}`)
    const pitcherOnly = source.pitching && !source.batting

    const creating = mappings.newPlayers?.[source.sourceKey]
    if (creating) {
      const nombre = creating.nombre.trim()
      steps.push({
        sourceKey: source.sourceKey,
        kind: 'create',
        row: {
          nombre,
          slug: ballclubzPlayerSlug(nombre, club.slug, season.anio),
          club_id: clubId,
          temporada_id: season.id,
          posicion: pitcherOnly ? 'pitcher' : 'utility',
          activo: true,
        },
      })
      continue
    }

    const mapped = playerById.get(mappings.players[source.sourceKey])
    if (!mapped) throw new Error(`Jugador no mapeado: ${source.name}`)
    if (mapped.temporada_id === season.id) {
      steps.push({ sourceKey: source.sourceKey, kind: 'existing', jugadorId: mapped.id })
      continue
    }

    const identity = mapped.stable_id
    const inscription = identity
      ? players.find((player) => player.stable_id === identity && player.club_id === clubId && player.temporada_id === season.id)
      : undefined
    if (inscription) {
      steps.push({ sourceKey: source.sourceKey, kind: 'existing', jugadorId: inscription.id })
      continue
    }
    steps.push({
      sourceKey: source.sourceKey,
      kind: 'enroll',
      row: {
        nombre: mapped.nombre,
        slug: ballclubzPlayerSlug(mapped.nombre, club.slug, season.anio),
        club_id: clubId,
        temporada_id: season.id,
        posicion: mapped.posicion ?? (pitcherOnly ? 'pitcher' : 'utility'),
        activo: true,
        ...(identity ? { stable_id: identity } : {}),
      },
    })
  }
  return steps
}
