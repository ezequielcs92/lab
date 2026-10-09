import { describe, expect, it } from 'vitest'
import { createMaintenanceResponse, SITE_MAINTENANCE_ENABLED } from './site-maintenance'

describe('full site maintenance response', () => {
  it('is disabled for the authorized reactivation', () => {
    expect(SITE_MAINTENANCE_ENABLED).toBe(false)
  })
  it('returns a non-cacheable temporary unavailable page without external assets', async () => {
    const response = createMaintenanceResponse()
    expect(response.status).toBe(503)
    expect(response.headers.get('retry-after')).toBe('3600')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(response.headers.get('content-type')).toContain('text/html')
    const html = await response.text()
    expect(html).toContain('Sitio en mantenimiento')
    expect(html).not.toMatch(/<script|<link|<img|impago|deuda|pagaron/i)
  })
  it('returns headers without a body for HEAD', async () => {
    const response = createMaintenanceResponse('HEAD')
    expect(response.status).toBe(503)
    expect(await response.text()).toBe('')
  })
})
