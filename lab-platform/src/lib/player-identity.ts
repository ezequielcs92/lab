export interface PlayerIdentityRef {
  id: string
  stable_id: string | null
  club_id: string
  temporada_id: string | null
  updated_at: string
  sin_equipo_motivo?: string | null
}

export function normalizePlayerName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Every word typed must appear in the name, ignoring accents, case and word order. */
export function matchesPlayerSearch(name: string, query: string): boolean {
  const terms = normalizePlayerName(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizePlayerName(name)
  return terms.every((term) => haystack.includes(term))
}

/** Seasons from `seasonIds` in which this person has no inscription yet for the profile's club. */
export function missingSeasonEnrollments(
  player: PlayerIdentityRef,
  allPlayers: readonly PlayerIdentityRef[],
  seasonIds: readonly string[],
): string[] {
  const identity = player.stable_id ?? player.id
  const taken = new Set(
    allPlayers
      .filter((other) => (other.stable_id ?? other.id) === identity && other.club_id === player.club_id && other.temporada_id)
      .map((other) => other.temporada_id as string),
  )
  return [...new Set(seasonIds)].filter((seasonId) => !taken.has(seasonId))
}

/**
 * A seasonless profile becomes the inscription of the first missing season, so no seasonless
 * duplicate is left behind; every other missing season gets a copy of the profile.
 */
export function planSeasonEnrollment(
  player: PlayerIdentityRef,
  allPlayers: readonly PlayerIdentityRef[],
  seasonIds: readonly string[],
): { assignTo: string | null; copyTo: string[] } {
  const missing = missingSeasonEnrollments(player, allPlayers, seasonIds)
  if (player.temporada_id === null && missing.length > 0) return { assignTo: missing[0], copyTo: missing.slice(1) }
  return { assignTo: null, copyTo: missing }
}

/** Selects one visible profile for each identity, retaining separate club registrations when requested. */
export function choosePlayerProfiles<T extends PlayerIdentityRef>(
  rows: readonly T[],
  activeSeasonId: string | null,
  groupByClub = false,
): T[] {
  const ordered = [...rows].sort((left, right) => {
    const rank = (row: PlayerIdentityRef) => row.temporada_id === activeSeasonId && activeSeasonId
      ? 3
      : row.temporada_id === null ? 2 : 1
    return rank(right) - rank(left) || right.updated_at.localeCompare(left.updated_at)
  })
  const selected = new Map<string, T>()
  for (const row of ordered) {
    const identity = row.stable_id ?? row.id
    const key = groupByClub ? `${identity}|${row.club_id}` : identity
    if (!selected.has(key)) selected.set(key, row)
  }
  return [...selected.values()]
}

/**
 * People who retired or are not playing: the profile that represents them is flagged. A newer
 * inscription without the flag (they came back and were enrolled) takes precedence, so they leave the map.
 */
export function withoutTeamIdentities<T extends PlayerIdentityRef>(
  rows: readonly T[],
  activeSeasonId: string | null,
): Map<string, string> {
  const result = new Map<string, string>()
  for (const profile of choosePlayerProfiles(rows, activeSeasonId)) {
    if (profile.sin_equipo_motivo) result.set(profile.stable_id ?? profile.id, profile.sin_equipo_motivo)
  }
  return result
}

export function chooseCanonicalPlayerProfile<T extends PlayerIdentityRef>(
  rows: readonly T[],
  activeSeasonId: string | null,
): T | null {
  return choosePlayerProfiles(rows, activeSeasonId)[0] ?? null
}
