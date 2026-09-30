export interface PlayerIdentityRef {
  id: string
  stable_id: string | null
  club_id: string
  temporada_id: string | null
  updated_at: string
}

export function normalizePlayerName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
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

export function chooseCanonicalPlayerProfile<T extends PlayerIdentityRef>(
  rows: readonly T[],
  activeSeasonId: string | null,
): T | null {
  return choosePlayerProfiles(rows, activeSeasonId)[0] ?? null
}
