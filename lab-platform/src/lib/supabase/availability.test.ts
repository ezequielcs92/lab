import { describe, expect, it } from 'vitest'
import { isUnavailable, throwIfUnavailable } from './availability'

const ok = { error: null, status: 200 }
const noRow = { error: { message: 'JSON object requested, multiple (or no) rows returned' }, status: 406 }
const gatewayTimeout = { error: { message: '<html>504</html>' }, status: 504 }
const noAnswer = { error: { message: 'TimeoutError: aborted' }, status: 0 }

describe('isUnavailable', () => {
  it('treats a normal answer as available', () => {
    expect(isUnavailable(ok)).toBe(false)
  })

  it('treats "no row found" as a normal answer the page can handle', () => {
    expect(isUnavailable(noRow)).toBe(false)
  })

  it('treats a 5xx and a missing answer as unavailable', () => {
    expect(isUnavailable(gatewayTimeout)).toBe(true)
    expect(isUnavailable(noAnswer)).toBe(true)
  })
})

describe('throwIfUnavailable', () => {
  it('stays quiet when every read answered', () => {
    expect(() => throwIfUnavailable(ok, noRow)).not.toThrow()
  })

  it('throws when any read could not be answered', () => {
    expect(() => throwIfUnavailable(ok, gatewayTimeout)).toThrow('Supabase no disponible (504)')
    expect(() => throwIfUnavailable(noAnswer)).toThrow('Supabase no disponible (0)')
  })
})
