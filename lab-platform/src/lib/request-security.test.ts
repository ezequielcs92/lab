import { describe, expect, it } from 'vitest'
import { isCrossSiteMutation } from './request-security'

describe('isCrossSiteMutation', () => {
  it('allows safe methods', () => {
    const request = new Request('https://lab.example/api/data', {
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    })

    expect(isCrossSiteMutation(request)).toBe(false)
  })

  it('allows same-origin mutations', () => {
    const request = new Request('https://lab.example/api/data', {
      method: 'POST',
      headers: { origin: 'https://lab.example', 'sec-fetch-site': 'same-origin' },
    })

    expect(isCrossSiteMutation(request)).toBe(false)
  })

  it('blocks cross-site mutations', () => {
    const request = new Request('https://lab.example/api/data', {
      method: 'DELETE',
      headers: { origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    })

    expect(isCrossSiteMutation(request)).toBe(true)
  })

  it('allows non-browser requests without origin metadata', () => {
    const request = new Request('https://lab.example/api/data', { method: 'PATCH' })

    expect(isCrossSiteMutation(request)).toBe(false)
  })
})
