import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const STAGING_REF = 'wnribimpzdoebeqtqxbs'

export function readOnlyRequest(baseUrl, key) {
  let url
  try { url = new URL(baseUrl) } catch { throw new Error('Missing or invalid staging URL') }
  if (url.protocol !== 'https:' || url.hostname !== `${STAGING_REF}.supabase.co` ||
      url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Only the LAB staging origin is allowed')
  }
  if (typeof key !== 'string' || !key) throw new Error('Missing staging publishable key')
  let legacyAnon = false
  if (!key.startsWith('sb_publishable_')) {
    try {
      const parts = key.split('.')
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
      legacyAnon = parts.length === 3 && payload.role === 'anon' && payload.ref === STAGING_REF
    } catch { /* Reject unknown key formats, without logging their contents. */ }
    if (!legacyAnon) throw new Error('Only a publishable key or staging anon key is allowed')
  }
  return {
    url: `${url.origin}/rest/v1/temporadas?select=id&limit=1`,
    options: {
      method: 'GET', redirect: 'error', cache: 'no-store',
      headers: { apikey: key, ...(legacyAnon ? { Authorization: `Bearer ${key}` } : {}), Accept: 'application/json', 'Cache-Control': 'no-cache' },
    },
  }
}

export async function checkStaging({ url, key, fetchImpl = fetch, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  const request = readOnlyRequest(url, key)
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response
    try {
      response = await fetchImpl(request.url, { ...request.options, signal: AbortSignal.timeout(15_000) })
    } catch {
      if (attempt === 3) throw new Error('Staging connection failed after 3 attempts')
      await wait(attempt * 5_000)
      continue
    }
    if (!response.ok) {
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await wait(attempt * 5_000)
        continue
      }
      throw new Error(`Staging read failed with HTTP ${response.status}`)
    }
    let rows
    try { rows = await response.json() } catch { throw new Error('Staging returned invalid JSON') }
    if (!Array.isArray(rows) || rows.length > 1 || rows.some((row) =>
      !row || typeof row.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(row.id))) {
      throw new Error('Staging returned an unexpected database result')
    }
    return { project: STAGING_REF, status: 'ok', attempts: attempt, checkedAt: new Date().toISOString() }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  checkStaging({ url: process.env.LAB_STAGING_SUPABASE_URL, key: process.env.LAB_STAGING_SUPABASE_PUBLISHABLE_KEY })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1 })
}
