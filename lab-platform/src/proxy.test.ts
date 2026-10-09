import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({ updateSession: vi.fn(), maintenanceEnabled: true }))
vi.mock('@/lib/supabase/middleware', () => ({ updateSession: mocks.updateSession }))
vi.mock('@/lib/site-maintenance', async (importOriginal) => ({
  ...await importOriginal<typeof import('./lib/site-maintenance')>(),
  get SITE_MAINTENANCE_ENABLED() { return mocks.maintenanceEnabled },
}))
import { config, proxy } from './proxy'

describe('maintenance gate', () => {
  beforeEach(() => {
    mocks.maintenanceEnabled = true
    mocks.updateSession.mockReset()
  })
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

describe('reactivated site', () => {
  beforeEach(() => {
    mocks.maintenanceEnabled = false
    mocks.updateSession.mockReset().mockResolvedValue(NextResponse.next())
  })
  it.each(['/', '/noticias', '/estadisticas', '/login', '/api/mvp'])('restores normal session handling on %s', async (pathname) => {
    const request = new NextRequest(`https://lab.test${pathname}`)
    const response = await proxy(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-pathname')).toBe(pathname)
    expect(mocks.updateSession).toHaveBeenCalledWith(request)
    expect(response.headers.has('retry-after')).toBe(false)
  })
  it.each(['/favicon.ico', '/clubes/galeria/daom/foto-001.jpg', '/_next/static/test.js', '/_next/image'])('restores static-asset pass-through on %s', async (pathname) => {
    const response = await proxy(new NextRequest(`https://lab.test${pathname}`))
    expect(response.status).toBe(200)
    expect(mocks.updateSession).not.toHaveBeenCalled()
  })
  it('preserves access-control redirects instead of opening the admin panel', async () => {
    mocks.updateSession.mockResolvedValue(NextResponse.redirect('https://lab.test/login'))
    const response = await proxy(new NextRequest('https://lab.test/admin'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://lab.test/login')
  })
  it('preserves cross-site mutation protection', async () => {
    const request = new NextRequest('https://lab.test/api/admin/ballclubz', {
      method: 'POST', headers: { origin: 'https://other.test' },
    })
    const response = await proxy(request)
    expect(response.status).toBe(403)
    expect(mocks.updateSession).not.toHaveBeenCalled()
  })
})
