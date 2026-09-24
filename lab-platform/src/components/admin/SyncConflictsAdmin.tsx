'use client'

import { useState } from 'react'
import type { Json, SyncConflicto } from '@/lib/database.types'

interface Props {
  conflicts: SyncConflicto[]
}

export default function SyncConflictsAdmin({ conflicts: initialConflicts }: Props) {
  const [conflicts, setConflicts] = useState(initialConflicts)
  const [error, setError] = useState<string | null>(null)

  async function resolve(id: string, estado: 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido') {
    setError(null)
    const response = await fetch(`/api/admin/sheets/conflicts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) {
      setError(result.error ?? 'No se pudo resolver el conflicto')
      return
    }
    setConflicts((current) => current.map((conflict) => conflict.id === id ? { ...conflict, estado } : conflict))
  }

  const pending = conflicts.filter((conflict) => conflict.estado === 'pendiente')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl tracking-widest text-lab-white">SINCRONIZACIÓN</h1>
        <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
          Conflictos de Google Sheets · {pending.length} pendientes
        </p>
      </div>
      {error && <p className="rounded border border-lab-red/50 bg-lab-red/10 p-3 font-condensed text-sm text-lab-red-light">{error}</p>}
      {conflicts.length === 0 ? (
        <div className="rounded-lg border border-lab-border bg-lab-surface p-8 text-center font-condensed text-lab-muted">
          No hay conflictos para revisar.
        </div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} onResolve={resolve} />
          ))}
        </div>
      )}
    </div>
  )
}

function ConflictCard({
  conflict,
  onResolve,
}: {
  conflict: SyncConflicto
  onResolve: (id: string, estado: 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido') => void
}) {
  const pending = conflict.estado === 'pendiente'
  return (
    <article className="rounded-lg border border-lab-border bg-lab-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <p className="font-condensed text-xs uppercase tracking-widest text-lab-gold">{conflict.entidad}</p>
          <h2 className="font-condensed text-base text-lab-white mt-1">{conflict.clave_externa}</h2>
        </div>
        <span className="font-condensed text-xs uppercase tracking-wider text-lab-muted">{conflict.estado}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Payload label="Versión LAB" value={conflict.lab_payload} />
        <Payload label="Versión externa" value={conflict.external_payload} />
      </div>
      {pending && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => onResolve(conflict.id, 'usar_lab')} className="rounded border border-lab-border px-3 py-2 font-condensed text-xs text-lab-white">CONSERVAR LAB</button>
          <button onClick={() => onResolve(conflict.id, 'usar_externo')} className="rounded bg-lab-gold px-3 py-2 font-condensed text-xs font-bold text-lab-accent-fg">USAR SHEETS</button>
          <button onClick={() => onResolve(conflict.id, 'fusionado')} className="rounded border border-lab-border px-3 py-2 font-condensed text-xs text-lab-white">MARCAR FUSIONADO</button>
          <button onClick={() => onResolve(conflict.id, 'omitido')} className="rounded border border-lab-border px-3 py-2 font-condensed text-xs text-lab-muted">OMITIR</button>
        </div>
      )}
    </article>
  )
}

function Payload({ label, value }: { label: string; value: Json | null }) {
  return (
    <div className="rounded border border-lab-border/60 bg-lab-dark p-3">
      <p className="font-condensed text-[10px] uppercase tracking-widest text-lab-muted mb-2">{label}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-lab-gray">{value ? JSON.stringify(value, null, 2) : 'Sin datos registrados'}</pre>
    </div>
  )
}
