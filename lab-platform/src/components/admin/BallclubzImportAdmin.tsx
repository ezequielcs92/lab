'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from 'lucide-react'
import type { BallclubzGame } from '@/lib/ballclubz'
import type { BallclubzClubRef, BallclubzMappingSuggestions, BallclubzPlayerRef, BallclubzSourcePlayer } from '@/lib/ballclubz-import'

interface PreviewResponse {
  error?: string
  lote: { id: string; estado: string; created_at: string }
  game: BallclubzGame
  season: { id: string; nombre: string }
  clubs: BallclubzClubRef[]
  players: BallclubzPlayerRef[]
  sourcePlayers: BallclubzSourcePlayer[]
  suggestions: BallclubzMappingSuggestions
  existingGame: { id: string; estado: string; updated_at: string } | null
}

export default function BallclubzImportAdmin() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [mappings, setMappings] = useState<BallclubzMappingSuggestions>({ clubs: {}, players: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedGameId, setAppliedGameId] = useState<string | null>(null)

  const unresolved = useMemo(() => {
    if (!preview) return 0
    const clubs = [preview.game.visitor, preview.game.home].filter((team) => !mappings.clubs[team.sourceKey]).length
    const players = preview.sourcePlayers.filter((player) => !mappings.players[player.sourceKey]).length
    return clubs + players
  }, [mappings, preview])

  async function previewFile() {
    if (!file) return
    setLoading(true)
    setError(null)
    setAppliedGameId(null)
    try {
      const body = new FormData()
      body.set('mode', 'preview')
      body.set('file', file)
      const response = await fetch('/api/admin/ballclubz', { method: 'POST', body })
      const result = await response.json() as PreviewResponse
      if (!response.ok) throw new Error(result.error ?? 'No se pudo analizar el archivo')
      setPreview(result)
      setMappings(result.suggestions)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo analizar el archivo')
    } finally {
      setLoading(false)
    }
  }

  async function applyImport() {
    if (!file || !preview || unresolved > 0) return
    setLoading(true)
    setError(null)
    try {
      const body = new FormData()
      body.set('mode', 'apply')
      body.set('file', file)
      body.set('lote_id', preview.lote.id)
      body.set('mappings', JSON.stringify(mappings))
      const response = await fetch('/api/admin/ballclubz', { method: 'POST', body })
      const result = await response.json() as { error?: string; errors?: string[]; partidoId?: string }
      if (!response.ok) throw new Error(result.errors?.join(' · ') ?? result.error ?? 'No se pudo importar el partido')
      setAppliedGameId(result.partidoId ?? null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo importar el partido')
    } finally {
      setLoading(false)
    }
  }

  function setClub(teamKey: string, clubId: string) {
    if (!preview) return
    const teamPlayers = new Set(preview.sourcePlayers.filter((player) => player.teamSourceKey === teamKey).map((player) => player.sourceKey))
    setMappings((current) => ({
      clubs: { ...current.clubs, [teamKey]: clubId },
      players: Object.fromEntries(Object.entries(current.players).filter(([key, playerId]) => {
        if (!teamPlayers.has(key)) return true
        return preview.players.some((player) => player.id === playerId && player.club_id === clubId)
      })),
    }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-widest text-lab-white">IMPORTAR BALLCLUBZ</h1>
        <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">Carga segura de box scores HTML por partido</p>
      </div>

      <section className="rounded-lg border border-lab-border bg-lab-surface p-5 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="block font-condensed text-xs uppercase tracking-widest text-lab-muted mb-2">Archivo HTML</span>
            <input
              type="file"
              accept=".html,.htm,text/html"
              onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setAppliedGameId(null) }}
              className="block w-full rounded border border-lab-border bg-lab-dark p-2 text-sm text-lab-gray file:mr-3 file:rounded file:border-0 file:bg-lab-gold file:px-3 file:py-1.5 file:font-condensed file:font-bold file:text-lab-accent-fg"
            />
          </label>
          <button
            type="button"
            onClick={previewFile}
            disabled={!file || loading}
            className="inline-flex items-center justify-center gap-2 rounded bg-lab-gold px-4 py-2.5 font-condensed text-sm font-bold tracking-wider text-lab-accent-fg disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            ANALIZAR HTML
          </button>
        </div>
        <p className="font-condensed text-xs text-lab-muted">Sólo se procesa el texto del box score. El HTML no se muestra ni se ejecuta. Máximo 2 MB.</p>
      </section>

      {error && <p className="rounded border border-lab-red/50 bg-lab-red/10 p-3 font-condensed text-sm text-lab-red-light">{error}</p>}
      {appliedGameId && (
        <div className="flex items-center justify-between gap-3 rounded border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-300">
          <span className="flex items-center gap-2 font-condensed"><CheckCircle2 className="h-5 w-5" /> Partido importado correctamente.</span>
          <Link href={`/fixture/${appliedGameId}`} className="font-condensed text-xs font-bold tracking-wider underline">VER PARTIDO</Link>
        </div>
      )}

      {preview && !appliedGameId && (
        <>
          <GameSummary preview={preview} />
          <ClubMappings preview={preview} mappings={mappings} onChange={setClub} />
          <PlayerMappings preview={preview} mappings={mappings} onChange={(sourceKey, playerId) => setMappings((current) => ({ ...current, players: { ...current.players, [sourceKey]: playerId } }))} />
          <div className="flex items-center justify-between rounded-lg border border-lab-border bg-lab-surface p-5">
            <div>
              <p className="font-condensed text-sm text-lab-white">{unresolved === 0 ? 'Todos los datos están mapeados.' : `${unresolved} mapeos pendientes.`}</p>
              <p className="font-condensed text-xs text-lab-muted">La importación reemplaza las estadísticas anteriores del mismo box score.</p>
            </div>
            <button type="button" onClick={applyImport} disabled={loading || unresolved > 0} className="rounded bg-lab-gold px-5 py-3 font-condensed text-sm font-bold tracking-wider text-lab-accent-fg disabled:opacity-50">
              {loading ? 'IMPORTANDO...' : 'CONFIRMAR IMPORTACIÓN'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GameSummary({ preview }: { preview: PreviewResponse }) {
  const { game } = preview
  return (
    <section className="rounded-lg border border-lab-border bg-lab-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-condensed text-xs uppercase tracking-widest text-lab-gold">{game.competition}</p>
          <h2 className="mt-2 font-display text-2xl tracking-wide text-lab-white">{game.visitor.name} {game.visitor.score} — {game.home.score} {game.home.name}</h2>
          <p className="mt-1 font-condensed text-sm text-lab-muted">{game.date} · {game.startTime ?? 'Hora no informada'} · {game.venue}</p>
          <p className="mt-1 font-mono text-xs text-lab-muted">{game.externalKey}</p>
        </div>
        {preview.existingGame && <span className="rounded border border-amber-400/40 bg-amber-400/10 px-3 py-1 font-condensed text-xs text-amber-300">ACTUALIZA UN PARTIDO EXISTENTE</span>}
      </div>
      {game.warnings.length > 0 && <div className="mt-4 space-y-1">{game.warnings.map((warning) => <p key={warning} className="flex items-center gap-2 font-condensed text-xs text-amber-300"><TriangleAlert className="h-3.5 w-3.5" />{warning}</p>)}</div>}
    </section>
  )
}

function ClubMappings({ preview, mappings, onChange }: { preview: PreviewResponse; mappings: BallclubzMappingSuggestions; onChange: (teamKey: string, clubId: string) => void }) {
  return <section className="rounded-lg border border-lab-border bg-lab-surface p-5"><h2 className="font-display text-xl tracking-wider text-lab-white mb-4">CLUBES</h2><div className="grid gap-4 md:grid-cols-2">{[preview.game.visitor, preview.game.home].map((team) => <label key={team.sourceKey}><span className="block font-condensed text-xs text-lab-muted mb-1">{team.name}</span><select value={mappings.clubs[team.sourceKey] ?? ''} onChange={(event) => onChange(team.sourceKey, event.target.value)} className="w-full rounded border border-lab-border bg-lab-dark p-2 text-sm text-lab-white"><option value="">Seleccionar club...</option>{preview.clubs.map((club) => <option key={club.id} value={club.id}>{club.nombre}</option>)}</select></label>)}</div></section>
}

function PlayerMappings({ preview, mappings, onChange }: { preview: PreviewResponse; mappings: BallclubzMappingSuggestions; onChange: (sourceKey: string, playerId: string) => void }) {
  return <section className="rounded-lg border border-lab-border bg-lab-surface p-5"><h2 className="font-display text-xl tracking-wider text-lab-white mb-4">JUGADORES</h2><div className="grid gap-3 md:grid-cols-2">{preview.sourcePlayers.map((source) => { const clubId = mappings.clubs[source.teamSourceKey]; const options = preview.players.filter((player) => player.club_id === clubId); return <label key={source.sourceKey} className="rounded border border-lab-border/60 bg-lab-dark p-3"><span className="mb-2 flex justify-between gap-2 font-condensed text-sm text-lab-white"><span>{source.name}</span><span className="text-[10px] uppercase tracking-wider text-lab-muted">{source.batting ? 'Bateo' : ''}{source.batting && source.pitching ? ' + ' : ''}{source.pitching ? 'Pitcheo' : ''}</span></span><select value={mappings.players[source.sourceKey] ?? ''} onChange={(event) => onChange(source.sourceKey, event.target.value)} disabled={!clubId} className="w-full rounded border border-lab-border bg-lab-surface p-2 text-xs text-lab-white disabled:opacity-50"><option value="">Seleccionar jugador...</option>{options.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select></label> })}</div></section>
}
