import { describe, expect, it } from 'vitest'
import { dateTimeLocalToIso, isoToDateTimeLocal } from './date-time'

describe('date-time', () => {
  it('converts an Argentine local time to UTC without shifting the wall clock', () => {
    expect(dateTimeLocalToIso('2026-10-31T18:00')).toBe('2026-10-31T21:00:00.000Z')
  })

  it('converts stored UTC back to an Argentine datetime-local value', () => {
    expect(isoToDateTimeLocal('2026-10-31T21:00:00.000Z')).toBe('2026-10-31T18:00')
  })
})
