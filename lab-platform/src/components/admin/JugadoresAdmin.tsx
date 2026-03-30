'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Jugador, Club, PosicionJugador } from '@/lib/database.types'
import { POSICION_LABELS } from '@/lib/constants'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check } from 'lucide-react'

interface Props {
  jugadores: (Jugador & { clubes: Pick<Club, 'nombre' | 'nombre_corto'> })[]
  clubes: Pick<Club, 'id' | 'nombre'>[]
  rol: string
  userClubId: string | null
}

const POSICIONES = Object.entries(POSICION_LABELS) as [PosicionJugador, string][]

export default function JugadoresAdmin({ jugadores: initial, clubes, rol, userClubId }: Props) {
  const [jugadores, setJugadores] = useState(initial)
  const [editing, setEditing] = useState<Jugador | null>(null)
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
    const nombre = (fd.get('nombre') as string).trim()
    const slug = (fd.get('slug') as string).trim()
    const club_id = fd.get('club_id') as string
    const posicion = fd.get('posicion') as PosicionJugador
    const numero_camiseta = fd.get('numero_camiseta') ? Number(fd.get('numero_camiseta')) : null
    const fecha_nacimiento = (fd.get('fecha_nacimiento') as string) || null
    const lugar_nacimiento = (fd.get('lugar_nacimiento') as string).trim() || null
    const batea = (fd.get('batea') as string) || null
    const lanza = (fd.get('lanza') as string) || null
    const bio = (fd.get('bio') as string).trim() || null

    if (!nombre || !slug || !club_id) {
      setError('Nombre, slug y club son requeridos')
      return
    }

    const payload = {
      nombre, slug, club_id, posicion, numero_camiseta,
      fecha_nacimiento, lugar_nacimiento, batea, lanza, bio,
      foto_url: null, temporada_id: null, activo: true,
      avg: null, hr: null, rbi: null, era: null, w: null, l: null,
      so: null, bb: null, h: null, ab: null, r: null, sb: null,
      obp: null, slg: null, ip: null,
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('jugadores').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setSuccess(`"${nombre}" actualizado`)
    } else {
      const { error: err } = await supabase.from('jugadores').insert(payload)
      if (err) { setError(err.message); return }
      setSuccess(`"${nombre}" creado`)
    }

    startTransition(() => { router.refresh() })
    close()
    // Re-fetch para actualizar la lista con joins
    const { data } = await supabase
      .from('jugadores')
      .select('*, clubes(nombre, nombre_corto)')
      .order('nombre')
    if (data) setJugadores(data as any)
  }

  async function handleDelete(j: Jugador) {
    if (!confirm(`¿Eliminar "${j.nombre}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('jugadores').delete().eq('id', j.id)
    if (err) { setError(err.message); return }
    setJugadores((prev) => prev.filter((x) => x.id !== j.id))
    setSuccess(`"${j.nombre}" eliminado`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing
  const availableClubs = rol === 'editor_club' && userClubId
    ? clubes.filter((c) => c.id === userClubId)
    : clubes

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">JUGADORES</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {jugadores.length} jugador{jugadores.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setCreating(true); setError(null); setSuccess(null) }}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> NUEVO
        </button>
      </div>

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

      {/* Roster table */}
      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">#</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Jugador</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Pos</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Club</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {jugadores.map((j) => (
                <tr key={j.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-2.5 font-display text-lg text-lab-gold/60 w-12">{j.numero_camiseta ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">{j.nombre}</p>
                    <p className="font-condensed text-[11px] text-lab-muted md:hidden">{POSICION_LABELS[j.posicion]}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">{POSICION_LABELS[j.posicion]}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">{(j as any).clubes?.nombre_corto ?? (j as any).clubes?.nombre ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setCreating(false); setEditing(j); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(j)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {jugadores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">Sin jugadores registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-16 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-lg p-6 relative mb-20">
            <button onClick={close} className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR JUGADOR' : 'NUEVO JUGADOR'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label="Nombre *" name="nombre" defaultValue={editing?.nombre ?? ''} />
                <FieldInput label="Slug *" name="slug" defaultValue={editing?.slug ?? ''} placeholder="apellido-nombre" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Club *</label>
                  <select name="club_id" defaultValue={editing?.club_id ?? (availableClubs[0]?.id ?? '')} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    {availableClubs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Posición</label>
                  <select name="posicion" defaultValue={editing?.posicion ?? 'utility'} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    {POSICIONES.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FieldInput label="Camiseta" name="numero_camiseta" type="number" defaultValue={editing?.numero_camiseta ?? ''} />
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Batea</label>
                  <select name="batea" defaultValue={editing?.batea ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    <option value="">—</option>
                    <option value="derecha">Derecha</option>
                    <option value="izquierda">Izquierda</option>
                    <option value="ambas">Ambas</option>
                  </select>
                </div>
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Lanza</label>
                  <select name="lanza" defaultValue={editing?.lanza ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    <option value="">—</option>
                    <option value="derecha">Derecha</option>
                    <option value="izquierda">Izquierda</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FieldInput label="Fecha Nac." name="fecha_nacimiento" type="date" defaultValue={editing?.fecha_nacimiento ?? ''} />
                <FieldInput label="Lugar Nac." name="lugar_nacimiento" defaultValue={editing?.lugar_nacimiento ?? ''} />
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Biografía</label>
                <textarea name="bio" rows={2} defaultValue={editing?.bio ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR' : 'CREAR JUGADOR'}
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

function FieldInput({ label, name, type = 'text', defaultValue = '', placeholder }: { label: string; name: string; type?: string; defaultValue?: string | number | null; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} placeholder={placeholder} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors" />
    </div>
  )
}
