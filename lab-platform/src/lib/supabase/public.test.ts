import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPublicClient } from './public'

describe('createPublicClient', () => {
  afterEach(() => vi.unstubAllGlobals())

  async function requestInit(options?: { cacheSeconds?: number }) {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    await createPublicClient(options).from('clubes').select('id')
    return fetchMock.mock.calls[0][1] as RequestInit & { next?: { revalidate: number } }
  }

  it('does not touch the data cache unless asked to', async () => {
    expect((await requestInit()).next).toBeUndefined()
  })

  it('asks the server data cache to keep identical reads for the given seconds', async () => {
    const init = await requestInit({ cacheSeconds: 60 })
    expect(init.next).toEqual({ revalidate: 60 })
    expect(init.signal).toBeDefined()
  })
})
