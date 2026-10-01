import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn(), readSheet: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('@/lib/google-sheets', () => ({ readSheet: mocks.readSheet, SHEET_HEADERS: {} }))
import { POST } from './route'

function session(role: string | null, authenticated = true, lote: Record<string, unknown> | null = null, conflicts: unknown[] = []) {
  mocks.from.mockImplementation((table: string) => {
    const data = table === 'perfiles' ? (role ? { rol: role } : null) : table === 'import_lotes' ? lote : conflicts
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data, error: null }), then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) }
    return query
  })
  mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: authenticated ? { id: 'user' } : null } }) }, from: mocks.from, rpc: mocks.rpc })
}
const request = (body: object = { lote_id: 'batch' }) => new Request('https://lab.test/api/admin/sheets/apply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('Sheets apply route integration (mocked database and Sheets)', () => {
  beforeEach(() => vi.clearAllMocks())
  it('rejects anonymous callers without reading Sheets', async () => {
    session(null, false)
    expect((await POST(request())).status).toBe(401)
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.readSheet).not.toHaveBeenCalled()
  })
  it.each(['usuario', 'editor_club', 'editor_blog', 'fotografo', null])('rejects role %s without calling apply RPC', async (role) => {
    session(role)
    expect((await POST(request())).status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('requires a batch ID', async () => {
    session('admin_liga')
    expect((await POST(request({}))).status).toBe(400)
    expect(mocks.from).toHaveBeenCalledTimes(1)
  })
  it('returns 404 for missing batch', async () => {
    session('admin_liga')
    expect((await POST(request())).status).toBe(404)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('rejects a batch from another source', async () => {
    session('admin_liga', true, { fuente: 'ballclubz' })
    expect((await POST(request())).status).toBe(409)
    expect(mocks.readSheet).not.toHaveBeenCalled()
  })
  it.each(['bloqueado', 'fallido', 'aplicando'])('rejects state %s', async (estado) => {
    session('admin_liga', true, { fuente: 'google_sheets', estado })
    expect((await POST(request())).status).toBe(409)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('returns idempotent result for an already applied batch without writing', async () => {
    session('admin_liga', true, { fuente: 'google_sheets', estado: 'aplicado', resumen: { appliedRows: 12 } })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ idempotent: true, appliedRows: 12 })
    expect(mocks.readSheet).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('blocks unresolved conflicts before accessing external rows', async () => {
    session('admin_liga', true, { id: 'batch', fuente: 'google_sheets', estado: 'preview' }, [{ estado: 'pendiente' }])
    const response = await POST(request())
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ pending: 1 })
    expect(mocks.readSheet).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
