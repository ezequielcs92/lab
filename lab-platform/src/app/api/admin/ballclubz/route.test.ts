import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
import { POST } from './route'

function session(role: string | null, authenticated = true) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: role ? { rol: role } : null }) }
  mocks.from.mockReturnValue(query)
  mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: authenticated ? { id: 'user' } : null } }) }, from: mocks.from, rpc: mocks.rpc })
}

function request(mode: string, file?: File) {
  const data = new FormData()
  data.set('mode', mode)
  if (file) data.set('file', file)
  return new Request('https://lab.test/api/admin/ballclubz', { method: 'POST', body: data })
}

describe('BallClubz route boundary integration (mocked database)', () => {
  beforeEach(() => vi.clearAllMocks())
  it('rejects anonymous requests before queries or imports', async () => {
    session(null, false)
    expect((await POST(request('preview')))?.status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each(['usuario', 'editor_club', 'editor_blog', 'fotografo', null])('rejects role %s', async (role) => {
    session(role)
    expect((await POST(request('apply')))?.status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each([
    ['unknown', new File(['x'], 'game.html')],
    ['preview', undefined],
    ['preview', new File(['x'], 'game.pdf')],
    ['preview', new File([], 'game.html')],
    ['apply', new File(['x'.repeat(2_000_001)], 'game.html')],
  ])('rejects invalid mode/file before data writes (%s)', async (mode, file) => {
    session('admin_liga')
    expect((await POST(request(mode as string, file as File | undefined)))?.status).toBe(400)
    expect(mocks.from).toHaveBeenCalledTimes(1)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
