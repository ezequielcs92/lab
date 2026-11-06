'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Jugador, Club, PosicionJugador, SinEquipoMotivo, Temporada } from '@/lib/database.types'
import { POSICION_LABELS, SIN_EQUIPO_LABELS, SIN_EQUIPO_POR_PERSONA } from '@/lib/constants'
import { fetchAllRows } from '@/lib/fetch-all-rows'
import { choosePlayerProfiles, duplicateCandidates, matchesPlayerSearch, normalizePlayerName, planSeasonEnrollment, withoutTeamIdentities } from '@/lib/player-identity'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, UserCircle2, Search } from 'lucide-react'
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
const MOTIVOS_SIN_EQUIPO = Object.entries(SIN_EQUIPO_LABELS) as [SinEquipoMotivo, string][]
// Marking several people at once only makes sense for the statuses that describe the person.
const MOTIVOS_SIN_EQUIPO_POR_PERSONA = MOTIVOS_SIN_EQUIPO.filter(([value]) => SIN_EQUIPO_POR_PERSONA.includes(value))

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
  const [busqueda, setBusqueda] = useState('')
  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [temporadasAsignar, setTemporadasAsignar] = useState<string[]>(activeSeasonId ? [activeSeasonId] : [])
  const [temporadasEdicion, setTemporadasEdicion] = useState<string[]>([])
  const [asignando, setAsignando] = useState(false)
  const [motivoSinEquipo, setMotivoSinEquipo] = useState<SinEquipoMotivo>('no_juega')
  const [estadoEdicion, setEstadoEdicion] = useState<SinEquipoMotivo | ''>('')
  const [stableIdSeleccionado, setStableIdSeleccionado] = useState('')
  const [duplicadoId, setDuplicadoId] = useState('')
  const [busquedaDuplicado, setBusquedaDuplicado] = useState('')
  const [bio, setBio] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [existingFoto, setExistingFoto] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function close() { setDuplicadoId(''); setBusquedaDuplicado(''); setCreating(false); setEditing(null); setTemporadasEdicion([]); setEstadoEdicion(''); setError(null); setBio(''); setFotoFile(null); setFotoPreview(null); setExistingFoto(null); setStableIdSeleccionado('') }

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
      setError('La temporada de inscripción no se cambia desde acá: usá «Temporadas en las que jugó» para inscribirlo en otras temporadas.')
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
    await reloadPlayers()
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

  async function reloadPlayers() {
    const supabase = createClient()
    const { data, error: err } = await fetchAllRows((from, to) => supabase
      .from('jugadores')
      .select('*, clubes(nombre, nombre_corto)')
      .order('nombre')
      .order('id')
      .range(from, to))
    if (err) setError(`No se pudo recargar la lista: ${err.message}`)
    else setJugadores(data as AdminJugador[])
  }

  const temporadasOrdenadas = [...temporadas].sort((left, right) => left.anio - right.anio)
  // People who retired or are not playing: they keep club, history and stats but leave the public rosters.
  const sinEquipoPorIdentidad = withoutTeamIdentities(jugadores, activeSeasonId)

  // The status the admin shows for one inscription: "otro_equipo" belongs to that row alone, the rest to the person.
  function estadoDe(player: Jugador): SinEquipoMotivo | '' {
    if (player.sin_equipo_motivo === 'otro_equipo') return 'otro_equipo'
    return (sinEquipoPorIdentidad.get(identidadDe(player)) as SinEquipoMotivo | undefined) ?? ''
  }

  async function applyWithoutTeam(targets: Pick<Jugador, 'id' | 'stable_id'>[], motivo: SinEquipoMotivo | null, rowOnly = false) {
    const supabase = createClient()
    if (rowOnly) {
      const { error: err } = await supabase.from('jugadores').update({ sin_equipo_motivo: motivo }).in('id', targets.map((player) => player.id))
      return err ? [err.message] : []
    }
    const stableIds = [...new Set(targets.map((player) => player.stable_id).filter((id): id is string => Boolean(id)))]
    const rowIds = targets.filter((player) => !player.stable_id).map((player) => player.id)
    const failures: string[] = []
    for (let start = 0; start < stableIds.length; start += 100) {
      const { error: err } = await supabase.from('jugadores').update({ sin_equipo_motivo: motivo }).in('stable_id', stableIds.slice(start, start + 100))
      if (err) failures.push(err.message)
    }
    if (rowIds.length > 0) {
      const { error: err } = await supabase.from('jugadores').update({ sin_equipo_motivo: motivo }).in('id', rowIds)
      if (err) failures.push(err.message)
    }
    return failures
  }

  async function handleWithoutTeam(targets: AdminJugador[], motivo: SinEquipoMotivo | null, rowOnly = false) {
    setError(null); setSuccess(null)
    if (targets.length === 0) { setError('Marcá al menos un jugador'); return }
    const plural = targets.length !== 1
    const question = rowOnly
      ? motivo
        ? `¿Ocultar a ${targets[0].nombre} del plantel de ${targets[0].clubes?.nombre ?? 'este club'}? Sigue jugando en su otro equipo; conserva su historial y estadísticas.`
        : `¿Volver a mostrar a ${targets[0].nombre} en el plantel de ${targets[0].clubes?.nombre ?? 'este club'}?`
      : motivo
      ? `¿Marcar ${targets.length} jugador${plural ? 'es' : ''} como "${SIN_EQUIPO_LABELS[motivo]}"? Dejan de verse en los rosters públicos; conservan su historial y estadísticas.`
      : `¿Devolver ${targets.length} jugador${plural ? 'es' : ''} al roster?`
    if (!confirm(question)) return
    setAsignando(true)
    const failures = await applyWithoutTeam(targets, motivo, rowOnly)
    await reloadPlayers()
    setSeleccionados([])
    setAsignando(false)
    startTransition(() => router.refresh())
    if (failures.length > 0) setError(`No se pudo actualizar: ${failures.join('; ')}`)
    else setSuccess(motivo
      ? `${targets.length} jugador${plural ? 'es' : ''} marcado${plural ? 's' : ''} como "${SIN_EQUIPO_LABELS[motivo]}".`
      : `${targets.length} jugador${plural ? 'es' : ''} de vuelta en el roster. Si juega${plural ? 'n' : ''} esta temporada, inscribilo${plural ? 's' : ''} en la temporada activa.`)
  }

  function seasonsLabel(player: Jugador) {
    const years = new Set(
      jugadores
        .filter((other) => (other.stable_id ?? other.id) === (player.stable_id ?? player.id))
        .map((other) => (other.temporada_id ? String(temporadas.find((season) => season.id === other.temporada_id)?.anio ?? '?') : 'sin temporada')),
    )
    return [...years].sort().join('/')
  }

  async function handleMergeDuplicate() {
    if (!editing || !duplicadoId) return
    const duplicate = jugadores.find((player) => player.id === duplicadoId)
    if (!duplicate) return
    const question = `¿Unificar "${duplicate.nombre}" dentro de "${editing.nombre}"?\n\n`
      + 'Todas las inscripciones, estadísticas y votos del duplicado pasan a este jugador y el duplicado deja de existir. No se puede deshacer.'
    if (!confirm(question)) return
    setError(null); setSuccess(null); setAsignando(true)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('merge_player_identities', { p_keep_id: editing.id, p_remove_id: duplicate.id })
    if (err) {
      setAsignando(false)
      setError(err.message)
      return
    }
    await reloadPlayers()
    setAsignando(false)
    startTransition(() => router.refresh())
    setSuccess(`"${duplicate.nombre}" se unificó con "${editing.nombre}".`)
    close()
  }

  async function handleSaveEstado() {
    if (!editing) return
    if (estadoDe(editing) === estadoEdicion) return
    // "Está jugando en otro equipo" (and undoing it) touches only this inscription; the rest describe the person.
    const rowOnly = estadoEdicion === 'otro_equipo' || (estadoEdicion === '' && editing.sin_equipo_motivo === 'otro_equipo')
    await handleWithoutTeam([editing as AdminJugador], estadoEdicion || null, rowOnly)
    close()
  }

  // Seasonless profiles become the first season picked; every other season gets a copy that keeps the identity.
  async function enrollInSeasons(player: AdminJugador, seasonIds: string[]) {
    const supabase = createClient()
    const ordered = temporadasOrdenadas.filter((season) => seasonIds.includes(season.id))
    const plan = planSeasonEnrollment(player, jugadores, ordered.map((season) => season.id))
    const nameOf = (seasonId: string) => temporadas.find((season) => season.id === seasonId)?.nombre ?? seasonId
    const failed: string[] = []
    let done = 0
    if (plan.assignTo) {
      const { error: err } = await supabase.from('jugadores').update({ temporada_id: plan.assignTo }).eq('id', player.id)
      if (err) failed.push(`${player.nombre} (${nameOf(plan.assignTo)})`)
      else done += 1
    }
    for (const seasonId of plan.copyTo) {
      const year = temporadas.find((season) => season.id === seasonId)?.anio
      let saved = false
      for (let attempt = 0; attempt < 3 && !saved; attempt += 1) {
        const slug = attempt === 0 ? `${player.slug}-${year}` : `${player.slug}-${year}-${attempt + 1}`
        const { error: err } = await supabase.from('jugadores').insert({
          nombre: player.nombre, slug: slug.slice(0, 150), club_id: player.club_id, temporada_id: seasonId,
          posicion: player.posicion, numero_camiseta: player.numero_camiseta, fecha_nacimiento: player.fecha_nacimiento,
          lugar_nacimiento: player.lugar_nacimiento, batea: player.batea, lanza: player.lanza, bio: player.bio,
          foto_url: player.foto_url, activo: player.activo, stable_id: player.stable_id ?? undefined,
        })
        if (!err) saved = true
        else if (err.code !== '23505') break
      }
      if (saved) done += 1
      else failed.push(`${player.nombre} (${nameOf(seasonId)})`)
    }
    // Enrolling someone in the active season means they play: bring them back to the rosters.
    if (activeSeasonId && seasonIds.includes(activeSeasonId) && sinEquipoPorIdentidad.has(player.stable_id ?? player.id)) {
      const failures = await applyWithoutTeam([player], null)
      failed.push(...failures.map((message) => `${player.nombre} (volver al roster: ${message})`))
    }
    return { done, failed }
  }

  function describeEnrollment(done: number, failed: string[]) {
    if (done > 0) setSuccess(`${done} inscripci${done !== 1 ? 'ones' : 'ón'} creada${done !== 1 ? 's' : ''}.`)
    if (failed.length > 0) setError(`No se pudo inscribir: ${failed.join(', ')}`)
  }

  async function handleAssignSeasons() {
    setError(null); setSuccess(null)
    const selected = jugadoresFiltrados.filter((player) => seleccionados.includes(player.id))
    if (temporadasAsignar.length === 0) { setError('Elegí al menos una temporada'); return }
    if (selected.length === 0) { setError('Marcá al menos un jugador'); return }
    const names = temporadasOrdenadas.filter((season) => temporadasAsignar.includes(season.id)).map((season) => season.nombre).join(', ')
    if (!confirm(`¿Inscribir ${selected.length} jugador${selected.length !== 1 ? 'es' : ''} en: ${names}? Los que ya estén inscriptos en alguna de esas temporadas con ese club no se duplican.`)) return

    setAsignando(true)
    let done = 0
    const failed: string[] = []
    for (const player of selected) {
      const result = await enrollInSeasons(player as AdminJugador, temporadasAsignar)
      done += result.done
      failed.push(...result.failed)
    }
    await reloadPlayers()
    setSeleccionados([])
    setAsignando(false)
    startTransition(() => router.refresh())
    describeEnrollment(done, failed)
  }

  async function handleEnrollEditing() {
    if (!editing || temporadasEdicion.length === 0) return
    setError(null); setSuccess(null)
    setAsignando(true)
    const result = await enrollInSeasons(editing as AdminJugador, temporadasEdicion)
    await reloadPlayers()
    setAsignando(false)
    startTransition(() => router.refresh())
    close()
    describeEnrollment(result.done, result.failed)
  }

  const showForm = creating || editing
  const availableClubs = rol === 'editor_club' && userClubId
    ? clubes.filter((c) => c.id === userClubId)
    : clubes

  const buscando = busqueda.trim().length > 0
  const verSinEquipo = temporadaFiltro === 'sin_equipo' && !buscando
  const identidadDe = (j: Jugador) => j.stable_id ?? j.id
  const jugadoresDeTemporada = buscando
    ? jugadores.filter((j) => matchesPlayerSearch(j.nombre, busqueda))
    : verSinEquipo
    ? jugadores.filter((j) => j.sin_equipo_motivo && sinEquipoPorIdentidad.has(identidadDe(j)))
    : (temporadaFiltro === 'all'
      ? jugadores
      : temporadaFiltro === 'actual'
        ? jugadores.filter((j) => j.temporada_id === activeSeasonId || j.temporada_id === null)
        : temporadaFiltro === 'sin_temporada'
          ? jugadores.filter((j) => j.temporada_id === null)
          : jugadores.filter((j) => j.temporada_id === temporadaFiltro)
      ).filter((j) => !sinEquipoPorIdentidad.has(identidadDe(j)))
  const jugadoresPorClub = clubFiltro
    ? jugadoresDeTemporada.filter((j) => j.club_id === clubFiltro)
    : jugadoresDeTemporada
  const jugadoresFiltrados = choosePlayerProfiles(jugadoresPorClub, activeSeasonId, true)
  const asignacionActiva = temporadaFiltro === 'sin_temporada' && !buscando
  const seleccionActiva = asignacionActiva || verSinEquipo
  const cantidadSinEquipo = sinEquipoPorIdentidad.size
  const todosMarcados = jugadoresFiltrados.length > 0 && jugadoresFiltrados.every((player) => seleccionados.includes(player.id))
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
            <option value="sin_equipo">Sin equipo / retirados ({cantidadSinEquipo})</option>
            {temporadas.map((season) => <option key={season.id} value={season.id}>{season.nombre}</option>)}
          </select>
        </label>
        <p className="font-condensed text-xs text-lab-muted pb-2">Las temporadas vinculadas a una misma identidad se agrupan; cada inscripción se conserva.</p>
      </div>

      {asignacionActiva && (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-lab-gold/30 bg-lab-gold/5 p-4">
          <div className="flex-1 min-w-[16rem]">
            <p className="font-condensed text-sm text-lab-white">Jugadores sin temporada</p>
            <p className="font-condensed text-xs text-lab-muted">Marcalos, elegí una o varias temporadas y se inscriben conservando su identidad e historial. Si ya están inscriptos en esa temporada con ese club, no se duplican.</p>
          </div>
          <fieldset className="font-condensed text-[11px] tracking-wider uppercase text-lab-muted">
            <legend className="mb-1">Inscribir en</legend>
            <div className="flex flex-wrap gap-3 normal-case text-sm text-lab-white">
              {temporadasOrdenadas.map((season) => (
                <label key={season.id} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={temporadasAsignar.includes(season.id)}
                    onChange={(event) => setTemporadasAsignar((current) => event.target.checked ? [...current, season.id] : current.filter((id) => id !== season.id))}
                  />
                  {season.nombre}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={handleAssignSeasons}
            disabled={asignando || seleccionados.length === 0 || temporadasAsignar.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-lab-gold px-4 font-condensed text-sm font-bold tracking-wider text-lab-accent-fg disabled:opacity-50"
          >
            {asignando && <Loader2 className="w-4 h-4 animate-spin" />}
            INSCRIBIR {seleccionados.length > 0 ? `(${seleccionados.length})` : ''}
          </button>
          <div className="basis-full border-t border-lab-gold/20 pt-3 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[16rem]">
              <p className="font-condensed text-sm text-lab-white">¿Ya no juegan?</p>
              <p className="font-condensed text-xs text-lab-muted">Marcá a los que se retiraron o no juegan este año: dejan de verse en los rosters pero conservan su historial y estadísticas.</p>
            </div>
            <label className="font-condensed text-[11px] tracking-wider uppercase text-lab-muted">
              Motivo
              <select value={motivoSinEquipo} onChange={(event) => setMotivoSinEquipo(event.target.value as SinEquipoMotivo)} className="mt-1 block h-10 bg-lab-navy border border-lab-border rounded-lg px-3 text-sm normal-case text-lab-white">
                {MOTIVOS_SIN_EQUIPO_POR_PERSONA.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={() => handleWithoutTeam(jugadoresFiltrados.filter((player) => seleccionados.includes(player.id)) as AdminJugador[], motivoSinEquipo)}
              disabled={asignando || seleccionados.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-lab-gold/50 px-4 font-condensed text-sm font-bold tracking-wider text-lab-gold hover:bg-lab-gold/10 disabled:opacity-50"
            >
              {asignando && <Loader2 className="w-4 h-4 animate-spin" />}
              MARCAR SIN EQUIPO {seleccionados.length > 0 ? `(${seleccionados.length})` : ''}
            </button>
          </div>
        </div>
      )}

      {verSinEquipo && (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-lab-gold/30 bg-lab-gold/5 p-4">
          <div className="flex-1 min-w-[16rem]">
            <p className="font-condensed text-sm text-lab-white">Jugadores sin equipo</p>
            <p className="font-condensed text-xs text-lab-muted">No aparecen en los rosters públicos. Si vuelven a jugar, marcalos y devolvelos al roster; después inscribilos en la temporada activa.</p>
          </div>
          <button
            type="button"
            onClick={() => handleWithoutTeam(jugadoresFiltrados.filter((player) => seleccionados.includes(player.id)) as AdminJugador[], null)}
            disabled={asignando || seleccionados.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-lab-gold px-4 font-condensed text-sm font-bold tracking-wider text-lab-accent-fg disabled:opacity-50"
          >
            {asignando && <Loader2 className="w-4 h-4 animate-spin" />}
            DEVOLVER AL ROSTER {seleccionados.length > 0 ? `(${seleccionados.length})` : ''}
          </button>
        </div>
      )}

      <div className="mb-5 max-w-md">
        <label className="font-condensed text-[11px] tracking-wider uppercase text-lab-muted" htmlFor="buscar-jugador">
          Buscar jugador
        </label>
        <div className="relative mt-1">
          <Search className="w-4 h-4 text-lab-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            id="buscar-jugador"
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre o apellido"
            autoComplete="off"
            className="w-full h-10 bg-lab-navy border border-lab-border rounded-lg pl-9 pr-3 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
          />
        </div>
        {buscando && (
          <p className="font-condensed text-xs text-lab-muted mt-1.5">
            Buscando en todas las temporadas. Podés acotar por club con las pestañas.
          </p>
        )}
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
                {seleccionActiva && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      aria-label="Marcar todos los jugadores de la lista"
                      checked={todosMarcados}
                      onChange={(event) => setSeleccionados(event.target.checked ? jugadoresFiltrados.map((player) => player.id) : [])}
                    />
                  </th>
                )}
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
                    {seleccionActiva && (
                      <td className="px-4 py-2.5 w-10">
                        <input
                          type="checkbox"
                          aria-label={`Marcar a ${j.nombre}`}
                          checked={seleccionados.includes(j.id)}
                          onChange={(event) => setSeleccionados((current) => event.target.checked ? [...current, j.id] : current.filter((id) => id !== j.id))}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2.5 font-display text-lg text-lab-gold/60 w-12">{j.numero_camiseta ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">{j.nombre}</p>
                      {j.sin_equipo_motivo === 'otro_equipo' && (
                        <p className="font-condensed text-[10px] text-lab-muted mt-0.5">Oculto en este club · {SIN_EQUIPO_LABELS.otro_equipo}</p>
                      )}
                      {sinEquipoPorIdentidad.has(identidadDe(j)) && (
                        <p className="font-condensed text-[10px] text-lab-red mt-0.5">
                          Sin equipo · {SIN_EQUIPO_LABELS[sinEquipoPorIdentidad.get(identidadDe(j)) as SinEquipoMotivo] ?? 'Fuera del roster'}
                        </p>
                      )}
                      <p className="font-condensed text-[11px] text-lab-muted md:hidden">{POSICION_LABELS[j.posicion]}</p>
                      {seasons.length > 1 && <p className="font-condensed text-[10px] text-lab-gold/80 mt-0.5">Historial: {seasons.join(' · ')}</p>}
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">{POSICION_LABELS[j.posicion]}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">{j.clubes?.nombre_corto ?? j.clubes?.nombre ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => { setCreating(false); setEditing(j); setTemporadasEdicion([]); setEstadoEdicion(estadoDe(j)); setStableIdSeleccionado(''); setBio(j.bio ?? ''); setExistingFoto(j.foto_url ?? null); setFotoFile(null); setFotoPreview(null); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar perfil / inscripción">
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
                  <td colSpan={seleccionActiva ? 6 : 5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">
                    {buscando ? 'Ningún jugador coincide con la búsqueda' : verSinEquipo ? 'Nadie está marcado sin equipo' : clubFiltro ? 'Sin jugadores en este club' : 'Sin jugadores registrados'}
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
            <div className="mb-5 space-y-1 font-condensed text-sm text-lab-muted">
              <p><strong className="text-lab-gray">Slug:</strong> es el texto de la URL pública, por ejemplo /jugadores/apellido-nombre. No es el ID deportivo; evitá cambiarlo si ya compartiste ese enlace.</p>
              <p><strong className="text-lab-gray">Identidad (stable_id):</strong> representa a la persona y vincula sus estadísticas históricas. Cada inscripción por temporada y club tiene su propio ID de registro; eso no significa que sean jugadores duplicados.</p>
              <p>Si la persona ya existe, vinculá su identidad al crear una nueva inscripción. No unifiques homónimos sin confirmar que son la misma persona.</p>
            </div>
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
                  {editing && (
                    <p className="mt-1 font-condensed text-[11px] text-lab-muted">
                      Cambia el club solo de esta inscripción. Las temporadas anteriores conservan el club con el que jugó, así que en la lista puede aparecer una vez por cada club.
                    </p>
                  )}
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
                {editing && (
                  <div className="md:col-span-2 rounded-lg border border-lab-border bg-lab-navy/40 p-4">
                    <p className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-1">Temporadas en las que jugó</p>
                    <p className="mb-3 font-condensed text-xs text-lab-muted">
                      Marcá las temporadas en las que jugó con este club. Se inscribe con la misma identidad, así sus estadísticas no se duplican.
                      {editing.temporada_id === null && ' Este perfil no tiene temporada: se asigna a la primera marcada.'}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-4">
                      {temporadasOrdenadas.map((season) => {
                        const inscripto = jugadores.some((other) =>
                          (other.stable_id ?? other.id) === (editing.stable_id ?? editing.id)
                          && other.club_id === editing.club_id
                          && other.temporada_id === season.id)
                        return (
                          <label key={season.id} className={`inline-flex items-center gap-1.5 text-sm ${inscripto ? 'text-lab-gold' : 'text-lab-white'}`}>
                            <input
                              type="checkbox"
                              checked={inscripto || temporadasEdicion.includes(season.id)}
                              disabled={inscripto}
                              onChange={(event) => setTemporadasEdicion((current) => event.target.checked ? [...current, season.id] : current.filter((id) => id !== season.id))}
                            />
                            {season.nombre}{inscripto ? ' · inscripto' : ''}
                          </label>
                        )
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={handleEnrollEditing}
                      disabled={asignando || temporadasEdicion.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-lab-gold/50 px-4 py-2 font-condensed text-xs font-bold tracking-wider text-lab-gold hover:bg-lab-gold/10 disabled:opacity-50"
                    >
                      {asignando && <Loader2 className="w-4 h-4 animate-spin" />}
                      INSCRIBIR EN LAS MARCADAS
                    </button>
                  </div>
                )}
                {editing && (
                  <div className="md:col-span-2 rounded-lg border border-lab-border bg-lab-navy/40 p-4">
                    <p className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-1">Estado en el plantel</p>
                    <p className="mb-3 font-condensed text-xs text-lab-muted">
                      Si se retiró o no juega este año, marcalo sin equipo: deja de verse en los rosters públicos y conserva su historial y estadísticas.
                      Vale para todas sus inscripciones. Inscribirlo en la temporada activa lo devuelve al roster.
                      «Está jugando en otro equipo» oculta solo esta inscripción (la de {(editing as AdminJugador).clubes?.nombre ?? 'este club'}) y no toca las demás.
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <select value={estadoEdicion} onChange={(event) => setEstadoEdicion(event.target.value as SinEquipoMotivo | '')} className="h-10 bg-lab-navy border border-lab-border rounded-lg px-3 text-sm text-lab-white">
                        <option value="">Con equipo (aparece en el roster)</option>
                        {MOTIVOS_SIN_EQUIPO.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveEstado}
                        disabled={asignando || estadoEdicion === estadoDe(editing)}
                        className="inline-flex items-center gap-2 rounded-lg border border-lab-gold/50 px-4 py-2 font-condensed text-xs font-bold tracking-wider text-lab-gold hover:bg-lab-gold/10 disabled:opacity-50"
                      >
                        {asignando && <Loader2 className="w-4 h-4 animate-spin" />}
                        GUARDAR ESTADO
                      </button>
                    </div>
                  </div>
                )}
                {editing && rol === 'admin_liga' && (
                  <div className="md:col-span-2 rounded-lg border border-lab-border bg-lab-navy/40 p-4">
                    <p className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-1">Unificar duplicado</p>
                    <p className="mb-3 font-condensed text-xs text-lab-muted">
                      Si hay otro perfil de la misma persona, buscalo y unificalo con este: sus inscripciones, estadísticas y votos pasan acá y el duplicado desaparece.
                    </p>
                    <input
                      type="search"
                      value={busquedaDuplicado}
                      onChange={(event) => { setBusquedaDuplicado(event.target.value); setDuplicadoId('') }}
                      placeholder="Buscar el duplicado por nombre (vacío: nombres parecidos)"
                      className="mb-3 w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
                    />
                    <div className="flex flex-wrap items-end gap-3">
                      <select value={duplicadoId} onChange={(event) => setDuplicadoId(event.target.value)} className="h-10 min-w-0 flex-1 bg-lab-navy border border-lab-border rounded-lg px-3 text-sm text-lab-white">
                        <option value="">Elegí el perfil duplicado…</option>
                        {duplicateCandidates<AdminJugador>(jugadores, editing as AdminJugador, busquedaDuplicado).map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.nombre} · {player.clubes?.nombre_corto ?? player.clubes?.nombre ?? 'Club sin nombre'}
                            {' · '}{seasonsLabel(player)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleMergeDuplicate}
                        disabled={asignando || !duplicadoId}
                        className="inline-flex items-center gap-2 rounded-lg border border-lab-red/60 px-4 py-2 font-condensed text-xs font-bold tracking-wider text-lab-red hover:bg-lab-red/10 disabled:opacity-50"
                      >
                        {asignando && <Loader2 className="w-4 h-4 animate-spin" />}
                        UNIFICAR
                      </button>
                    </div>
                  </div>
                )}
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
