'use client'

import { useEffect, useState } from 'react'
import type { Jugador, PartidoConClubes } from '@/lib/database.types'
import { Star, Check } from 'lucide-react'

interface MVPVotingProps {
  partido: PartidoConClubes
  jugadoresLocal: Jugador[]
  jugadoresVisitante: Jugador[]
}

interface VoteResponse {
  error?: string
  counts?: Record<string, number>
  hasVoted?: boolean
  votable?: boolean
}

export default function MVPVoting({ partido, jugadoresLocal, jugadoresVisitante }: MVPVotingProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [votable, setVotable] = useState(true)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(`/api/mvp?partido_id=${encodeURIComponent(partido.id)}`, {
          cache: 'no-store',
        })
        const data = await response.json() as VoteResponse
        if (cancelled) return
        if (!response.ok || !data.counts) {
          setError(data.error || 'No se pudo cargar la votación')
          return
        }
        setVotes(data.counts)
        setHasVoted(data.hasVoted ?? false)
        setVotable(data.votable ?? false)
        if (data.votable === false) setError('La votación no está disponible')
      } catch {
        if (!cancelled) setError('No se pudo cargar la votación')
      }
    })()

    return () => { cancelled = true }
  }, [partido.id])

  async function handleVote() {
    if (!selectedPlayer || hasVoted || submitting || !votable) return
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/mvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partido_id: partido.id, jugador_id: selectedPlayer }),
      })
      const data = await response.json() as VoteResponse

      if (!response.ok) {
        setError(data.error || 'Error al registrar el voto')
        if (data.counts) setVotes(data.counts)
        if (data.hasVoted) setHasVoted(true)
        if (data.votable === false) setVotable(false)
      } else {
        setVotes(data.counts ?? {})
        setHasVoted(true)
        setVotable(data.votable ?? true)
      }
    } catch {
      setError('Error al registrar el voto')
    } finally {
      setSubmitting(false)
    }
  }

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-lab-surface rounded-xl border border-lab-border overflow-hidden">
      <div className="px-5 py-4 border-b border-lab-border/50 bg-lab-surface-light">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-lab-gold" />
          <h3 className="font-display text-xl tracking-wider text-lab-gold">VOTÁ AL MVP</h3>
        </div>
        <p className="font-condensed text-xs tracking-wider text-lab-muted mt-1">
          {partido.local.nombre_corto} vs {partido.visitante.nombre_corto}
        </p>
      </div>

      <div className="p-5">
        <PlayerGroup
          title={partido.local.nombre_corto || partido.local.nombre}
          primaryColor={partido.local.colores.primario}
          secondaryColor={partido.local.colores.secundario}
          players={jugadoresLocal}
          selectedPlayer={selectedPlayer}
          hasVoted={hasVoted}
          votes={votes}
          totalVotes={totalVotes}
          onSelect={setSelectedPlayer}
        />
        <PlayerGroup
          title={partido.visitante.nombre_corto || partido.visitante.nombre}
          primaryColor={partido.visitante.colores.primario}
          secondaryColor={partido.visitante.colores.secundario}
          players={jugadoresVisitante}
          selectedPlayer={selectedPlayer}
          hasVoted={hasVoted}
          votes={votes}
          totalVotes={totalVotes}
          onSelect={setSelectedPlayer}
        />

        {error && <p className="text-lab-red-light text-sm font-condensed mb-3">{error}</p>}

        {!hasVoted ? (
          <button
            onClick={handleVote}
            disabled={!selectedPlayer || submitting || !votable}
            className="w-full py-3 rounded-lg bg-lab-gold text-lab-accent-fg font-condensed font-bold tracking-wider uppercase hover:bg-lab-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando...' : 'Confirmar Voto'}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 text-green-400 font-condensed tracking-wider">
            <Check className="w-5 h-5" />
            ¡Voto registrado! Gracias por participar.
          </div>
        )}
      </div>
    </div>
  )
}

function PlayerGroup({
  title,
  primaryColor,
  secondaryColor,
  players,
  selectedPlayer,
  hasVoted,
  votes,
  totalVotes,
  onSelect,
}: {
  title: string
  primaryColor: string
  secondaryColor: string
  players: Jugador[]
  selectedPlayer: string | null
  hasVoted: boolean
  votes: Record<string, number>
  totalVotes: number
  onSelect: (id: string) => void
}) {
  return (
    <div className="mb-4">
      <h4
        className="font-condensed text-xs tracking-widest uppercase font-bold mb-2 px-2 py-1 rounded"
        style={{ color: secondaryColor, backgroundColor: `${primaryColor}66` }}
      >
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        {players.map((player) => (
          <PlayerVoteButton
            key={player.id}
            jugador={player}
            selected={selectedPlayer === player.id}
            voted={hasVoted}
            voteCount={votes[player.id] || 0}
            totalVotes={totalVotes}
            onClick={() => !hasVoted && onSelect(player.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PlayerVoteButton({
  jugador,
  selected,
  voted,
  voteCount,
  totalVotes,
  onClick,
}: {
  jugador: Jugador
  selected: boolean
  voted: boolean
  voteCount: number
  totalVotes: number
  onClick: () => void
}) {
  const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0

  return (
    <button
      onClick={onClick}
      disabled={voted}
      className={`relative overflow-hidden text-left px-3 py-2 rounded-md border transition-all font-condensed text-sm tracking-wide
        ${selected ? 'border-lab-gold bg-lab-gold/10 text-lab-white' : 'border-lab-border bg-lab-navy text-lab-gray hover:border-lab-gold/30'}
        ${voted ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      {voted && (
        <div
          className="absolute inset-y-0 left-0 bg-lab-gold/10 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      )}
      <div className="relative flex items-center justify-between">
        <span className="truncate">{jugador.nombre}</span>
        {voted && <span className="text-lab-gold text-xs font-bold ml-1">{pct}%</span>}
      </div>
    </button>
  )
}
