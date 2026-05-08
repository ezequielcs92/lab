'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Club, ColoresClub, Database, GaleriaClub } from '@/lib/database.types'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, ImageIcon, ArrowUp, ArrowDown } from 'lucide-react'
import Image from 'next/image'
import RichEditor from './RichEditor'

interface ClubesAdminProps {
  clubes: Club[]
  galeria: GaleriaClub[]
}

const EMPTY_COLORES: ColoresClub = { primario: '#0A1628', secundario: '#D4A843', acento: '#F8F6F1' }
const COLOR_KEYS: Array<keyof ColoresClub> = ['primario', 'secundario', 'acento']

export default function ClubesAdmin({ clubes: initial, galeria: initialGaleria }: ClubesAdminProps) {
  const [clubes, setClubes] = useState(initial)
  const [galeria, setGaleria] = useState(initialGaleria)
  const [editing, setEditing] = useState<Club | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [historia, setHistoria] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [existingLogo, setExistingLogo] = useState<string | null>(null)
  const [manualLogoUrl, setManualLogoUrl] = useState('')
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [isGalleryUploading, setIsGalleryUploading] = useState(false)
  const [isImportingLocal, setIsImportingLocal] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setHistoria('')
    setLogoFile(null); setLogoPreview(null); setExistingLogo(null)
    setManualLogoUrl('')
    setGalleryFiles([])
    setCreating(true)
    setError(null)
    setSuccess(null)
  }

  function openEdit(club: Club) {
    setCreating(false)
    setEditing(club)
    setHistoria(club.historia ?? '')
    setLogoFile(null); setLogoPreview(null); setExistingLogo(club.logo_url ?? null)
    setManualLogoUrl(club.logo_url ?? '')
    setGalleryFiles([])
    setError(null)
    setSuccess(null)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
    setLogoFile(null); setLogoPreview(null); setExistingLogo(null)
    setManualLogoUrl('')
    setGalleryFiles([])
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
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
    setError(null)
    setSuccess(null)

    const fd = new FormData(e.currentTarget)
    const nombre = (fd.get('nombre') as string).trim()
    const slug = (fd.get('slug') as string).trim()
    const nombre_corto = (fd.get('nombre_corto') as string).trim() || null
    const sede = (fd.get('sede') as string).trim() || null
    const estadio_nombre = (fd.get('estadio_nombre') as string).trim() || null
    const fundacion = fd.get('fundacion') ? Number(fd.get('fundacion')) : null
    const historiaVal = historia.trim() || null
    const contacto_email = (fd.get('contacto_email') as string).trim() || null
    const primario = (fd.get('color_primario') as string) || EMPTY_COLORES.primario
    const secundario = (fd.get('color_secundario') as string) || EMPTY_COLORES.secundario
    const acento = (fd.get('color_acento') as string) || EMPTY_COLORES.acento

    if (!nombre || !slug) {
      setError('Nombre y slug son requeridos')
      return
    }

    // Upload logo if a new file was selected
    let logo_url: string | null = existingLogo
    if (logoFile) {
      try {
        logo_url = await uploadImage(logoFile, 'clubes/logos')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error subiendo imagen')
        return
      }
    }

    const logoUrlManual = manualLogoUrl.trim()
    if (logoUrlManual) {
      logo_url = logoUrlManual
    }

    const payload = {
      nombre,
      slug,
      nombre_corto,
      sede,
      estadio_nombre,
      fundacion,
      historia: historiaVal,
      contacto_email,
      colores: { primario, secundario, acento } as ColoresClub,
      logo_url,
      banner_url: editing?.banner_url ?? null,
      redes_sociales: editing?.redes_sociales ?? {},
      activo: true,
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('clubes').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setClubes((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...payload } : c))
      setSuccess(`"${nombre}" actualizado`)
    } else {
      const { data, error: err } = await supabase.from('clubes').insert(payload).select().single()
      if (err) { setError(err.message); return }
      if (data) setClubes((prev) => [...prev, data])
      setSuccess(`"${nombre}" creado`)
    }

    startTransition(() => router.refresh())
    close()
  }

  function getCurrentGallery() {
    if (!editing) return []
    return galeria
      .filter((foto) => foto.club_id === editing.id)
      .sort((a, b) => a.orden - b.orden)
  }

  function handleGalleryFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    setGalleryFiles(selected)
  }

  async function handleUploadGalleryFiles() {
    if (!editing || galleryFiles.length === 0) return

    setError(null)
    setSuccess(null)
    setIsGalleryUploading(true)

    try {
      const existing = getCurrentGallery()
      let nextOrder = existing.length > 0 ? Math.max(...existing.map((f) => f.orden)) + 1 : 1
      const rowsToInsert: Database['public']['Tables']['galeria_clubes']['Insert'][] = []

      for (const file of galleryFiles) {
        const imagen_url = await uploadImage(file, `clubes/galeria/${editing.slug}`)
        rowsToInsert.push({
          club_id: editing.id,
          imagen_url,
          titulo: null,
          descripcion: null,
          orden: nextOrder,
        })
        nextOrder += 1
      }

      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('galeria_clubes')
        .insert(rowsToInsert)
        .select('*')

      if (err) {
        setError(err.message)
        return
      }

      if (data) {
        setGaleria((prev) => [...prev, ...data])
      }

      setGalleryFiles([])
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      setSuccess(`Se subieron ${rowsToInsert.length} fotos al álbum de ${editing.nombre}`)
      startTransition(() => router.refresh())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error subiendo fotos de galería')
    } finally {
      setIsGalleryUploading(false)
    }
  }

  async function handleImportLocalGallery() {
    if (!editing) return

    setError(null)
    setSuccess(null)
    setIsImportingLocal(true)

    try {
      const res = await fetch('/api/admin/clubes/import-local-gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId: editing.id,
          slug: editing.slug,
          replace: false,
        }),
      })

      const payload = await res.json()
      if (!res.ok) {
        setError(payload.error ?? 'No se pudieron importar fotos locales')
        return
      }

      const inserted = (payload.inserted ?? []) as GaleriaClub[]
      if (inserted.length > 0) {
        setGaleria((prev) => [...prev, ...inserted])
      }

      setSuccess(payload.message ?? `Importadas ${inserted.length} fotos locales`)
      startTransition(() => router.refresh())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error importando fotos locales')
    } finally {
      setIsImportingLocal(false)
    }
  }

  async function handleDeleteGalleryPhoto(foto: GaleriaClub) {
    if (!confirm('¿Eliminar esta foto del álbum?')) return

    const supabase = createClient()
    const { error: err } = await supabase.from('galeria_clubes').delete().eq('id', foto.id)
    if (err) {
      setError(err.message)
      return
    }

    setGaleria((prev) => prev.filter((item) => item.id !== foto.id))
    setSuccess('Foto eliminada del álbum')
    startTransition(() => router.refresh())
  }

  async function handleMoveGalleryPhoto(foto: GaleriaClub, direction: 'up' | 'down') {
    if (!editing) return

    const current = getCurrentGallery()
    const index = current.findIndex((item) => item.id === foto.id)
    if (index === -1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= current.length) return

    const target = current[targetIndex]
    const supabase = createClient()

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('galeria_clubes').update({ orden: target.orden }).eq('id', foto.id),
      supabase.from('galeria_clubes').update({ orden: foto.orden }).eq('id', target.id),
    ])

    if (e1 || e2) {
      setError(e1?.message ?? e2?.message ?? 'No se pudo reordenar la galería')
      return
    }

    setGaleria((prev) =>
      prev.map((item) => {
        if (item.id === foto.id) return { ...item, orden: target.orden }
        if (item.id === target.id) return { ...item, orden: foto.orden }
        return item
      })
    )
    startTransition(() => router.refresh())
  }

  async function handleGalleryTitleUpdate(foto: GaleriaClub, titulo: string) {
    const cleanTitle = titulo.trim() || null
    const supabase = createClient()
    const { error: err } = await supabase
      .from('galeria_clubes')
      .update({ titulo: cleanTitle })
      .eq('id', foto.id)

    if (err) {
      setError(err.message)
      return
    }

    setGaleria((prev) => prev.map((item) => (item.id === foto.id ? { ...item, titulo: cleanTitle } : item)))
  }

  async function handleDelete(club: Club) {
    if (!confirm(`¿Eliminar "${club.nombre}"? Esta acción no se puede deshacer.`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('clubes').delete().eq('id', club.id)
    if (err) { setError(err.message); return }
    setClubes((prev) => prev.filter((c) => c.id !== club.id))
    setSuccess(`"${club.nombre}" eliminado`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing
  const galleryItems = getCurrentGallery()

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">CLUBES</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {clubes.length} {clubes.length === 1 ? 'club registrado' : 'clubes registrados'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          NUEVO CLUB
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

      {/* Table — dense, utilitarian like a roster sheet */}
      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Club</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Sede</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Fund.</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Colores</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {clubes.map((club) => (
                <tr key={club.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {club.logo_url ? (
                        <div className="relative w-8 h-8 rounded overflow-hidden bg-lab-navy flex-shrink-0">
                          <Image src={club.logo_url} alt={club.nombre} fill className="object-contain p-0.5" />
                        </div>
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center font-display text-sm leading-none flex-shrink-0"
                          style={{
                            backgroundColor: (club.colores as ColoresClub)?.primario ?? '#0A1628',
                            color: (club.colores as ColoresClub)?.secundario ?? '#D4A843',
                          }}
                        >
                          {club.nombre_corto?.[0] ?? club.nombre[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide">{club.nombre}</p>
                        <p className="font-condensed text-[11px] text-lab-muted">/{club.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-condensed text-sm text-lab-gray">{club.sede ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-condensed text-sm text-lab-gray">{club.fundacion ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {COLOR_KEYS.map((key) => (
                        <div
                          key={key}
                          className="w-5 h-5 rounded border border-lab-border"
                          style={{ backgroundColor: (club.colores as ColoresClub | null)?.[key] ?? '#333' }}
                          title={key}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(club)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(club)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {clubes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">
                    Sin clubes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form modal overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-20 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-lg p-6 relative mb-20">
            <button
              onClick={close}
              className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR CLUB' : 'NUEVO CLUB'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Nombre *" name="nombre" defaultValue={editing?.nombre} />
              <FormField label="Slug *" name="slug" defaultValue={editing?.slug} placeholder="ej: yankees-ba" />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Nombre Corto" name="nombre_corto" defaultValue={editing?.nombre_corto ?? ''} placeholder="Ej: YNK" />
                <FormField label="Fundación" name="fundacion" type="number" defaultValue={editing?.fundacion ?? ''} />
              </div>
              <FormField label="Sede" name="sede" defaultValue={editing?.sede ?? ''} />
              <FormField label="Estadio" name="estadio_nombre" defaultValue={editing?.estadio_nombre ?? ''} />
              <FormField label="Email de Contacto" name="contacto_email" type="email" defaultValue={editing?.contacto_email ?? ''} />

              {/* Logo upload */}
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Logo del Club</label>
                <div className="flex items-center gap-4">
                  {(logoPreview || existingLogo) ? (
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-lab-border bg-lab-navy">
                      <Image src={logoPreview ?? existingLogo!} alt="Logo" fill className="object-contain p-1" />
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
                      {existingLogo ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    <p className="font-condensed text-[10px] text-lab-muted mt-1">PNG o SVG recomendado, máx 5MB</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">URL del Logo (opcional)</label>
                  <input
                    type="text"
                    value={manualLogoUrl}
                    onChange={(e) => setManualLogoUrl(e.target.value)}
                    placeholder="https://... o /clubes/logos/arias.svg"
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualLogoUrl(`/clubes/logos/${editing?.slug ?? 'club'}.svg`)}
                      className="px-3 py-1.5 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider"
                    >
                      USAR LOGO LOCAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualLogoUrl('')}
                      className="px-3 py-1.5 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider"
                    >
                      LIMPIAR URL
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Álbum de fotos del equipo</label>
                  {editing && (
                    <span className="font-condensed text-xs text-lab-muted">{galleryItems.length} foto(s)</span>
                  )}
                </div>

                {!editing ? (
                  <div className="bg-lab-navy border border-lab-border rounded-lg px-3 py-3 font-condensed text-xs text-lab-muted tracking-wide">
                    Guardá el club primero para administrar el álbum de fotos.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        SELECCIONAR FOTOS
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadGalleryFiles}
                        disabled={isGalleryUploading || galleryFiles.length === 0}
                        className="flex items-center gap-2 px-3 py-2 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider disabled:opacity-50"
                      >
                        {isGalleryUploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        SUBIR AL ÁLBUM
                      </button>
                      <button
                        type="button"
                        onClick={handleImportLocalGallery}
                        disabled={isImportingLocal}
                        className="flex items-center gap-2 px-3 py-2 border border-lab-border rounded-lg font-condensed text-xs text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors tracking-wider disabled:opacity-50"
                      >
                        {isImportingLocal && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        IMPORTAR FOTOS LOCALES
                      </button>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGalleryFileSelection}
                      />
                    </div>

                    {galleryFiles.length > 0 && (
                      <p className="font-condensed text-xs text-lab-muted">
                        Seleccionadas para subir: {galleryFiles.length} archivo(s)
                      </p>
                    )}

                    {galleryItems.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                        {galleryItems.map((foto, index) => (
                          <div key={foto.id} className="bg-lab-navy border border-lab-border rounded-lg p-2 space-y-2">
                            <div className="relative aspect-video rounded-md overflow-hidden bg-lab-surface border border-lab-border">
                              <Image
                                src={foto.imagen_url}
                                alt={foto.titulo ?? `Foto ${index + 1}`}
                                fill
                                sizes="(min-width: 1024px) 25vw, 50vw"
                                className="object-cover"
                              />
                            </div>
                            <input
                              type="text"
                              defaultValue={foto.titulo ?? ''}
                              placeholder="Título (opcional)"
                              onBlur={(e) => handleGalleryTitleUpdate(foto, e.target.value)}
                              className="w-full bg-lab-surface border border-lab-border rounded px-2 py-1.5 text-xs text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveGalleryPhoto(foto, 'up')}
                                  className="p-1 rounded border border-lab-border text-lab-muted hover:text-lab-white"
                                  title="Mover arriba"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveGalleryPhoto(foto, 'down')}
                                  className="p-1 rounded border border-lab-border text-lab-muted hover:text-lab-white"
                                  title="Mover abajo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteGalleryPhoto(foto)}
                                className="p-1 rounded border border-lab-border text-lab-muted hover:text-lab-red"
                                title="Eliminar foto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-lab-navy border border-lab-border rounded-lg px-3 py-4 font-condensed text-xs text-lab-muted tracking-wide text-center">
                        Este club todavía no tiene fotos en su álbum.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Colores del club</label>
                <div className="grid grid-cols-3 gap-3">
                  <ColorField label="Primario" name="color_primario" defaultValue={(editing?.colores as ColoresClub)?.primario ?? EMPTY_COLORES.primario} />
                  <ColorField label="Secundario" name="color_secundario" defaultValue={(editing?.colores as ColoresClub)?.secundario ?? EMPTY_COLORES.secundario} />
                  <ColorField label="Acento" name="color_acento" defaultValue={(editing?.colores as ColoresClub)?.acento ?? EMPTY_COLORES.acento} />
                </div>
              </div>

              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Historia</label>
                <RichEditor value={historia} onChange={setHistoria} height={200} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR CAMBIOS' : 'CREAR CLUB'}
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

function FormField({
  label,
  name,
  type = 'text',
  defaultValue = '',
  placeholder,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string | number
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
      />
    </div>
  )
}

function ColorField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <div>
      <label className="block font-condensed text-[10px] tracking-wider text-lab-muted mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" name={name} defaultValue={defaultValue} className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" />
        <span className="font-condensed text-xs text-lab-gray">{defaultValue}</span>
      </div>
    </div>
  )
}
