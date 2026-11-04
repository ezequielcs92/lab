import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// A read slower than this is given up on, so a page that is being regenerated fails fast and the
// last good copy keeps being served instead of waiting for the platform to cut the request.
export const PUBLIC_READ_TIMEOUT_MS = 8000

// Client for pages anyone can see. It reads no cookies, so a page that uses it can be cached and
// regenerated in the background instead of rendering on every visit. Never use it for anything that
// depends on who is logged in.
export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input, init) => {
          const timeout = AbortSignal.timeout(PUBLIC_READ_TIMEOUT_MS)
          const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
          return fetch(input, { ...init, signal })
        },
      },
    },
  )
}
