export interface ScheduledGameCandidate {
  id: string
  fecha_hora: string
  local_id: string
  visitante_id: string
  external_key: string | null
}

const LEAGUE_TIME_ZONE = 'America/Argentina/Buenos_Aires'

function leagueDate(timestamp: string): string | null {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', { timeZone: LEAGUE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/**
 * Finds the game that was scheduled by hand for the same two clubs on the same day, so an imported
 * box score completes it instead of creating a second game. Home and visitor are ignored on purpose:
 * the scheduled game may have them the other way round, and the import corrects that.
 * Returns null when there is no candidate or when it is ambiguous (for example a doubleheader).
 */
export function findScheduledGame<T extends ScheduledGameCandidate>(
  candidates: T[],
  clubA: string,
  clubB: string,
  date: string,
): T | null {
  if (!clubA || !clubB || clubA === clubB) return null
  const matches = candidates.filter((game) =>
    game.external_key === null
    && ((game.local_id === clubA && game.visitante_id === clubB) || (game.local_id === clubB && game.visitante_id === clubA))
    && leagueDate(game.fecha_hora) === date,
  )
  return matches.length === 1 ? matches[0] : null
}
