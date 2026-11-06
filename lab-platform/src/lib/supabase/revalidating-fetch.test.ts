import { beforeEach, describe, expect, it, vi } from 'vitest'

const revalidateTag = vi.fn()
let outsideRequest = false
vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => {
    if (outsideRequest) throw new Error('outside a request')
    revalidateTag(...args)
  },
}))

import { revalidatingFetch } from './revalidating-fetch'

const ok = () => Promise.resolve(new Response(null, { status: 204 }))

describe('revalidatingFetch', () => {
  beforeEach(() => {
    revalidateTag.mockClear()
    outsideRequest = false
  })

  it('marks the written table stale with stale-while-revalidate after a successful write', async () => {
    await revalidatingFetch(ok)('https://x.supabase.co/rest/v1/noticias?id=eq.1', { method: 'PATCH' })
    expect(revalidateTag).toHaveBeenCalledWith('db:noticias', 'max')
  })

  it('does nothing for reads or failed writes', async () => {
    await revalidatingFetch(ok)('https://x.supabase.co/rest/v1/noticias')
    await revalidatingFetch(() => Promise.resolve(new Response(null, { status: 409 })))('https://x.supabase.co/rest/v1/noticias', { method: 'POST' })
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('never breaks the write when there is no cache to mark', async () => {
    outsideRequest = true
    const response = await revalidatingFetch(ok)('https://x.supabase.co/rest/v1/jugadores', { method: 'POST' })
    expect(response.status).toBe(204)
  })
})
