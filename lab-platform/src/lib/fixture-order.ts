/** Fixture results tab: the latest game first, so the newest result is the first one a visitor sees. */
export function sortResultsLatestFirst<T extends { fecha_hora: string }>(games: readonly T[]): T[] {
  return [...games].sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
}
