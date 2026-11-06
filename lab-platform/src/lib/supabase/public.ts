import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// A read slower than this is given up on, so a page that is being regenerated fails fast and the
// last good copy keeps being served instead of waiting for the platform to cut the request.
export const PUBLIC_READ_TIMEOUT_MS = 8000

// How long a player profile's reads are remembered by the server's data cache.
export const PROFILE_DATA_CACHE_SECONDS = 300

// Client for pages anyone can see. It reads no cookies, so a page that uses it can be cached and
// regenerated in the background instead of rendering on every visit. Never use it for anything that
// depends on who is logged in.
//
// Pages that depend on the query string (filters, tabs) cannot be cached as a whole, so they pass
// `cacheSeconds`: identical reads are then answered from the server's data cache instead of reaching the
// database again, which keeps a crowd of visitors (or a crawler) from piling queries on a small database.
export function createPublicClient(options: { cacheSeconds?: number } = {}) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => {
          const timeout = AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)
          const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
          return fetch(input, {
            ...init,
            signal,
            ...(options.cacheSeconds ? { next: { revalidate: options.cacheSeconds } } : {}),
          })
        },
      },
    },
  )
}
