interface StandingsSortFields {
  orden_manual: number | null
  pct: number
  serie_ganada: number | null
  tqb: number | null
  carreras_empatados: number | null
  jg: number
  jp: number
}

export function compareStandings(a: StandingsSortFields, b: StandingsSortFields): number {
  return (a.orden_manual ?? Number.MAX_SAFE_INTEGER) - (b.orden_manual ?? Number.MAX_SAFE_INTEGER)
    || b.pct - a.pct
    || (b.serie_ganada ?? 0) - (a.serie_ganada ?? 0)
    || (b.tqb ?? Number.NEGATIVE_INFINITY) - (a.tqb ?? Number.NEGATIVE_INFINITY)
    || (b.carreras_empatados ?? 0) - (a.carreras_empatados ?? 0)
    || b.jg - a.jg
    || a.jp - b.jp
}

export function sortStandings<T extends StandingsSortFields>(standings: T[]): T[] {
  return [...standings].sort(compareStandings)
}
