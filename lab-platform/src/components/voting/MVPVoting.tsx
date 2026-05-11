'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Jugador, PartidoConClubes } from '@/lib/database.types'
import { Star, Check } from 'lucide-react'

interface MVPVotingProps {
  partido: PartidoConClubes
  jugadoresLocal: Jugador[]
  jugadoresVisitante: Jugador[]
}

export default function MVPVoting({ partido, jugadoresLocal, jugadoresVisitante }: MVPVotingProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [votes, setVotes] = useState<Record<string, number>>({})

  function getSessionId(): string {
    let sid = localStorage.getItem('lab_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('lab_session_id', sid)
    }
    return sid
  }

  async function loadVotes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('votos_mvp')
      .select('jugador_id')
      .eq('partido_id', partido.id)

    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((v) => {
        counts[v.jugador_id] = (counts[v.jugador_id] || 0) + 1
      })
      setVotes(counts)
    }
  }

  // Verificar si ya votó (por session_id en localStorage)
  useEffect(() => {
    const sessionId = getSessionId()
    const voteKey = `mvp_voted_${partido.id}`
    if (localStorage.getItem(voteKey) === sessionId) {
      setHasVoted(true)
    }

    void (async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('votos_mvp')
        .select('jugador_id')
        .eq('partido_id', partido.id)

      if (data) {
        const counts: Record<string, number> = {}
        data.forEach((v) => {
          counts[v.jugador_id] = (counts[v.jugador_id] || 0) + 1
        })
        setVotes(counts)
      }
    })()
  }, [partido.id])

  async function handleVote() {
    if (!selectedPlayer || hasVoted || submitting) return
    setSubmitting(true)
    setError(null)

    const sessionId = getSessionId()
    const supabase = createClient()

    const { error: voteError } = await supabase
      .from('votos_mvp')
      .insert({
        partido_id: partido.id,
        jugador_id: selectedPlayer,
        session_id: sessionId,
      })

    if (voteError) {
      if (voteError.code === '23505') {
        setError('Ya has votado en este partido')
      } else {
        setError('Error al registrar el voto')
      }
    } else {
      localStorage.setItem(`mvp_voted_${partido.id}`, sessionId)
      setHasVoted(true)
      await loadVotes()
    }

    setSubmitting(false)
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
        {/* Local team players */}
        <div className="mb-4">
          <h4
            className="font-condensed text-xs tracking-widest uppercase font-bold mb-2 px-2 py-1 rounded"
            style={{ color: partido.local.colores.secundario, backgroundColor: `${partido.local.colores.primario}66` }}
          >
            {partido.local.nombre_corto || partido.local.nombre}
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {jugadoresLocal.map((j) => (
              <PlayerVoteButton
                key={j.id}
                jugador={j}
                selected={selectedPlayer === j.id}
                voted={hasVoted}
                voteCount={votes[j.id] || 0}
                totalVotes={totalVotes}
                onClick={() => !hasVoted && setSelectedPlayer(j.id)}
              />
            ))}
          </div>
        </div>

        {/* Visitante team players */}
        <div className="mb-4">
          <h4
            className="font-condensed text-xs tracking-widest uppercase font-bold mb-2 px-2 py-1 rounded"
            style={{ color: partido.visitante.colores.secundario, backgroundColor: `${partido.visitante.colores.primario}66` }}
          >
            {partido.visitante.nombre_corto || partido.visitante.nombre}
          </h4>
          <div className="grid grid-cols-2 gap-1.5">
            {jugadoresVisitante.map((j) => (
              <PlayerVoteButton
                key={j.id}
                jugador={j}
                selected={selectedPlayer === j.id}
                voted={hasVoted}
                voteCount={votes[j.id] || 0}
                totalVotes={totalVotes}
                onClick={() => !hasVoted && setSelectedPlayer(j.id)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-lab-red-light text-sm font-condensed mb-3">{error}</p>
        )}

        {!hasVoted ? (
          <button
            onClick={handleVote}
            disabled={!selectedPlayer || submitting}
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
