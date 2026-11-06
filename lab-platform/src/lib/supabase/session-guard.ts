// The proxy runs before every page. When Supabase stops answering it must not take the whole site
// down with it: anonymous visitors never need a session lookup, and a lookup that does not answer
// quickly is dropped instead of waiting for Vercel to cut the request.
export const SESSION_LOOKUP_TIMEOUT_MS = 4000

export class SessionLookupTimeout extends Error {
  constructor() {
    super('Session lookup timed out')
  }
}

// @supabase/ssr stores the session in `sb-<project>-auth-token` (split in `.0`, `.1`… chunks).
export function hasAuthCookie(cookies: ReadonlyArray<{ name: string }>): boolean {
  return cookies.some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
}

export function withTimeout<T>(work: PromiseLike<T>, ms = SESSION_LOOKUP_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SessionLookupTimeout()), ms)
  })
  return Promise.race([Promise.resolve(work), expired]).finally(() => clearTimeout(timer))
}

// Only these areas read who is logged in on the server. On every other page a logged-in visitor is
// treated like anyone else, so the proxy does not ask Supabase about them (one less call per page view).
const SESSION_ROUTE_PREFIXES = ['/admin', '/perfil', '/api', '/auth', '/login']

export function isSessionRoute(pathname: string): boolean {
  return SESSION_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}
