// Public pages keep their database reads in the server's data cache for a long time, so a crowd of
// visitors is answered from the cache instead of the database. Each read is tagged with the tables it
// touches; when something is written, only the tags of the written tables are marked stale and the
// pages that use them are rebuilt on their next visit.

/** Present on every public read: revalidating it refreshes everything. */
export const ALL_TAG = 'db:all'
/** Present on every read of a view (v_*). Views are computed from several tables. */
export const VIEWS_TAG = 'db:views'

// Tables the statistics, standings and roster views are computed from. Writing to one of them makes
// every view stale.
const VIEW_SOURCES = new Set([
  'partidos',
  'estadisticas_bateo',
  'estadisticas_pitcheo',
  'estadisticas_fildeo',
  'estadisticas_temporada_fuente',
  'jugadores',
  'clubes',
  'temporadas',
  'temporada_clubes',
  'posiciones_ajustes',
  'divisiones',
])

// RPCs that only read or that record something no public page shows. Calling them changes nothing
// that is cached.
const READ_ONLY_RPCS = new Set(['resumen_visitas', 'registrar_visita'])

const TABLE_NAME = /^[a-z_][a-z0-9_]{0,62}$/

export const tableTag = (table: string) => `db:${table}`

function restPath(input: RequestInfo | URL): { path: string; url: URL } | null {
  let url: URL
  try {
    url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  } catch {
    return null
  }
  const marker = '/rest/v1/'
  const index = url.pathname.indexOf(marker)
  if (index === -1) return null
  return { path: url.pathname.slice(index + marker.length), url }
}

// Tables embedded in a PostgREST select, e.g. `*,clubes(*)` or `local:clubes!partidos_local_id_fkey(nombre)`.
function embeddedTables(select: string | null): string[] {
  if (!select) return []
  const tables: string[] = []
  for (const match of select.matchAll(/(?:[a-z_][a-z0-9_]*:)?([a-z_][a-z0-9_]*)(?:![a-z0-9_]+)?\(/g)) {
    tables.push(match[1])
  }
  return tables
}

/** Tags for a public read, so a later write to any table it touched can make it stale. */
export function readTags(input: RequestInfo | URL): string[] {
  const rest = restPath(input)
  if (!rest) return [ALL_TAG]
  const [first, second] = rest.path.split('/')
  if (first === 'rpc') return [ALL_TAG, `db:rpc:${second ?? ''}`]
  const tables = [first, ...embeddedTables(rest.url.searchParams.get('select'))].filter((table) => TABLE_NAME.test(table))
  const tags = new Set([ALL_TAG, ...tables.map(tableTag)])
  if (tables.some((table) => table.startsWith('v_'))) tags.add(VIEWS_TAG)
  return [...tags]
}

/** Tags that a write to these tables makes stale. */
export function tagsForTables(tables: readonly string[]): string[] {
  const tags = new Set<string>()
  for (const table of tables) {
    if (!TABLE_NAME.test(table)) continue
    tags.add(tableTag(table))
    if (VIEW_SOURCES.has(table)) tags.add(VIEWS_TAG)
  }
  return [...tags]
}

/**
 * The table a request writes to, `'*'` for an RPC that may change anything, or null when the request
 * does not write (reads, read-only RPCs, auth and storage calls).
 */
export function writtenTable(input: RequestInfo | URL, method: string | undefined): string | null {
  const verb = (method ?? 'GET').toUpperCase()
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return null
  const rest = restPath(input)
  if (!rest) return null
  const [first, second] = rest.path.split('/')
  if (first === 'rpc') return second && READ_ONLY_RPCS.has(second) ? null : '*'
  return TABLE_NAME.test(first) ? first : null
}

/** Tags made stale by a set of written tables, where `'*'` stands for "anything may have changed". */
export function tagsForWrites(tables: readonly string[]): string[] {
  return tables.includes('*') ? [ALL_TAG] : tagsForTables(tables)
}

/** Parses the body sent by the browser to /api/revalidate. */
export function parseRevalidateRequest(body: unknown): string[] | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { tables?: unknown }).tables)) return null
  const tables = (body as { tables: unknown[] }).tables
  if (tables.length === 0 || tables.length > 30) return null
  if (!tables.every((table) => typeof table === 'string' && (table === '*' || TABLE_NAME.test(table)))) return null
  return [...new Set(tables as string[])]
}
