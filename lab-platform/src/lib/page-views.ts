// Visit counters: which pages count and which visitors are ignored. Nothing personal is stored,
// only "this page was opened once today".

const IGNORED_PREFIXES = ['/admin', '/api', '/auth', '/login', '/perfil', '/proximamente', '/_next']
const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http/i

/** The page to count, or null when it must not be counted. Query strings and hashes never count. */
export function trackedPath(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let path = input.split('#')[0].split('?')[0].trim()
  if (path.length > 1) path = path.replace(/\/+$/, '')
  if (path.length < 1 || path.length > 200 || !path.startsWith('/')) return null
  if (!/^\/[A-Za-z0-9\-._~%/]*$/.test(path)) return null
  if (IGNORED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null
  return path
}

export function isBotUserAgent(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent)
}
