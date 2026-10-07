import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ updateSession: vi.fn() }))
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: mocks.updateSession }))
import { config, proxy } from './proxy'

describe('maintenance gate', () => {
  it('matches every route including assets and APIs', () => {
    expect(config.matcher).toEqual(['/:path*'])
  })
  it.each(['/', '/noticias', '/jugadores/Agustin-Tissera', '/admin', '/login', '/auth/callback', '/api/mvp', '/api/admin/sheets/apply', '/favicon.ico', '/clubes/galeria/daom/foto-001.jpg', '/_next/static/test.js', '/_next/image'])('blocks %s before auth or downstream handling', async (pathname) => {
    const response = await proxy(new NextRequest(`https://lab.test${pathname}`))
    expect(response.status).toBe(503)
    expect(await response.text()).toContain('Sitio en mantenimiento')
    expect(mocks.updateSession).not.toHaveBeenCalled()
  })
  it('blocks mutations as well as pages', async () => {
    const response = await proxy(new NextRequest('https://lab.test/api/admin/ballclubz', { method: 'POST' }))
    expect(response.status).toBe(503)
    expect(mocks.updateSession).not.toHaveBeenCalled()
  })
})
