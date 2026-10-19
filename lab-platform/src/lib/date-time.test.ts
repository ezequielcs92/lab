import { describe, expect, it } from 'vitest'
import { dateTimeLocalToIso, formatArgentinaDateTime, isoToDateTimeLocal } from './date-time'

describe('date-time', () => {
  it('always displays Argentina time regardless of a caller timezone', () => {
    expect(formatArgentinaDateTime('2026-10-31T13:00:00Z', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })).toBe('10:00')
  })
  it('uses the previous Argentine date across midnight UTC', () => {
    expect(formatArgentinaDateTime('2026-11-01T01:00:00Z', { day: '2-digit', month: '2-digit', year: 'numeric' })).toBe('31/10/2026')
    expect(formatArgentinaDateTime('invalid', { hour: '2-digit' })).toBe('Fecha no disponible')
  })
  it('converts an Argentine local time to UTC without shifting the wall clock', () => {
    expect(dateTimeLocalToIso('2026-10-31T18:00')).toBe('2026-10-31T21:00:00.000Z')
  })

  it('converts stored UTC back to an Argentine datetime-local value', () => {
    expect(isoToDateTimeLocal('2026-10-31T21:00:00.000Z')).toBe('2026-10-31T18:00')
  })
})
