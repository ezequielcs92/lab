import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { createMvpVotingHandlers, type MvpVotingGateway } from './route'

const partidoId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const jugadorId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const counts = { [jugadorId]: 1 }

function request(method: 'GET' | 'POST', cookie?: string) {
  return new NextRequest(`http://localhost/api/mvp?partido_id=${partidoId}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'user-agent': 'vitest-browser',
      'x-forwarded-for': '203.0.113.10',
      ...(cookie ? { cookie } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify({ partido_id: partidoId, jugador_id: jugadorId }) } : {}),
  })
}

function gatewayWithStatus(status: string): MvpVotingGateway {
  return {
    async getSummary() {
      return { data: { counts, has_voted: false, votable: true }, error: null }
    },
    async castVote() {
      return { data: { status, counts, has_voted: status !== 'not_votable' && status !== 'invalid_player', votable: status !== 'not_votable' }, error: null }
    },
  }
}

describe('MVP voting API handler', () => {
  it.each([
    ['not_votable', 409, 'La votación no está disponible'],
    ['invalid_player', 400, 'No se pudo registrar el voto'],
  ])('rejects %s votes with a generic public error', async (status, expectedStatus, expectedError) => {
    const handlers = createMvpVotingHandlers(gatewayWithStatus(status), {
      secret: 'test-secret',
      randomId: () => 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    })
    const response = await handlers.post(request('POST'))
    expect(response.status).toBe(expectedStatus)
    expect(await response.json()).toEqual({ error: expectedError })
  })

  it('uses the HttpOnly cookie and IP/UA fingerprint to reject a repeated vote', async () => {
    const seenVisitors = new Set<string>()
    const seenFingerprints = new Set<string>()
    const gateway: MvpVotingGateway = {
      async getSummary() {
        return { data: { counts: {}, has_voted: false, votable: true }, error: null }
      },
      async castVote({ visitorHash, ipHash }) {
        const repeated = seenVisitors.has(visitorHash) || seenFingerprints.has(ipHash)
        seenVisitors.add(visitorHash)
        seenFingerprints.add(ipHash)
        return {
          data: {
            status: repeated ? 'already_voted' : 'ok',
            counts,
            has_voted: true,
            votable: true,
          },
          error: null,
        }
      },
    }
    const handlers = createMvpVotingHandlers(gateway, {
      secret: 'test-secret',
      randomId: () => 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    })

    const first = await handlers.post(request('POST'))
    const setCookie = first.headers.get('set-cookie')
    expect(first.status).toBe(200)
    expect(setCookie).toContain('lab_mvp_visitor=')
    expect(setCookie).toContain('HttpOnly')

    const cookie = setCookie!.split(';')[0]
    const repeated = await handlers.post(request('POST', cookie))
    expect(repeated.status).toBe(409)
    expect((await repeated.json()).error).toBe('Ya has votado en este partido')

    const differentCookieSameFingerprint = await handlers.post(
      request('POST', 'lab_mvp_visitor=dddddddd-dddd-dddd-dddd-dddddddddddd')
    )
    expect(differentCookieSameFingerprint.status).toBe(409)
  })

  it('returns only aggregate counts and voting state', async () => {
    const handlers = createMvpVotingHandlers(gatewayWithStatus('ok'), {
      secret: 'test-secret',
      randomId: () => 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    })
    const response = await handlers.get(request('GET'))
    expect(await response.json()).toEqual({ counts, hasVoted: false, votable: true })
  })
})
