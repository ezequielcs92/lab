export const PUBLIC_SITE_URL = 'https://www.ligaargentinabeisbol.com'

// Public links must never inherit a development origin from deployment settings.
export function getPublicSiteUrl(configured?: string): string {
  try {
    const url = new URL(configured?.trim() || PUBLIC_SITE_URL)
    const hostname = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password ||
        hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') ||
        hostname === '[::1]' || hostname === '0.0.0.0' || hostname.startsWith('127.')) {
      return PUBLIC_SITE_URL
    }
    return url.origin
  } catch {
    return PUBLIC_SITE_URL
  }
}

export function getNewsUrl(slug: string, configured?: string): string {
  return `${getPublicSiteUrl(configured)}/noticias/${encodeURIComponent(slug)}`
}
