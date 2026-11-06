import { describe, expect, it } from 'vitest'
import { decodeSlug } from './route-slug'

describe('decodeSlug', () => {
  it('turns the encoded slug back into the one stored in the database', () => {
    expect(decodeSlug('Andr%C3%A9s-Vivas-Espinoza')).toBe('Andrés-Vivas-Espinoza')
    expect(decodeSlug('Antonio-Martinez-Nu%C3%B1ez-2018')).toBe('Antonio-Martinez-Nuñez-2018')
    expect(decodeSlug('Joaco%20Bruno')).toBe('Joaco Bruno')
  })

  it('leaves plain and malformed slugs as they are', () => {
    expect(decodeSlug('martin-velardez')).toBe('martin-velardez')
    expect(decodeSlug('bad%E0%A4%A')).toBe('bad%E0%A4%A')
  })
})
