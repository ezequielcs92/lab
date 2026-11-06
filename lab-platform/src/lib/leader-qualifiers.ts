// Minimums to appear in the rate leaderboards (AVG, OBP, SLG, OPS, ERA, WHIP, K%). They are defined per
// game of the player's team, up to the full-season figure, so the board is meaningful from the first
// week: a team with 3 games played asks for 6 AB / 3 IP instead of waiting for 48 AB / 24 IP.
export const BATTING_MIN_AB_PER_TEAM_GAME = 2
export const PITCHING_MIN_IP_PER_TEAM_GAME = 1
export const SEASON_MIN_AB = 48
export const SEASON_MIN_IP = 24

export const BATTING_RATE_METRICS = ['avg', 'obp', 'slg', 'ops']
export const PITCHING_RATE_METRICS = ['era', 'whip', 'so_pct']

export type QualifiedScope = 'bateo' | 'pitcheo'

export function isQualifiedMetric(scope: string, metric: string): scope is QualifiedScope {
  return (scope === 'bateo' && BATTING_RATE_METRICS.includes(metric))
    || (scope === 'pitcheo' && PITCHING_RATE_METRICS.includes(metric))
}

/** Games already played by each club, counting home and visitor games. */
export function teamGamesPlayed(games: readonly { local_id: string; visitante_id: string }[]): Map<string, number> {
  const played = new Map<string, number>()
  for (const game of games) {
    for (const clubId of [game.local_id, game.visitante_id]) played.set(clubId, (played.get(clubId) ?? 0) + 1)
  }
  return played
}

/** AB (batting) or IP (pitching) a player of a club needs to qualify, given the club's games so far. */
export function qualifyingMinimum(scope: QualifiedScope, clubGames: number): number {
  const required = scope === 'bateo'
    ? Math.min(SEASON_MIN_AB, BATTING_MIN_AB_PER_TEAM_GAME * clubGames)
    : Math.min(SEASON_MIN_IP, PITCHING_MIN_IP_PER_TEAM_GAME * clubGames)
  // Someone who has not batted or pitched yet never has a rate to rank.
  return Math.max(required, Number.EPSILON)
}

export function qualifies(
  scope: QualifiedScope,
  row: { club_id: string; ab?: number | null; ip?: number | null },
  gamesByClub: ReadonlyMap<string, number>,
): boolean {
  const raw = scope === 'bateo' ? row.ab : row.ip
  if (raw === null || raw === undefined) return false
  const volume = Number(raw)
  return Number.isFinite(volume) && volume >= qualifyingMinimum(scope, gamesByClub.get(row.club_id) ?? 0)
}

/** Ranks rows by a metric, best first, with rows missing the metric last. */
export function rankByMetric<T>(rows: readonly T[], metric: string, ascending: boolean): T[] {
  const value = (row: T) => {
    const raw = (row as Record<string, unknown>)[metric]
    if (raw === null || raw === undefined || raw === '') return null
    const number = Number(raw)
    return Number.isFinite(number) ? number : null
  }
  return [...rows].sort((left, right) => {
    const a = value(left)
    const b = value(right)
    if (a === null && b === null) return 0
    if (a === null) return 1
    if (b === null) return -1
    return ascending ? a - b : b - a
  })
}
