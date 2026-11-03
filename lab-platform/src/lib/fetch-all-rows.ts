// Supabase answers at most 1000 rows per request, so a table that grows past that is silently cut
// short. Reads every page of an ordered query; the order must be unique (add `id` as tie-breaker).
export const SUPABASE_PAGE_SIZE = 1000

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) break
  }
  return { data: rows, error: null }
}
