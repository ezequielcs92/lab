import { describe, expect, it } from 'vitest'
import { getNewsUrl, getPublicSiteUrl, PUBLIC_SITE_URL } from './site-url'

describe('public site links', () => {
  it.each([undefined, '', 'invalid', 'http://localhost:3000', 'https://localhost:3000', 'https://127.0.0.1', 'https://[::1]', 'javascript:alert(1)'])('uses the official origin instead of %s', (value) => {
    expect(getPublicSiteUrl(value)).toBe(PUBLIC_SITE_URL)
  })
  it('normalizes a valid public origin without leaking query or path', () => {
    expect(getPublicSiteUrl(`${PUBLIC_SITE_URL}/wrong/path?test=1`)).toBe(PUBLIC_SITE_URL)
  })
  it('builds a public article URL even if deployment is configured as localhost', () => {
    expect(getNewsUrl('noticia-de-prueba', 'http://localhost:3000')).toBe(`${PUBLIC_SITE_URL}/noticias/noticia-de-prueba`)
    expect(getNewsUrl('slug/with?characters')).toBe(`${PUBLIC_SITE_URL}/noticias/slug%2Fwith%3Fcharacters`)
  })
})
