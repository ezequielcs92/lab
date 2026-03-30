'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Partido, Club, EstadoPartido } from '@/lib/database.types'
import { ESTADO_LABELS } from '@/lib/constants'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check } from 'lucide-react'

interface Props {
  partidos: (Partido & {
    local: Pick<Club, 'nombre' | 'nombre_corto'>
    visitante: Pick<Club, 'nombre' | 'nombre_corto'>
  })[]
  clubes: Pick<Club, 'id' | 'nombre' | 'nombre_corto'>[]
  temporadaId: string | null
}

const ESTADOS: EstadoPartido[] = ['programado', 'en_curso', 'finalizado', 'suspendido', 'cancelado']

export default function PartidosAdmin({ partidos: initial, clubes, temporadaId }: Props) {
  const [partidos, setPartidos] = useState(initial)
  const [editing, setEditing] = useState<Partido | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function close() { setCreating(false); setEditing(null); setError(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setSuccess(null)

    const fd = new FormData(e.currentTarget)
    const local_id = fd.get('local_id') as string
    const visitante_id = fd.get('visitante_id') as string
    const fecha_hora = fd.get('fecha_hora') as string
    const estado = fd.get('estado') as EstadoPartido
    const estadio = (fd.get('estadio') as string).trim() || null
    const fecha_numero = fd.get('fecha_numero') ? Number(fd.get('fecha_numero')) : null
    const marcador_local = fd.get('marcador_local') !== '' ? Number(fd.get('marcador_local')) : null
    const marcador_visitante = fd.get('marcador_visitante') !== '' ? Number(fd.get('marcador_visitante')) : null
    const resumen = (fd.get('resumen') as string).trim() || null

    if (!local_id || !visitante_id || !fecha_hora) {
      setError('Local, visitante y fecha son requeridos')
      return
    }
    if (local_id === visitante_id) {
      setError('Un equipo no puede jugar contra sí mismo')
      return
    }

    const payload = {
      local_id, visitante_id, fecha_hora, estado, estadio, fecha_numero,
      marcador_local, marcador_visitante, resumen,
      temporada_id: temporadaId!,
      streaming_url: null, mvp_jugador_id: null,
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('partidos').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setSuccess('Partido actualizado')
    } else {
      const { error: err } = await supabase.from('partidos').insert(payload)
      if (err) { setError(err.message); return }
      setSuccess('Partido creado')
    }

    startTransition(() => router.refresh())
    close()
    const { data } = await supabase
      .from('partidos')
      .select('*, local:clubes!partidos_local_id_fkey(nombre, nombre_corto), visitante:clubes!partidos_visitante_id_fkey(nombre, nombre_corto)')
      .order('fecha_hora', { ascending: false })
    if (data) setPartidos(data as any)
  }

  async function handleDelete(p: Partido) {
    if (!confirm('¿Eliminar este partido?')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('partidos').delete().eq('id', p.id)
    if (err) { setError(err.message); return }
    setPartidos((prev) => prev.filter((x) => x.id !== p.id))
    setSuccess('Partido eliminado')
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing
  const estadoColor: Record<EstadoPartido, string> = {
    programado: 'bg-sky-400/10 text-sky-400',
    en_curso: 'bg-lab-red/20 text-lab-red-light',
    finalizado: 'bg-emerald-400/10 text-emerald-400',
    suspendido: 'bg-amber-400/10 text-amber-400',
    cancelado: 'bg-lab-muted/10 text-lab-muted',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">PARTIDOS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {partidos.length} partido{partidos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setCreating(true); setError(null); setSuccess(null) }}
          disabled={!temporadaId}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> NUEVO PARTIDO
        </button>
      </div>

      {!temporadaId && (
        <div className="bg-amber-400/10 border border-amber-400/30 rounded-lg px-4 py-2.5 mb-4 text-amber-400 text-sm font-condensed tracking-wider">
          Necesitás crear una temporada activa antes de agregar partidos.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg px-4 py-2.5 mb-4 text-lab-red text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-4 py-2.5 mb-4 text-emerald-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Scoreboard-style table */}
      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">F#</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Encuentro</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase text-center">Score</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Estado</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {partidos.map((p: any) => (
                <tr key={p.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-2.5 hidden md:table-cell font-display text-lg text-lab-gold/40">{p.fecha_numero ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">
                      {p.local?.nombre_corto ?? 'LOC'} <span className="text-lab-muted font-normal">vs</span> {p.visitante?.nombre_corto ?? 'VIS'}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="font-display text-lg tracking-wider text-lab-white">
                      {p.marcador_local ?? '-'} <span className="text-lab-muted">:</span> {p.marcador_visitante ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-condensed text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded ${estadoColor[p.estado as EstadoPartido]}`}>
                      {ESTADO_LABELS[p.estado as EstadoPartido]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-[11px] text-lab-muted">
                    {new Date(p.fecha_hora).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setCreating(false); setEditing(p); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {partidos.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">Sin partidos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-16 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-lg p-6 relative mb-20">
            <button onClick={close} className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR PARTIDO' : 'NUEVO PARTIDO'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Local *</label>
                  <select name="local_id" defaultValue={editing?.local_id ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    <option value="">Seleccionar...</option>
                    {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre_corto ?? c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Visitante *</label>
                  <select name="visitante_id" defaultValue={editing?.visitante_id ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    <option value="">Seleccionar...</option>
                    {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre_corto ?? c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha y hora *" name="fecha_hora" type="datetime-local" defaultValue={editing?.fecha_hora ? editing.fecha_hora.slice(0, 16) : ''} />
                <Field label="Fecha (#)" name="fecha_numero" type="number" defaultValue={editing?.fecha_numero ?? ''} />
              </div>
              <Field label="Estadio" name="estadio" defaultValue={editing?.estadio ?? ''} />
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Estado</label>
                <select name="estado" defaultValue={editing?.estado ?? 'programado'} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                  {ESTADOS.map((e) => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Marcador Local" name="marcador_local" type="number" defaultValue={editing?.marcador_local ?? ''} />
                <Field label="Marcador Visitante" name="marcador_visitante" type="number" defaultValue={editing?.marcador_visitante ?? ''} />
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Resumen</label>
                <textarea name="resumen" rows={3} defaultValue={editing?.resumen ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR' : 'CREAR PARTIDO'}
                </button>
                <button type="button" onClick={close} className="px-4 py-2.5 font-condensed text-sm tracking-wider text-lab-muted hover:text-lab-white border border-lab-border rounded-lg transition-colors">CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, name, type = 'text', defaultValue = '' }: { label: string; name: string; type?: string; defaultValue?: string | number | null }) {
  return (
    <div>
      <label htmlFor={name} className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors" />
    </div>
  )
}
