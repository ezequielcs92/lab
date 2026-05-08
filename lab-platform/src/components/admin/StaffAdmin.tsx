'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { StaffClub, Club } from '@/lib/database.types'
import { STAFF_CATEGORIAS, type StaffCategoria, getStaffCategory, isMissingStaffCategoriaColumnError } from '@/lib/staff-category'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, UserCircle2, GripVertical } from 'lucide-react'
import Image from 'next/image'

interface Props {
  staff: (StaffClub & { clubes: Pick<Club, 'nombre' | 'nombre_corto'> })[]
  clubes: Pick<Club, 'id' | 'nombre'>[]
  rol: string
  userClubId: string | null
}

type CategoriaStaff = StaffCategoria

export default function StaffAdmin({ staff: initial, clubes, rol, userClubId }: Props) {
  const [staff, setStaff] = useState(initial)
  const [editing, setEditing] = useState<StaffClub | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [clubFiltro, setClubFiltro] = useState<string | null>(
    rol === 'editor_club' && userClubId ? userClubId : null
  )
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaStaff | 'all'>('all')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [existingFoto, setExistingFoto] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const availableClubs = rol === 'editor_club' && userClubId
    ? clubes.filter((c) => c.id === userClubId)
    : clubes

  const staffFiltrado = clubFiltro
    ? staff.filter((s) => s.club_id === clubFiltro)
    : staff

  const staffVisible = categoriaFiltro === 'all'
    ? staffFiltrado
    : staffFiltrado.filter((s) => getStaffCategory(s) === categoriaFiltro)

  function close() {
    setCreating(false); setEditing(null); setError(null)
    setFotoFile(null); setFotoPreview(null); setExistingFoto(null)
  }

  function openCreate() {
    setEditing(null); setCreating(true); setError(null); setSuccess(null)
    setFotoFile(null); setFotoPreview(null); setExistingFoto(null)
  }

  function openEdit(s: StaffClub) {
    setCreating(false); setEditing(s); setError(null); setSuccess(null)
    setFotoFile(null); setFotoPreview(null); setExistingFoto(s.foto_url ?? null)
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'staff/fotos')
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error || 'Error subiendo imagen')
    }
    return (await res.json()).url
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setSuccess(null)

    const fd = new FormData(e.currentTarget)
    const nombre = (fd.get('nombre') as string).trim()
    const cargo = (fd.get('cargo') as string).trim()
    const club_id = fd.get('club_id') as string
    const categoria = (fd.get('categoria') as string) as CategoriaStaff
    const orden = Number(fd.get('orden')) || 0

    if (!nombre || !cargo || !club_id || !categoria) {
      setError('Nombre, cargo, club y categoria son requeridos')
      return
    }

    let foto_url: string | null = existingFoto
    if (fotoFile) {
      try { foto_url = await uploadImage(fotoFile) }
      catch (err: any) { setError(err.message); return }
    }

    const payload = { nombre, cargo, club_id, categoria, orden, foto_url }
    const supabase = createClient()

    async function saveStaff() {
      if (editing) {
        return supabase.from('staff_clubes').update(payload).eq('id', editing.id)
      }
      return supabase.from('staff_clubes').insert(payload)
    }

    async function saveStaffWithoutCategoria() {
      const fallbackPayload = { nombre, cargo, club_id, orden, foto_url }
      if (editing) {
        return supabase.from('staff_clubes').update(fallbackPayload).eq('id', editing.id)
      }
      return supabase.from('staff_clubes').insert(fallbackPayload)
    }

    let result = await saveStaff()
    if (isMissingStaffCategoriaColumnError(result.error)) {
      result = await saveStaffWithoutCategoria()
    }

    if (result.error) {
      setError(result.error.message)
      return
    }

    setSuccess(editing ? `"${nombre}" actualizado` : `"${nombre}" creado`)

    startTransition(() => router.refresh())
    close()
    const { data } = await supabase
      .from('staff_clubes')
      .select('*, clubes(nombre, nombre_corto)')
      .order('orden')
    if (data) setStaff(data as any)
  }

  async function handleDelete(s: StaffClub) {
    if (!confirm(`¿Eliminar a "${s.nombre}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('staff_clubes').delete().eq('id', s.id)
    if (err) { setError(err.message); return }
    setStaff((prev) => prev.filter((x) => x.id !== s.id))
    setSuccess(`"${s.nombre}" eliminado`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing
  const editingCategoria = getStaffCategory({
    cargo: editing?.cargo ?? '',
    categoria: editing?.categoria ?? null,
  } as StaffClub)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">STAFF Y AUTORIDADES</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {staffVisible.length} miembro{staffVisible.length !== 1 ? 's' : ''}
            {clubFiltro && ` · ${clubes.find(c => c.id === clubFiltro)?.nombre ?? ''}`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" /> NUEVO
          </button>
        )}
      </div>

      {/* Club filter */}
      {rol !== 'editor_club' && clubes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setClubFiltro(null)}
            className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
              clubFiltro === null
                ? 'bg-lab-gold text-lab-navy font-bold'
                : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'
            }`}
          >
            Todos ({staff.length})
          </button>
          {clubes.map((c) => {
            const count = staff.filter((s) => s.club_id === c.id).length
            return (
              <button
                key={c.id}
                onClick={() => setClubFiltro(c.id)}
                className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
                  clubFiltro === c.id
                    ? 'bg-lab-gold text-lab-navy font-bold'
                    : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'
                }`}
              >
                {c.nombre} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setCategoriaFiltro('all')}
          className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
            categoriaFiltro === 'all'
              ? 'bg-lab-gold text-lab-navy font-bold'
              : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'
          }`}
        >
          Todos ({staffFiltrado.length})
        </button>
        {(Object.entries(STAFF_CATEGORIAS) as [CategoriaStaff, string][]).map(([key, label]) => {
          const count = staffFiltrado.filter((s) => getStaffCategory(s) === key).length
          return (
            <button
              key={key}
              onClick={() => setCategoriaFiltro(key)}
              className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
                categoriaFiltro === key
                  ? 'bg-lab-gold text-lab-navy font-bold'
                  : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'
              }`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg px-4 py-2.5 mb-4 text-lab-red text-sm font-condensed">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-4 py-2.5 mb-4 text-emerald-400 text-sm font-condensed">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-lab-surface border border-lab-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl tracking-widest text-lab-white">
              {editing ? 'EDITAR MIEMBRO' : 'NUEVO MIEMBRO'}
            </h2>
            <button onClick={close} className="p-1.5 rounded-md text-lab-muted hover:text-lab-white hover:bg-lab-surface-light transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Nombre *</label>
                <input name="nombre" type="text" defaultValue={editing?.nombre ?? ''} required
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors" />
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Cargo *</label>
                <input name="cargo" type="text" defaultValue={editing?.cargo ?? ''} required placeholder="Ej: Manager, Coach, Presidente"
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors" />
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Categoria *</label>
                <select name="categoria" defaultValue={editingCategoria}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                  <option value="cuerpo_tecnico">Cuerpo Tecnico</option>
                  <option value="autoridades">Autoridades</option>
                </select>
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Club *</label>
                <select name="club_id" defaultValue={editing?.club_id ?? (availableClubs[0]?.id ?? '')}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                  {availableClubs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Orden</label>
                <input name="orden" type="number" min="0" defaultValue={editing?.orden ?? staff.length}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors" />
              </div>
            </div>

            {/* Foto */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Foto</label>
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
                  <button type="button" onClick={() => fotoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider">
                    <Upload className="w-3.5 h-3.5" />
                    {existingFoto ? 'Cambiar foto' : 'Subir foto'}
                  </button>
                  <p className="font-condensed text-[10px] text-lab-muted mt-1">JPG o PNG, máx 5MB</p>
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-lab-gold text-lab-navy rounded-md font-condensed font-semibold text-sm tracking-wider uppercase hover:bg-lab-gold-light transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Guardar cambios' : 'Crear miembro'}
              </button>
              <button type="button" onClick={close}
                className="px-4 py-2 rounded-md border border-lab-border font-condensed text-sm text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-8"></th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Miembro</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Cargo</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Categoria</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Club</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {staffVisible.map((s) => (
                <tr key={s.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-2.5 text-lab-muted">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {s.foto_url ? (
                        <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-lab-border">
                          <Image src={s.foto_url} alt={s.nombre} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-lab-navy border border-lab-border flex items-center justify-center flex-shrink-0">
                          <span className="font-display text-sm text-lab-gold leading-none">
                            {s.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">{s.nombre}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-condensed text-sm text-lab-gray">{s.cargo}</td>
                  <td className="px-4 py-2.5 font-condensed text-sm text-lab-gray">
                    {STAFF_CATEGORIAS[getStaffCategory(s)]}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">
                    {(s as any).clubes?.nombre_corto ?? (s as any).clubes?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staffVisible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">
                    Sin miembros registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
