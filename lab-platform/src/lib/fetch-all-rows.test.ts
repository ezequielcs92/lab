import { describe, expect, it } from 'vitest'
import { fetchAllRows } from './fetch-all-rows'

function source(total: number) {
  const calls: Array<[number, number]> = []
  const page = async (from: number, to: number) => {
    calls.push([from, to])
    const data = Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, index) => from + index)
    return { data, error: null }
  }
  return { page, calls }
}

describe('fetchAllRows', () => {
  it('keeps asking until a page comes back short', async () => {
    const { page, calls } = source(2500)
    const result = await fetchAllRows(page, 1000)
    expect(result.data).toHaveLength(2500)
    expect(result.data[2499]).toBe(2499)
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('needs one extra empty request when the total is an exact multiple of the page size', async () => {
    const { page, calls } = source(2000)
    const result = await fetchAllRows(page, 1000)
    expect(result.data).toHaveLength(2000)
    expect(calls).toHaveLength(3)
  })

  it('returns what it has read together with the error', async () => {
    const result = await fetchAllRows(async (from) => (
      from === 0 ? { data: [1, 2], error: null } : { data: null, error: { message: 'boom' } }
    ), 2)
    expect(result).toEqual({ data: [1, 2], error: { message: 'boom' } })
  })
})
