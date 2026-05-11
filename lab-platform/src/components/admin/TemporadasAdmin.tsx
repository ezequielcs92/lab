'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Star } from 'lucide-react'

interface Temporada {
  id: string
  anio: number
  nombre: string
  fecha_inicio: string | null
  fecha_fin: string | null
  activa: boolean
}

interface Props {
  temporadas: Temporada[]
}

export default function TemporadasAdmin({ temporadas: initial }: Props) {
  const [temporadas, setTemporadas] = useState(initial)
  const [editing, setEditing] = useState<Temporada | null>(null)
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
    const anio = Number(fd.get('anio'))
    const nombre = (fd.get('nombre') as string).trim()
    const fecha_inicio = (fd.get('fecha_inicio') as string) || null
    const fecha_fin = (fd.get('fecha_fin') as string) || null
    const activa = fd.get('activa') === 'on'

    if (!anio || !nombre) {
      setError('Año y nombre son requeridos')
      return
    }

    const supabase = createClient()

    // Si se activa esta temporada, desactivar las demás
    if (activa) {
      await supabase.from('temporadas').update({ activa: false }).neq('id', editing?.id ?? '00000000-0000-0000-0000-000000000000')
    }

    const payload = { anio, nombre, fecha_inicio, fecha_fin, activa }

    if (editing) {
      const { error: err } = await supabase.from('temporadas').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setSuccess(`Temporada "${nombre}" actualizada`)
    } else {
      const { error: err } = await supabase.from('temporadas').insert(payload)
      if (err) { setError(err.message); return }
      setSuccess(`Temporada "${nombre}" creada`)
    }

    startTransition(() => router.refresh())
    close()
    const { data } = await supabase.from('temporadas').select('*').order('anio', { ascending: false })
    if (data) setTemporadas(data)
  }

  async function handleDelete(t: Temporada) {
    if (!confirm(`¿Eliminar la temporada "${t.nombre}"? Esto eliminará todos los partidos asociados.`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('temporadas').delete().eq('id', t.id)
    if (err) { setError(err.message); return }
    setTemporadas((prev) => prev.filter((x) => x.id !== t.id))
    setSuccess(`Temporada eliminada`)
    startTransition(() => router.refresh())
  }

  async function handleSetActive(t: Temporada) {
    const supabase = createClient()
    await supabase.from('temporadas').update({ activa: false }).neq('id', t.id)
    await supabase.from('temporadas').update({ activa: true }).eq('id', t.id)
    const { data } = await supabase.from('temporadas').select('*').order('anio', { ascending: false })
    if (data) setTemporadas(data)
    setSuccess(`Temporada "${t.nombre}" activada`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">TEMPORADAS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            Gestión de temporadas — la activa define el fixture y standings
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setCreating(true); setEditing(null); setError(null); setSuccess(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-lab-gold text-lab-accent-fg rounded-md font-condensed font-semibold text-sm tracking-wider uppercase hover:bg-lab-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva temporada
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-md px-4 py-3 mb-4 font-condensed text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md px-4 py-3 mb-4 font-condensed text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-lab-surface border border-lab-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl tracking-widest text-lab-white">
              {editing ? 'EDITAR TEMPORADA' : 'NUEVA TEMPORADA'}
            </h2>
            <button onClick={close} className="p-1.5 rounded-md text-lab-muted hover:text-lab-white hover:bg-lab-surface-light transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-condensed text-xs text-lab-muted tracking-widest uppercase mb-1.5">Año *</label>
              <input
                name="anio"
                type="number"
                min="2017"
                max="2099"
                defaultValue={editing?.anio ?? new Date().getFullYear()}
                required
                className="w-full bg-lab-navy border border-lab-border rounded-md px-3 py-2 font-condensed text-sm text-lab-white focus:border-lab-gold/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-condensed text-xs text-lab-muted tracking-widest uppercase mb-1.5">Nombre *</label>
              <input
                name="nombre"
                type="text"
                defaultValue={editing?.nombre ?? `Temporada ${new Date().getFullYear()}`}
                placeholder="Temporada 2026"
                required
                className="w-full bg-lab-navy border border-lab-border rounded-md px-3 py-2 font-condensed text-sm text-lab-white focus:border-lab-gold/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-condensed text-xs text-lab-muted tracking-widest uppercase mb-1.5">Fecha inicio</label>
              <input
                name="fecha_inicio"
                type="date"
                defaultValue={editing?.fecha_inicio?.slice(0, 10) ?? ''}
                className="w-full bg-lab-navy border border-lab-border rounded-md px-3 py-2 font-condensed text-sm text-lab-white focus:border-lab-gold/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-condensed text-xs text-lab-muted tracking-widest uppercase mb-1.5">Fecha fin</label>
              <input
                name="fecha_fin"
                type="date"
                defaultValue={editing?.fecha_fin?.slice(0, 10) ?? ''}
                className="w-full bg-lab-navy border border-lab-border rounded-md px-3 py-2 font-condensed text-sm text-lab-white focus:border-lab-gold/50 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-3">
              <input
                name="activa"
                id="activa"
                type="checkbox"
                defaultChecked={editing?.activa ?? false}
                className="w-4 h-4 rounded border-lab-border bg-lab-navy text-lab-gold focus:ring-lab-gold/50"
              />
              <label htmlFor="activa" className="font-condensed text-sm text-lab-gray tracking-wide">
                Temporada activa (es la que se usa en fixture y standings)
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-lab-gold text-lab-accent-fg rounded-md font-condensed font-semibold text-sm tracking-wider uppercase hover:bg-lab-gold-light transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Guardar cambios' : 'Crear temporada'}
              </button>
              <button type="button" onClick={close} className="px-4 py-2 rounded-md border border-lab-border font-condensed text-sm text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {temporadas.length === 0 ? (
          <div className="text-center py-16 bg-lab-surface rounded-xl border border-lab-border">
            <p className="font-condensed text-lab-muted tracking-wider">No hay temporadas. Crea la primera para poder cargar partidos.</p>
          </div>
        ) : (
          temporadas.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-4 bg-lab-surface border rounded-xl px-5 py-4 ${t.activa ? 'border-lab-gold/40' : 'border-lab-border'}`}
            >
              <div className="flex items-center gap-4">
                {t.activa && <Star className="w-4 h-4 text-lab-gold flex-shrink-0" fill="currentColor" />}
                <div>
                  <p className="font-display text-lg tracking-wider text-lab-white">{t.nombre}</p>
                  <p className="font-condensed text-xs text-lab-muted tracking-wide mt-0.5">
                    {t.fecha_inicio ? t.fecha_inicio.slice(0, 10) : '—'} → {t.fecha_fin ? t.fecha_fin.slice(0, 10) : '—'}
                    {t.activa && <span className="ml-2 text-lab-gold font-semibold">• ACTIVA</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!t.activa && (
                  <button
                    onClick={() => handleSetActive(t)}
                    className="px-3 py-1.5 rounded-md border border-lab-gold/40 font-condensed text-xs text-lab-gold hover:bg-lab-gold/10 transition-colors tracking-wider"
                  >
                    Activar
                  </button>
                )}
                <button
                  onClick={() => { setEditing(t); setCreating(false); setError(null); setSuccess(null) }}
                  className="p-2 rounded-md text-lab-muted hover:text-lab-white hover:bg-lab-surface-light transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t)}
                  className="p-2 rounded-md text-lab-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
