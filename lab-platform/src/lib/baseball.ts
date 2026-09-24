export function isValidBaseballInnings(value: number): boolean {
  if (!Number.isFinite(value) || value < 0) return false

  const outs = Math.round((value - Math.trunc(value)) * 10)
  return Math.abs(value * 10 - Math.round(value * 10)) < Number.EPSILON * 100
    && (outs === 0 || outs === 1 || outs === 2)
}

export function baseballInningsToOuts(value: number): number | null {
  if (!isValidBaseballInnings(value)) return null
  return Math.trunc(value) * 3 + Math.round((value - Math.trunc(value)) * 10)
}

export function outsToBaseballInnings(outs: number): number | null {
  if (!Number.isInteger(outs) || outs < 0) return null
  return Math.trunc(outs / 3) + (outs % 3) / 10
}
