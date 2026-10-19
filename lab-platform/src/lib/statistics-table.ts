export type StatisticsScope = 'bateo' | 'pitcheo' | 'fildeo'
export const STATISTICS_PAGE_SIZE = 50

export const STATISTICS_COLUMNS: Record<StatisticsScope, { key: string; label: string }[]> = {
  bateo: ['ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp', 'avg', 'obp', 'slg', 'ops'].map((key) => ({ key, label: key === 'doble' ? '2B' : key === 'triple' ? '3B' : key.toUpperCase() })),
  pitcheo: ['ip', 'h', 'r', 'er', 'hr', 'bb', 'so', 'w', 'l', 'sv', 'era', 'whip'].map((key) => ({ key, label: key.toUpperCase() })),
  fildeo: ['po', 'a', 'e', 'dp', 'fld_pct'].map((key) => ({ key, label: key === 'fld_pct' ? 'FPCT' : key.toUpperCase() })),
}

export function getStatisticsView(scope: StatisticsScope, historical: boolean) {
  if (historical) {
    return scope === 'bateo' ? 'v_stats_bateo_historico_fase' : scope === 'pitcheo' ? 'v_stats_pitcheo_historico_fase' : 'v_stats_fildeo_historico_fase'
  }
  return scope === 'bateo' ? 'v_stats_bateo_completo' : scope === 'pitcheo' ? 'v_stats_pitcheo_completo' : 'v_stats_fildeo_completo'
}

export function getStatisticsTableOptions(scope: StatisticsScope, filters: { pagina?: string; orden?: string; direccion?: string }) {
  const parsed = Number(filters.pagina)
  const page = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : 1
  const fallback = scope === 'bateo' ? 'h' : scope === 'pitcheo' ? 'so' : 'po'
  const metric = STATISTICS_COLUMNS[scope].some((column) => column.key === filters.orden) ? filters.orden! : fallback
  return { page, metric, ascending: filters.direccion === 'asc', from: (page - 1) * STATISTICS_PAGE_SIZE, to: page * STATISTICS_PAGE_SIZE - 1 }
}

export function statisticsUrl(filters: Record<string, string | undefined>, changes: Record<string, string> = {}): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...filters, ...changes })) if (value) params.set(key, value)
  return `/estadisticas?${params.toString()}`
}

export function formatStatistic(value: unknown, metric: string): string {
  if (value === null || value === undefined) return '—'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  if (['avg', 'obp', 'slg', 'ops', 'whip', 'fld_pct'].includes(metric)) return numeric.toFixed(3)
  if (metric === 'era') return numeric.toFixed(2)
  if (metric === 'ip') return numeric.toFixed(1)
  return numeric.toLocaleString('es-AR')
}
