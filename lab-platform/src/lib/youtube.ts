export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')
    let videoId: string | null = null
    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v')
      else if (/^\/(embed|v|shorts|live)\//.test(parsed.pathname)) videoId = parsed.pathname.split('/')[2] ?? null
    }
    return videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null
  } catch {
    return null
  }
}

export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null
}
