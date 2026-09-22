'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Sponsor, SponsorLocation } from '@/lib/database.types'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { safeExternalUrl, safeImageUrl, SPONSOR_LOCATIONS } from '@/lib/sponsors'

interface Props {
  sponsors: Sponsor[]
}

const MAX_UPLOAD_SIZE = 20 * 1024 * 1024 // 20MB

export default function SponsorsAdmin({ sponsors: initial }: Props) {
  const [sponsors, setSponsors] = useState(initial)
  const [editing, setEditing] = useState<Sponsor | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [nombre, setNombre] = useState('')
  const [destinoUrl, setDestinoUrl] = useState('')
  const [ubicacion, setUbicacion] = useState<SponsorLocation>('home_top')
  const [orden, setOrden] = useState(0)
  const [activo, setActivo] = useState(true)
  const [vigenciaInicio, setVigenciaInicio] = useState('')
  const [vigenciaFin, setVigenciaFin] = useState('')
  const [manualLogoUrl, setManualLogoUrl] = useState('')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function resetForm() {
    setNombre('')
    setDestinoUrl('')
    setUbicacion('home_top')
    setOrden(0)
    setActivo(true)
    setVigenciaInicio('')
    setVigenciaFin('')
    setManualLogoUrl('')
    setLogoFile(null)
    setLogoPreview(null)
  }

  function openCreate() {
    resetForm()
    setEditing(null)
    setCreating(true)
    setError(null)
    setSuccess(null)
  }

  function openEdit(sponsor: Sponsor) {
    setCreating(false)
    setEditing(sponsor)
    setNombre(sponsor.nombre)
    setDestinoUrl(sponsor.destino_url ?? '')
    setUbicacion(sponsor.ubicacion)
    setOrden(sponsor.orden)
    setActivo(sponsor.activo)
    setVigenciaInicio(sponsor.vigencia_inicio ?? '')
    setVigenciaFin(sponsor.vigencia_fin ?? '')
    setManualLogoUrl(sponsor.logo_url)
    setLogoFile(null)
    setLogoPreview(null)
    setError(null)
    setSuccess(null)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
    resetForm()
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_UPLOAD_SIZE) {
      setError('El logo supera los 20MB permitidos')
      setLogoFile(null)
      setLogoPreview(null)
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setManualLogoUrl('')
    setError(null)
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const nombreClean = nombre.trim()
    if (!nombreClean) {
      setError('El nombre es requerido')
      return
    }

    let logo_url = manualLogoUrl.trim()
    if (logoFile) {
      try {
        logo_url = await uploadImage(logoFile, 'sponsors')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error subiendo logo')
        return
      }
    }

    if (!logo_url) {
      setError('El logo es requerido')
      return
    }
    if (!safeImageUrl(logo_url)) {
      setError('La URL del logo debe usar HTTPS')
      return
    }

    const destinationUrl = destinoUrl.trim()
    if (destinationUrl && !safeExternalUrl(destinationUrl)) {
      setError('La URL de destino debe usar HTTP o HTTPS')
      return
    }
    if (activo && ubicacion === 'home_top' && sponsors.filter((s) => s.activo && s.ubicacion === 'home_top' && s.id !== editing?.id).length >= 2) {
      setError('La portada superior admite hasta dos sponsors principales activos')
      return
    }

    const payload = {
      nombre: nombreClean,
      logo_url,
      destino_url: destinationUrl || null,
      ubicacion,
      orden: Number(orden) || 0,
      activo,
      vigencia_inicio: vigenciaInicio || null,
      vigencia_fin: vigenciaFin || null,
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('sponsors').update(payload).eq('id', editing.id)
      if (err) {
        setError(err.message)
        return
      }
      setSponsors((prev) =>
        prev
          .map((s) => (s.id === editing.id ? { ...s, ...payload } : s))
          .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
      )
      setSuccess(`"${nombreClean}" actualizado`)
    } else {
      const { data, error: err } = await supabase.from('sponsors').insert(payload).select().single()
      if (err) {
        setError(err.message)
        return
      }
      if (data) setSponsors((prev) => [...prev, data].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)))
      setSuccess(`"${nombreClean}" creado`)
    }

    startTransition(() => router.refresh())
    close()
  }

  async function handleDelete(sponsor: Sponsor) {
    if (!confirm(`¿Eliminar "${sponsor.nombre}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('sponsors').delete().eq('id', sponsor.id)
    if (err) {
      setError(err.message)
      return
    }
    setSponsors((prev) => prev.filter((s) => s.id !== sponsor.id))
    setSuccess(`"${sponsor.nombre}" eliminado`)
    startTransition(() => router.refresh())
  }

  function locationLabel(value: SponsorLocation) {
    return SPONSOR_LOCATIONS.find((l) => l.value === value)?.label ?? value
  }

  const showForm = creating || editing

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">SPONSORS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {sponsors.length} {sponsors.length === 1 ? 'sponsor registrado' : 'sponsors registrados'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          NUEVO SPONSOR
        </button>
      </div>

      {/* Feedback */}
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

      {/* Table */}
      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-16">Orden</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Sponsor</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Ubicación</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Vigencia</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {sponsors.map((sponsor) => (
                <tr key={sponsor.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-condensed text-sm text-lab-gray">{sponsor.orden}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-lab-navy flex-shrink-0 border border-lab-border">
                        <Image src={sponsor.logo_url} alt={sponsor.nombre} fill className="object-contain p-0.5" />
                      </div>
                      <div>
                        <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">{sponsor.nombre}</p>
                        {!sponsor.activo && (
                          <span className="px-1.5 py-0.5 rounded bg-lab-border font-condensed text-[10px] tracking-widest uppercase text-lab-muted">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded bg-lab-navy font-condensed text-[10px] tracking-widest uppercase text-lab-gold">
                      {locationLabel(sponsor.ubicacion)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-condensed text-xs text-lab-gray">
                      {sponsor.vigencia_inicio && sponsor.vigencia_fin
                        ? `${sponsor.vigencia_inicio} / ${sponsor.vigencia_fin}`
                        : sponsor.vigencia_inicio
                        ? `Desde ${sponsor.vigencia_inicio}`
                        : sponsor.vigencia_fin
                        ? `Hasta ${sponsor.vigencia_fin}`
                        : 'Sin vigencia'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(sponsor)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(sponsor)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sponsors.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">
                    Sin sponsors registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-20 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-2xl p-6 relative mb-20">
            <button onClick={close} className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors">
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR SPONSOR' : 'NUEVO SPONSOR'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo upload */}
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Logo *</label>
                <div className="flex items-center gap-4">
                  {(logoPreview || safeImageUrl(manualLogoUrl)) ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-lab-border bg-lab-navy">
                      <Image src={logoPreview ?? safeImageUrl(manualLogoUrl)!} alt="Logo" fill className="object-contain p-1" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-dashed border-lab-border bg-lab-navy flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-lab-muted" />
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {manualLogoUrl ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    <p className="font-condensed text-[10px] text-lab-muted mt-1">JPG, PNG, WebP o GIF, máx 20MB</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-1.5">URL del Logo (opcional)</label>
                  <input
                    type="text"
                    value={manualLogoUrl}
                    onChange={(e) => {
                      setManualLogoUrl(e.target.value)
                      if (e.target.value) {
                        setLogoFile(null)
                        setLogoPreview(null)
                      }
                    }}
                    placeholder="https://..."
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Nombre *</label>
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Sponsor Oficial"
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">URL de destino</label>
                  <input
                    type="url"
                    value={destinoUrl}
                    onChange={(e) => setDestinoUrl(e.target.value)}
                    placeholder="https://sponsor.com"
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Ubicación</label>
                  <select
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value as SponsorLocation)}
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
                  >
                    {SPONSOR_LOCATIONS.map((loc) => (
                      <option key={loc.value} value={loc.value}>{loc.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Orden</label>
                  <input
                    type="number"
                    value={orden}
                    onChange={(e) => setOrden(Number(e.target.value))}
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Vigencia inicio</label>
                  <input
                    type="date"
                    value={vigenciaInicio}
                    onChange={(e) => setVigenciaInicio(e.target.value)}
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Vigencia fin</label>
                  <input
                    type="date"
                    value={vigenciaFin}
                    onChange={(e) => setVigenciaFin(e.target.value)}
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 md:col-span-2">
                  <div
                    onClick={() => setActivo(!activo)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${activo ? 'bg-lab-gold' : 'bg-lab-border'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${activo ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="font-condensed text-sm text-lab-gray tracking-wide">Activo</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR CAMBIOS' : 'CREAR SPONSOR'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2.5 font-condensed text-sm tracking-wider text-lab-muted hover:text-lab-white border border-lab-border rounded-lg transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
