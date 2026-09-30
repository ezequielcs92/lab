'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Jugador, Club, PosicionJugador, Temporada } from '@/lib/database.types'
import { POSICION_LABELS } from '@/lib/constants'
import { choosePlayerProfiles, normalizePlayerName } from '@/lib/player-identity'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, UserCircle2 } from 'lucide-react'
import Image from 'next/image'
import RichEditor from './RichEditor'

export type AdminJugador = Jugador & { clubes: Pick<Club, 'nombre' | 'nombre_corto'> }

interface Props {
  jugadores: AdminJugador[]
  clubes: Pick<Club, 'id' | 'nombre'>[]
  temporadas: Pick<Temporada, 'id' | 'nombre' | 'anio' | 'activa'>[]
  activeSeasonId: string | null
  rol: string
  userClubId: string | null
}

const POSICIONES = Object.entries(POSICION_LABELS) as [PosicionJugador, string][]

export default function JugadoresAdmin({ jugadores: initial, clubes, temporadas, activeSeasonId, rol, userClubId }: Props) {
  const [jugadores, setJugadores] = useState(initial)
  const [editing, setEditing] = useState<Jugador | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [clubFiltro, setClubFiltro] = useState<string | null>(
    rol === 'editor_club' && userClubId ? userClubId : null
  )
  const [temporadaFiltro, setTemporadaFiltro] = useState(activeSeasonId ? 'actual' : 'all')
  const [stableIdSeleccionado, setStableIdSeleccionado] = useState('')
  const [bio, setBio] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [existingFoto, setExistingFoto] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function close() { setCreating(false); setEditing(null); setError(null); setBio(''); setFotoFile(null); setFotoPreview(null); setExistingFoto(null); setStableIdSeleccionado('') }

  function openCreate() {
    setCreating(true); setEditing(null); setError(null); setSuccess(null)
    setBio(''); setFotoFile(null); setFotoPreview(null); setExistingFoto(null); setStableIdSeleccionado('')
  }

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
    const temporada_id = (fd.get('temporada_id') as string) || null
    const stable_id = (fd.get('stable_id') as string) || null
    const crearHomónimo = fd.get('crear_homonimo') === 'on'
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

    if (editing && temporada_id !== editing.temporada_id) {
      setError('La temporada de inscripción no se puede cambiar al editar un perfil. Creá una nueva inscripción vinculando su identidad.')
      return
    }

    if (!editing && stable_id && crearHomónimo) {
      setError('Elegí una identidad existente o confirmá un homónimo, no ambas opciones.')
      return
    }

    if (!editing && stable_id) {
      const identity = jugadores.find((player) => player.stable_id === stable_id)
      if (!identity || normalizePlayerName(identity.nombre) !== normalizePlayerName(nombre)) {
        setError('Elegí la identidad existente con el mismo nombre; para otro jugador usá una identidad nueva.')
        return
      }
    }

    if (!editing && !stable_id && !crearHomónimo) {
      const sameNameMembership = jugadores.find((player) =>
        normalizePlayerName(player.nombre) === normalizePlayerName(nombre)
        && player.club_id === club_id
        && player.temporada_id === temporada_id,
      )
      if (sameNameMembership) {
        setError('Ya existe un perfil con ese nombre, club y temporada. Vinculá la identidad existente o confirmá que se trata de un homónimo.')
        return
      }
    }

    // Upload foto if new file selected
    let foto_url: string | null = existingFoto
    if (fotoFile) {
      try {
        foto_url = await uploadImage(fotoFile, 'jugadores/fotos')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo subir la foto del jugador.')
        return
      }
    }

    const payload = {
      nombre, slug, club_id, posicion, numero_camiseta,
      fecha_nacimiento, lugar_nacimiento, batea, lanza, bio: bioVal,
      foto_url, temporada_id, activo: true,
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
      const { error: err } = await supabase.from('jugadores').insert({ ...payload, stable_id: stable_id || undefined })
      if (err) {
        setError(err.code === '23505'
          ? 'Ya existe una inscripción de esa identidad en ese club y temporada.'
          : err.message)
        return
      }
      setSuccess(`"${nombre}" creado`)
    }

    startTransition(() => { router.refresh() })
    close()
    // Re-fetch para actualizar la lista con joins
    const { data } = await supabase
      .from('jugadores')
      .select('*, clubes(nombre, nombre_corto)')
      .order('nombre')
    if (data) setJugadores(data as AdminJugador[])
  }

  async function handleDelete(j: Jugador) {
    if (!confirm(`¿Eliminar la inscripción de "${j.nombre}" para esta temporada/club? Las demás temporadas se conservan.`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('jugadores').delete().eq('id', j.id)
    if (err) { setError(err.message); return }
    setJugadores((prev) => prev.filter((x) => x.id !== j.id))
    setSuccess(`Inscripción de "${j.nombre}" eliminada`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing
  const availableClubs = rol === 'editor_club' && userClubId
    ? clubes.filter((c) => c.id === userClubId)
    : clubes

  const jugadoresDeTemporada = temporadaFiltro === 'all'
    ? jugadores
    : temporadaFiltro === 'actual'
      ? jugadores.filter((j) => j.temporada_id === activeSeasonId || j.temporada_id === null)
      : temporadaFiltro === 'sin_temporada'
        ? jugadores.filter((j) => j.temporada_id === null)
        : jugadores.filter((j) => j.temporada_id === temporadaFiltro)
  const jugadoresPorClub = clubFiltro
    ? jugadoresDeTemporada.filter((j) => j.club_id === clubFiltro)
    : jugadoresDeTemporada
  const jugadoresFiltrados = choosePlayerProfiles(jugadoresPorClub, activeSeasonId, true)
  const temporadasPorIdentidadClub = new Map<string, Set<string>>()
  for (const jugador of jugadoresPorClub) {
    const key = `${jugador.stable_id ?? jugador.id}|${jugador.club_id}`
    const years = temporadasPorIdentidadClub.get(key) ?? new Set<string>()
    years.add(jugador.temporada_id ? String(temporadas.find((season) => season.id === jugador.temporada_id)?.anio ?? '?') : 'Sin temporada')
    temporadasPorIdentidadClub.set(key, years)
  }
  const identityOptions = [...new Map(
    jugadores.filter((jugador) => jugador.stable_id).map((jugador) => [jugador.stable_id as string, jugador]),
  ).values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">JUGADORES</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {jugadoresFiltrados.length} identidad{jugadoresFiltrados.length !== 1 ? 'es' : ''}
            {clubFiltro && ` · ${clubes.find(c => c.id === clubFiltro)?.nombre ?? ''}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> NUEVO
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <label className="font-condensed text-[11px] tracking-wider uppercase text-lab-muted">
          Temporada de inscripción
          <select value={temporadaFiltro} onChange={(event) => setTemporadaFiltro(event.target.value)} className="mt-1 block h-10 bg-lab-navy border border-lab-border rounded-lg px-3 text-sm normal-case text-lab-white">
            <option value="actual">Temporada activa + sin temporada</option>
            <option value="all">Todas (identidades consolidadas)</option>
            <option value="sin_temporada">Sin temporada</option>
            {temporadas.map((season) => <option key={season.id} value={season.id}>{season.nombre}</option>)}
          </select>
        </label>
        <p className="font-condensed text-xs text-lab-muted pb-2">Las temporadas vinculadas a una misma identidad se agrupan; cada inscripción se conserva.</p>
      </div>

      {/* Club filter tabs */}
      {rol !== 'editor_club' && clubes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setClubFiltro(null)}
            className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
              clubFiltro === null
                ? 'bg-lab-gold text-lab-accent-fg font-bold'
                : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'
            }`}
          >
            Todos ({choosePlayerProfiles(jugadoresDeTemporada, activeSeasonId, true).length})
          </button>
          {clubes.map((c) => {
            const count = choosePlayerProfiles(jugadoresDeTemporada.filter((j) => j.club_id === c.id), activeSeasonId, true).length
            return (
              <button
                key={c.id}
                onClick={() => setClubFiltro(c.id)}
                className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
                  clubFiltro === c.id
                    ? 'bg-lab-gold text-lab-accent-fg font-bold'
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
              {jugadoresFiltrados.map((j) => {
                const seasons = [...(temporadasPorIdentidadClub.get(`${j.stable_id ?? j.id}|${j.club_id}`) ?? [])]
                  .sort((a, b) => a === 'Sin temporada' ? 1 : b === 'Sin temporada' ? -1 : Number(a) - Number(b))
                return (
                  <tr key={j.id} className="hover:bg-lab-navy/40 transition-colors">
                    <td className="px-4 py-2.5 font-display text-lg text-lab-gold/60 w-12">{j.numero_camiseta ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">{j.nombre}</p>
                      <p className="font-condensed text-[11px] text-lab-muted md:hidden">{POSICION_LABELS[j.posicion]}</p>
                      {seasons.length > 1 && <p className="font-condensed text-[10px] text-lab-gold/80 mt-0.5">Historial: {seasons.join(' · ')}</p>}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">{POSICION_LABELS[j.posicion]}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">{j.clubes?.nombre_corto ?? j.clubes?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => { setCreating(false); setEditing(j); setStableIdSeleccionado(''); setBio(j.bio ?? ''); setExistingFoto(j.foto_url ?? null); setFotoFile(null); setFotoPreview(null); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar perfil / inscripción">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(j)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar inscripción de esta temporada/club">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-4xl p-6 relative mb-20">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Temporada de inscripción</label>
                  {editing ? (
                    <>
                      <p className="bg-lab-navy/50 border border-lab-border/50 rounded-lg px-3 py-2.5 text-sm text-lab-gray">
                        {temporadas.find((season) => season.id === editing.temporada_id)?.nombre ?? 'Sin temporada asignada'}
                      </p>
                      <input type="hidden" name="temporada_id" value={editing.temporada_id ?? ''} />
                    </>
                  ) : (
                    <select name="temporada_id" defaultValue={activeSeasonId ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                      <option value="">Sin temporada asignada</option>
                      {temporadas.map((season) => <option key={season.id} value={season.id}>{season.nombre}</option>)}
                    </select>
                  )}
                </div>
                {!editing && (
                  <div>
                    <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Vincular identidad existente</label>
                    <select name="stable_id" value={stableIdSeleccionado} onChange={(event) => setStableIdSeleccionado(event.target.value)} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                      <option value="">Crear una identidad nueva</option>
                      {identityOptions.map((player) => (
                        <option key={player.stable_id} value={player.stable_id!}>
                          {player.nombre} · {player.clubes?.nombre_corto ?? player.clubes?.nombre ?? 'Club sin nombre'}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 mt-2 font-condensed text-xs text-lab-muted">
                      <input type="checkbox" name="crear_homonimo" className="accent-lab-gold" />
                      Es otra persona con el mismo nombre
                    </label>
                  </div>
                )}
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
                <button type="submit" disabled={isPending} className="flex-1 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
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
