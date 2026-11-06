import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { revalidatingFetch } from './revalidating-fetch'

/**
 * Service-role client — bypasses RLS.
 * Only use in server-side API routes, never expose to the browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Imports and other admin writes refresh the public pages that show them.
      global: { fetch: revalidatingFetch((input, init) => fetch(input, init)) },
    }
  )
}
