import type { EstadoPartido } from './database.types'

export interface ScoreboardOrderable {
  estado: EstadoPartido
  fecha_hora: string
  finalizado_at?: string | null
}

/**
 * The last game played always leads the scoreboard, together with the games that finished within this
 * long before it (a weekend with several games keeps them all at the top).
 */
export const RECENT_FINISHED_WINDOW_MS = 48 * 60 * 60 * 1000

function time(value: string): number {
  return new Date(value).getTime()
}

function finishedTime(game: ScoreboardOrderable): number {
  return time(game.finalizado_at ?? game.fecha_hora)
}

/**
 * Home scoreboard order: live games, the last games played (latest first, always at the top even when
 * they finished days ago), upcoming games (soonest first), then older finished games (latest first)
 * and any suspended or cancelled game last.
 */
export function orderScoreboardGames<T extends ScoreboardOrderable>(games: readonly T[]): T[] {
  const live: T[] = []
  const finished: T[] = []
  const upcoming: T[] = []
  const other: T[] = []

  for (const game of games) {
    if (game.estado === 'en_curso') live.push(game)
    else if (game.estado === 'finalizado') finished.push(game)
    else if (game.estado === 'programado') upcoming.push(game)
    else other.push(game)
  }

  const lastPlayed = finished.reduce((latest, game) => Math.max(latest, finishedTime(game)), Number.NEGATIVE_INFINITY)
  const recent: T[] = []
  const older: T[] = []
  for (const game of finished) {
    (lastPlayed - finishedTime(game) <= RECENT_FINISHED_WINDOW_MS ? recent : older).push(game)
  }

  const ascending = (a: T, b: T) => time(a.fecha_hora) - time(b.fecha_hora)
  return [
    ...live.sort(ascending),
    ...recent.sort((a, b) => finishedTime(b) - finishedTime(a)),
    ...upcoming.sort(ascending),
    ...older.sort((a, b) => finishedTime(b) - finishedTime(a)),
    ...other.sort(ascending),
  ]
}
