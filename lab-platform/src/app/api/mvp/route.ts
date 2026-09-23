import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getRequestFingerprint,
  hashVoteIdentity,
  isUuid,
  normalizeRpcSummary,
  parseVotePayload,
  type MvpVoteRpcPayload,
  type MvpVoteSummary,
} from '@/lib/mvp-voting'

const VISITOR_COOKIE = 'lab_mvp_visitor'
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365

type VoteStatus = 'ok' | 'already_voted' | 'not_votable' | 'invalid_player'

interface GatewayResult {
  data: MvpVoteRpcPayload | null
  error: { message: string } | null
}

export interface MvpVotingGateway {
  getSummary(input: { partidoId: string; visitorHash: string; ipHash: string }): Promise<GatewayResult>
  castVote(input: { partidoId: string; jugadorId: string; visitorHash: string; ipHash: string }): Promise<GatewayResult>
}

interface HandlerOptions {
  secret: string | undefined
  randomId?: () => string
}

function jsonResponse(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function withVisitorCookie(response: NextResponse, visitorId: string, shouldSet: boolean) {
  if (shouldSet) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VISITOR_MAX_AGE,
    })
  }
  return response
}

function publicSummary(summary: MvpVoteSummary) {
  return { counts: summary.counts, hasVoted: summary.hasVoted, votable: summary.votable }
}

export function createMvpVotingHandlers(gateway: MvpVotingGateway, options: HandlerOptions) {
  function getIdentity(request: NextRequest) {
    const existingId = request.cookies.get(VISITOR_COOKIE)?.value
    const visitorId = isUuid(existingId) ? existingId : (options.randomId ?? randomUUID)()
    return {
      visitorId,
      shouldSetCookie: visitorId !== existingId,
      visitorHash: hashVoteIdentity(options.secret!, 'visitor', visitorId),
      ipHash: hashVoteIdentity(options.secret!, 'fingerprint', getRequestFingerprint(request)),
    }
  }

  async function get(request: NextRequest) {
    const partidoId = request.nextUrl.searchParams.get('partido_id')
    if (!isUuid(partidoId)) return jsonResponse({ error: 'Solicitud inválida' }, 400)
    if (!options.secret) {
      console.error('[mvp-voting] Missing server configuration')
      return jsonResponse({ error: 'Servicio no disponible' }, 503)
    }

    const identity = getIdentity(request)
    const result = await gateway.getSummary({ partidoId, ...identity })
    const summary = normalizeRpcSummary(result.data)
    if (result.error || !summary) {
      console.error('[mvp-voting] Failed to load aggregate summary')
      return jsonResponse({ error: 'No se pudo cargar la votación' }, 500)
    }

    return withVisitorCookie(jsonResponse(publicSummary(summary)), identity.visitorId, identity.shouldSetCookie)
  }

  async function post(request: NextRequest) {
    if (!options.secret) {
      console.error('[mvp-voting] Missing server configuration')
      return jsonResponse({ error: 'Servicio no disponible' }, 503)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Solicitud inválida' }, 400)
    }
    const payload = parseVotePayload(body)
    if (!payload) return jsonResponse({ error: 'Solicitud inválida' }, 400)

    const identity = getIdentity(request)
    const result = await gateway.castVote({ ...payload, ...identity })
    if (result.error || !result.data) {
      console.error('[mvp-voting] Failed to cast vote')
      return jsonResponse({ error: 'No se pudo registrar el voto' }, 500)
    }

    const status = result.data.status as VoteStatus | undefined
    const summary = normalizeRpcSummary(result.data)
    let response: NextResponse
    if (status === 'already_voted') {
      response = jsonResponse({ error: 'Ya has votado en este partido', ...(summary ? publicSummary(summary) : {}) }, 409)
    } else if (status === 'not_votable') {
      response = jsonResponse({ error: 'La votación no está disponible' }, 409)
    } else if (status === 'invalid_player') {
      response = jsonResponse({ error: 'No se pudo registrar el voto' }, 400)
    } else if (status === 'ok' && summary) {
      response = jsonResponse(publicSummary(summary))
    } else {
      console.error('[mvp-voting] Invalid database response')
      response = jsonResponse({ error: 'No se pudo registrar el voto' }, 500)
    }

    return withVisitorCookie(response, identity.visitorId, identity.shouldSetCookie)
  }

  return { get, post }
}

const adminGateway: MvpVotingGateway = {
  async getSummary({ partidoId, visitorHash, ipHash }) {
    const { data, error } = await createAdminClient().rpc('get_mvp_vote_summary', {
      p_partido_id: partidoId,
      p_visitor_hash: visitorHash,
      p_ip_hash: ipHash,
    })
    return { data: data as MvpVoteRpcPayload | null, error }
  },
  async castVote({ partidoId, jugadorId, visitorHash, ipHash }) {
    const { data, error } = await createAdminClient().rpc('cast_mvp_vote', {
      p_partido_id: partidoId,
      p_jugador_id: jugadorId,
      p_visitor_hash: visitorHash,
      p_ip_hash: ipHash,
    })
    return { data: data as MvpVoteRpcPayload | null, error }
  },
}

const handlers = createMvpVotingHandlers(adminGateway, { secret: process.env.MVP_VOTE_HASH_SECRET })

export const GET = handlers.get
export const POST = handlers.post
