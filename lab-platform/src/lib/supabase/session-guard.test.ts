import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionLookupTimeout, hasAuthCookie, withTimeout } from './session-guard'

describe('hasAuthCookie', () => {
  it('detects the Supabase session cookie and its chunks', () => {
    expect(hasAuthCookie([{ name: 'sb-abc-auth-token' }])).toBe(true)
    expect(hasAuthCookie([{ name: 'sb-abc-auth-token.0' }, { name: 'sb-abc-auth-token.1' }])).toBe(true)
  })

  it('ignores anonymous visitors and unrelated cookies', () => {
    expect(hasAuthCookie([])).toBe(false)
    expect(hasAuthCookie([{ name: 'theme' }, { name: 'sb-abc-other' }])).toBe(false)
  })
})

describe('withTimeout', () => {
  afterEach(() => vi.useRealTimers())

  it('returns the value when the work answers in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok')
  })

  it('rejects with SessionLookupTimeout when the work never answers', async () => {
    vi.useFakeTimers()
    const pending = withTimeout(new Promise<never>(() => {}), 4000)
    const assertion = expect(pending).rejects.toBeInstanceOf(SessionLookupTimeout)
    await vi.advanceTimersByTimeAsync(4000)
    await assertion
  })

  it('passes through a failure of the work itself', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom')
  })
})
