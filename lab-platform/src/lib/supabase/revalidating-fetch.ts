import { revalidateTag } from 'next/cache'
import { tagsForWrites, writtenTable } from '@/lib/cache-tags'

/**
 * Marks the public pages that read these tables as stale. They keep being served while the next
 * visit rebuilds them in the background (stale-while-revalidate), so a visitor never waits on the
 * database and a slow database never turns into an error page.
 */
export function markTablesStale(tables: readonly string[]) {
  for (const tag of tagsForWrites(tables)) {
    try {
      revalidateTag(tag, 'max')
    } catch {
      // Outside a request (a script, a test) there is no cache to mark; the write itself already happened.
    }
  }
}

function methodOf(input: RequestInfo | URL, init?: RequestInit) {
  return init?.method ?? (typeof Request !== 'undefined' && input instanceof Request ? input.method : undefined)
}

/** fetch for server-side Supabase clients: after a successful write, the pages that show it go stale. */
export function revalidatingFetch(base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await base(input, init)
    const table = writtenTable(input, methodOf(input, init))
    if (table && response.ok) markTablesStale([table])
    return response
  }
}
