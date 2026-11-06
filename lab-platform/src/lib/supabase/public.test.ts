import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPublicClient, PUBLIC_CACHE_SECONDS } from './public'

describe('createPublicClient', () => {
  afterEach(() => vi.unstubAllGlobals())

  async function requestInit(options?: { cacheSeconds?: number }) {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    await createPublicClient(options).from('jugadores').select('id, clubes(nombre)')
    return fetchMock.mock.calls[0][1] as RequestInit & { next?: { revalidate: number; tags: string[] } }
  }

  it('keeps every read in the data cache for an hour unless the page asks for less', async () => {
    const init = await requestInit()
    expect(init.next?.revalidate).toBe(PUBLIC_CACHE_SECONDS)
    expect(PUBLIC_CACHE_SECONDS).toBe(3600)
    expect(init.signal).toBeDefined()
  })

  it('uses the time the page asks for', async () => {
    expect((await requestInit({ cacheSeconds: 30 })).next?.revalidate).toBe(30)
  })

  it('tags the read with every table it touches, so an admin write can make it stale', async () => {
    expect((await requestInit()).next?.tags).toEqual(['db:all', 'db:jugadores', 'db:clubes'])
  })
})
