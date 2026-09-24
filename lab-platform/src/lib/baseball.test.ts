import { describe, expect, it } from 'vitest'
import {
  baseballInningsToOuts,
  isValidBaseballInnings,
  outsToBaseballInnings,
} from './baseball'

describe('baseball innings', () => {
  it.each([0, 4, 4.1, 4.2, 9.2])('accepts valid baseball notation: %s', (value) => {
    expect(isValidBaseballInnings(value)).toBe(true)
  })

  it.each([-1, 1.3, 4.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid notation: %s', (value) => {
    expect(isValidBaseballInnings(value)).toBe(false)
  })

  it('converts innings and outs without treating IP as decimal innings', () => {
    expect(baseballInningsToOuts(4.2)).toBe(14)
    expect(outsToBaseballInnings(14)).toBe(4.2)
    expect(baseballInningsToOuts(4.3)).toBeNull()
    expect(outsToBaseballInnings(1.5)).toBeNull()
  })
})
