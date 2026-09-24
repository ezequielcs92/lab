import { createHmac } from 'node:crypto'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VOTING_WINDOW_MS = 24 * 60 * 60 * 1000

export type MvpVoteCounts = Record<string, number>

export interface MvpVoteSummary {
  counts: MvpVoteCounts
  hasVoted: boolean
  votable: boolean
}

export interface MvpVoteRpcPayload {
  counts?: unknown
  has_voted?: unknown
  votable?: unknown
  status?: unknown
}

export interface VotableMatch {
  estado: string
  fecha_hora: string
  finalizado_at: string | null
  temporada_id: string
  local_id: string
  visitante_id: string
}

export interface EligiblePlayer {
  club_id: string
  temporada_id: string | null
  activo: boolean
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function parseVotePayload(value: unknown): { partidoId: string; jugadorId: string } | null {
  if (!value || typeof value !== 'object') return null
  const payload = value as Record<string, unknown>
  if (!isUuid(payload.partido_id) || !isUuid(payload.jugador_id)) return null
  return { partidoId: payload.partido_id, jugadorId: payload.jugador_id }
}

export function isMatchVotable(match: VotableMatch, now = new Date()): boolean {
  if (match.estado !== 'finalizado') return false
  const finishedAt = new Date(match.finalizado_at ?? match.fecha_hora).getTime()
  const currentTime = now.getTime()
  return Number.isFinite(finishedAt) && currentTime >= finishedAt && currentTime < finishedAt + VOTING_WINDOW_MS
}

export function isPlayerEligible(match: VotableMatch, player: EligiblePlayer): boolean {
  return player.activo
    && player.temporada_id === match.temporada_id
    && (player.club_id === match.local_id || player.club_id === match.visitante_id)
}

export function hashVoteIdentity(secret: string, namespace: 'visitor' | 'fingerprint', value: string): string {
  return createHmac('sha256', secret).update(`${namespace}\0${value}`).digest('hex')
}

export function getRequestFingerprint(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwardedFor || request.headers.get('x-real-ip')?.trim() || 'unknown'
  const userAgent = request.headers.get('user-agent')?.slice(0, 512) || 'unknown'
  return `${ip}\0${userAgent}`
}

export function normalizeRpcSummary(value: unknown): MvpVoteSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const payload = value as MvpVoteRpcPayload
  if (typeof payload.has_voted !== 'boolean' || typeof payload.votable !== 'boolean') return null
  if (!payload.counts || typeof payload.counts !== 'object' || Array.isArray(payload.counts)) return null

  const counts: MvpVoteCounts = {}
  for (const [playerId, count] of Object.entries(payload.counts as Record<string, unknown>)) {
    if (!isUuid(playerId) || typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return null
    counts[playerId] = count
  }

  return { counts, hasVoted: payload.has_voted, votable: payload.votable }
}
