'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Jugador, Club, PosicionJugador } from '@/lib/database.types'
import { POSICION_LABELS } from '@/lib/constants'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, UserCircle2 } from 'lucide-react'
import Image from 'next/image'
import RichEditor from './RichEditor'

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
  const [clubFiltro, setClubFiltro] = useState<string | null>(
    rol === 'editor_club' && userClubId ? userClubId : null
  )
  const [bio, setBio] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [existingFoto, setExistingFoto] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function close() { setCreating(false); setEditing(null); setError(null); setBio(''); setFotoFile(null); setFotoPreview(null); setExistingFoto(null) }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File, folder: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || 'Error subiendo imagen')
    }
    const d = await res.json()
    return d.url
  }

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
    const bioVal = bio.trim() || null

    if (!nombre || !slug || !club_id) {
      setError('Nombre, slug y club son requeridos')
      return
    }

    // Upload foto if new file selected
    let foto_url: string | null = existingFoto
    if (fotoFile) {
      try {
        foto_url = await uploadImage(fotoFile, 'jugadores/fotos')
      } catch (err: any) {
        setError(err.message)
        return
      }
    }

    const payload = {
      nombre, slug, club_id, posicion, numero_camiseta,
      fecha_nacimiento, lugar_nacimiento, batea, lanza, bio: bioVal,
      foto_url, temporada_id: null, activo: true,
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

  const jugadoresFiltrados = clubFiltro
    ? jugadores.filter((j) => j.club_id === clubFiltro)
    : jugadores

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">JUGADORES</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {jugadoresFiltrados.length} jugador{jugadoresFiltrados.length !== 1 ? 'es' : ''}
            {clubFiltro && ` · ${clubes.find(c => c.id === clubFiltro)?.nombre ?? ''}`}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setCreating(true); setError(null); setSuccess(null) }}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> NUEVO
        </button>
      </div>

      {/* Club filter tabs */}
      {rol !== 'editor_club' && clubes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setClubFiltro(null)}
            className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
              clubFiltro === null
                ? 'bg-lab-gold text-lab-navy font-bold'
                : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'
            }`}
          >
            Todos ({jugadores.length})
          </button>
          {clubes.map((c) => {
            const count = jugadores.filter((j) => j.club_id === c.id).length
            return (
              <button
                key={c.id}
                onClick={() => setClubFiltro(c.id)}
                className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
                  clubFiltro === c.id
                    ? 'bg-lab-gold text-lab-navy font-bold'
                    : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'
                }`}
              >
                {c.nombre} ({count})
              </button>
            )
          })}
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
              {jugadoresFiltrados.map((j) => (
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
                      <button onClick={() => { setCreating(false); setEditing(j); setBio(j.bio ?? ''); setExistingFoto(j.foto_url ?? null); setFotoFile(null); setFotoPreview(null); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(j)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {jugadoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">
                    {clubFiltro ? 'Sin jugadores en este club' : 'Sin jugadores registrados'}
                  </td>
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
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Foto del Jugador</label>
                <div className="flex items-center gap-4">
                  {(fotoPreview || existingFoto) ? (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border border-lab-border bg-lab-navy flex-shrink-0">
                      <Image src={fotoPreview ?? existingFoto!} alt="Foto" fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full border border-dashed border-lab-border bg-lab-navy flex items-center justify-center flex-shrink-0">
                      <UserCircle2 className="w-7 h-7 text-lab-muted" />
                    </div>
                  )}
                  <div>
                    <button type="button" onClick={() => fotoInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider">
                      <Upload className="w-3.5 h-3.5" />
                      {existingFoto ? 'Cambiar foto' : 'Subir foto'}
                    </button>
                    <p className="font-condensed text-[10px] text-lab-muted mt-1">JPG o PNG, máx 5MB</p>
                    <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Biografía</label>
                <RichEditor value={bio} onChange={setBio} height={200} />
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
