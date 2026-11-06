import { describe, expect, it } from 'vitest'
import { isBotUserAgent, trackedPath } from './page-views'

describe('trackedPath', () => {
  it('counts public pages without query string, hash or trailing slash', () => {
    expect(trackedPath('/')).toBe('/')
    expect(trackedPath('/noticias/final-2026/?utm=x#top')).toBe('/noticias/final-2026')
    expect(trackedPath('/estadisticas?tipo=bateo')).toBe('/estadisticas')
  })

  it('ignores the admin, the API, the login and the private profile', () => {
    for (const path of ['/admin', '/admin/jugadores', '/api/track', '/login', '/auth/callback', '/perfil', '/_next/static/x.js']) {
      expect(trackedPath(path)).toBeNull()
    }
    expect(trackedPath('/administracion-club')).toBe('/administracion-club')
  })

  it('rejects values that are not a clean path', () => {
    expect(trackedPath(undefined)).toBeNull()
    expect(trackedPath('noticias')).toBeNull()
    expect(trackedPath('/a b')).toBeNull()
    expect(trackedPath(`/${'a'.repeat(250)}`)).toBeNull()
  })
})

describe('isBotUserAgent', () => {
  it('ignores crawlers, link previews and clients without a user agent', () => {
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent('Googlebot/2.1')).toBe(true)
    expect(isBotUserAgent('WhatsApp/2.23')).toBe(true)
    expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36')).toBe(false)
  })
})
