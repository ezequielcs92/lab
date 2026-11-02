import { describe, expect, it } from 'vitest'
import { formatMano } from './constants'

describe('formatMano', () => {
  it('capitalizes the stored value', () => {
    expect(formatMano('derecha')).toBe('Derecha')
    expect(formatMano('izquierda')).toBe('Izquierda')
    expect(formatMano('ambas')).toBe('Ambas')
  })

  it('tolerates casing, unknown values and empty input', () => {
    expect(formatMano('IZQUIERDA')).toBe('Izquierda')
    expect(formatMano('switch')).toBe('Switch')
    expect(formatMano('')).toBeNull()
    expect(formatMano(null)).toBeNull()
  })
})
