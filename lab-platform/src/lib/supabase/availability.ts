interface ReadResult {
  error: { message: string } | null
  status: number
}

// A cached page that is rebuilt while Supabase is down must fail, not turn into an empty page: when
// a rebuild fails the last good copy stays online. Only the database being unreachable or broken
// counts (no answer, or a 5xx); a 4xx such as "no row found" is a normal answer the page handles.
export function isUnavailable(result: ReadResult): boolean {
  return result.error !== null && (result.status === 0 || result.status >= 500)
}

export function throwIfUnavailable(...results: ReadResult[]): void {
  const failed = results.find(isUnavailable)
  if (failed) throw new Error(`Supabase no disponible (${failed.status}): ${failed.error?.message ?? ''}`)
}
