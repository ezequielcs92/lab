import { describe, expect, it } from 'vitest'
import { extractYouTubeId, getYouTubeWatchUrl, isYouTubeUrl } from './youtube'

const videoId = 'dQw4w9WgXcQ'

describe('YouTube URLs', () => {
  it.each([
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://m.youtube.com/live/${videoId}`,
    `https://youtube.com/shorts/${videoId}`,
  ])('extracts supported URLs: %s', (url) => {
    expect(extractYouTubeId(url)).toBe(videoId)
    expect(isYouTubeUrl(url)).toBe(true)
  })

  it.each(['', 'not-a-url', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=short'])('rejects unsupported URLs: %s', (url) => {
    expect(extractYouTubeId(url)).toBeNull()
  })

  it('creates a canonical external watch URL', () => {
    expect(getYouTubeWatchUrl(videoId)).toBe(`https://www.youtube.com/watch?v=${videoId}`)
  })
})
