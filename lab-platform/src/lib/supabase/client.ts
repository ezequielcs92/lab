import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { browserRevalidatingFetch } from './revalidate-from-browser'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Writes made from the admin refresh the public pages that show them.
    { global: { fetch: browserRevalidatingFetch((input, init) => fetch(input, init)) } }
  )
}
