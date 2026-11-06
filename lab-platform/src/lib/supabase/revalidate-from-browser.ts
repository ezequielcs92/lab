import { writtenTable } from '@/lib/cache-tags'

// Writes made from the admin in the browser go straight to Supabase, so the server never sees them.
// After each successful write the browser tells /api/revalidate which tables changed; several saves in
// a row are sent together.
const SEND_DELAY_MS = 400

let pending = new Set<string>()
let timer: ReturnType<typeof setTimeout> | null = null

function send() {
  timer = null
  const tables = [...pending]
  pending = new Set()
  if (tables.length === 0) return
  fetch('/api/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tables }),
    keepalive: true,
  }).catch(() => {
    // The public pages refresh on their own within the hour; a lost notice is not worth an error.
  })
}

export function queueRevalidation(table: string) {
  pending.add(table)
  if (timer === null) timer = setTimeout(send, SEND_DELAY_MS)
}

function methodOf(input: RequestInfo | URL, init?: RequestInit) {
  return init?.method ?? (input instanceof Request ? input.method : undefined)
}

/** fetch for the browser Supabase client: reports successful writes so the public pages refresh. */
export function browserRevalidatingFetch(base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const response = await base(input, init)
    const table = writtenTable(input, methodOf(input, init))
    if (table && response.ok) queueRevalidation(table)
    return response
  }
}
