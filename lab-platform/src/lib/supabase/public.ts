import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { readTags } from '@/lib/cache-tags'

// A read slower than this is given up on, so a page that is being regenerated fails fast and the
// last good copy keeps being served instead of waiting for the platform to cut the request.
export const PUBLIC_READ_TIMEOUT_MS = 8000

// How long a public read is kept in the server's data cache when the page does not ask for less.
// Writes from the admin mark the affected reads stale right away (see cache-tags), so this only bounds
// how long a change made outside the app (a manual SQL edit) can take to show.
export const PUBLIC_CACHE_SECONDS = 3600

// Client for pages anyone can see. It reads no cookies, so a page that uses it can be cached and
// regenerated in the background instead of rendering on every visit. Never use it for anything that
// depends on who is logged in.
//
// Every read goes through the server's data cache and is tagged with the tables it touches, so a crowd
// of visitors (a link shared on Instagram) is answered from the cache instead of piling queries on a
// small database, while an admin change still shows on the next visit.
export function createPublicClient(options: { cacheSeconds?: number } = {}) {
  const cacheSeconds = options.cacheSeconds ?? PUBLIC_CACHE_SECONDS
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
            next: { revalidate: cacheSeconds, tags: readTags(input) },
          })
        },
      },
    },
  )
}
