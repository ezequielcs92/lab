'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Club, ColoresClub } from '@/lib/database.types'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Upload, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import RichEditor from './RichEditor'

interface ClubesAdminProps {
  clubes: Club[]
}

const EMPTY_COLORES: ColoresClub = { primario: '#0A1628', secundario: '#D4A843', acento: '#F8F6F1' }

export default function ClubesAdmin({ clubes: initial }: ClubesAdminProps) {
  const [clubes, setClubes] = useState(initial)
  const [editing, setEditing] = useState<Club | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [historia, setHistoria] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [existingLogo, setExistingLogo] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setHistoria('')
    setLogoFile(null); setLogoPreview(null); setExistingLogo(null)
    setCreating(true)
    setError(null)
    setSuccess(null)
  }

  function openEdit(club: Club) {
    setCreating(false)
    setEditing(club)
    setHistoria(club.historia ?? '')
    setLogoFile(null); setLogoPreview(null); setExistingLogo(club.logo_url ?? null)
    setError(null)
    setSuccess(null)
  }

  function close() {
    setCreating(false)
    setEditing(null)
    setError(null)
    setLogoFile(null); setLogoPreview(null); setExistingLogo(null)
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
      } catch (err: any) {
        setError(err.message)
        return
      }
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
                      {['primario', 'secundario', 'acento'].map((key) => (
                        <div
                          key={key}
                          className="w-5 h-5 rounded border border-lab-border"
                          style={{ backgroundColor: (club.colores as any)?.[key] ?? '#333' }}
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
