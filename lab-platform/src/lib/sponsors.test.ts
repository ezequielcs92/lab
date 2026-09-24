import { describe, expect, it } from 'vitest'
import type { Sponsor } from './database.types'
import { isSponsorActive, safeExternalUrl, safeImageUrl } from './sponsors'

const sponsor = {
  activo: true,
  vigencia_inicio: null,
  vigencia_fin: null,
} as Sponsor
const today = new Date('2026-09-21T12:00:00Z')

describe('sponsors', () => {
  it('honors active state and inclusive validity dates', () => {
    expect(isSponsorActive(sponsor, today)).toBe(true)
    expect(isSponsorActive({ ...sponsor, activo: false }, today)).toBe(false)
    expect(isSponsorActive({ ...sponsor, vigencia_inicio: '2026-09-22' }, today)).toBe(false)
    expect(isSponsorActive({ ...sponsor, vigencia_inicio: '2026-09-21' }, today)).toBe(true)
    expect(isSponsorActive({ ...sponsor, vigencia_fin: '2026-09-20' }, today)).toBe(false)
    expect(isSponsorActive({ ...sponsor, vigencia_fin: '2026-09-21' }, today)).toBe(true)
  })

  it('allows only HTTP links and HTTPS image sources', () => {
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com/')
    expect(safeExternalUrl('mailto:test@example.com')).toBeNull()
    expect(safeImageUrl('http://example.com/logo.png')).toBeNull()
    expect(safeImageUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png')
  })
})
