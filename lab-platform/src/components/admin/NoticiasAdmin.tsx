'use client'

import { useState, useRef, useCallback, useTransition } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Noticia, Club } from '@/lib/database.types'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Eye, EyeOff, Upload, ImageIcon, Star } from 'lucide-react'

const TINYMCE_API_KEY = 'vw1ypnbl6ql8xs11n5r66qpu9057j3z65jcc2xfufsx3auq7'

interface Props {
  noticias: (Noticia & { clubes: Pick<Club, 'nombre'> | null })[]
  clubes: Pick<Club, 'id' | 'nombre'>[]
  rol: string
  userClubId: string | null
}

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export default function NoticiasAdmin({ noticias: initial, clubes, rol, userClubId }: Props) {
  const [noticias, setNoticias] = useState(initial)
  const [editing, setEditing] = useState<Noticia | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [titulo, setTitulo] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [extracto, setExtracto] = useState('')
  const [clubId, setClubId] = useState('')
  const [publicada, setPublicada] = useState(false)
  const [destacada, setDestacada] = useState(false)
  const [contenido, setContenido] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [existingCover, setExistingCover] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openCreate() {
    setEditing(null)
    setTitulo(''); setSlug(''); setSlugManual(false)
    setExtracto(''); setClubId(''); setPublicada(false)
    setDestacada(false); setContenido('')
    setCoverFile(null); setCoverPreview(null); setExistingCover(null)
    setError(null); setCreating(true)
  }

  function openEdit(n: Noticia) {
    setCreating(false)
    setEditing(n)
    setTitulo(n.titulo); setSlug(n.slug); setSlugManual(true)
    setExtracto(n.extracto ?? ''); setClubId(n.club_id ?? '')
    setPublicada(n.publicada); setDestacada(n.destacada)
    setContenido(n.contenido)
    setCoverFile(null); setCoverPreview(null)
    setExistingCover(n.imagen_url ?? null)
    setError(null)
  }

  function close() { setCreating(false); setEditing(null); setError(null) }

  function handleTituloChange(val: string) {
    setTitulo(val)
    if (!slugManual) setSlug(toSlug(val))
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  // Upload image to Supabase Storage → returns public URL
  async function uploadImage(supabase: ReturnType<typeof createClient>, file: File, folder: string): Promise<string> {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: false })
    if (error) throw new Error(`Error subiendo imagen: ${error.message}`)
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path)
    return publicUrl
  }

  // TinyMCE inline image upload handler
  const imagesUploadHandler = useCallback(async (blobInfo: any): Promise<string> => {
    const supabase = createClient()
    const file = new File([blobInfo.blob()], blobInfo.filename(), { type: blobInfo.blob().type })
    return uploadImage(supabase, file, 'noticias/contenido')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !slug.trim() || !contenido.trim()) {
      setError('Título, slug y contenido son requeridos')
      return
    }
    setSaving(true); setError(null)

    try {
      const supabase = createClient()
      let imagen_url: string | null = existingCover

      if (coverFile) {
        imagen_url = await uploadImage(supabase, coverFile, 'noticias/portadas')
      }

      const payload = {
        titulo: titulo.trim(),
        slug: slug.trim(),
        extracto: extracto.trim() || null,
        contenido,
        club_id: clubId || null,
        publicada,
        destacada,
        imagen_url,
        autor_id: null,
        fecha_publicacion: editing?.fecha_publicacion ?? new Date().toISOString(),
      }

      if (editing) {
        const { error: err } = await supabase.from('noticias').update(payload).eq('id', editing.id)
        if (err) throw new Error(err.message)
        setSuccess(`"${titulo}" actualizada`)
      } else {
        const { error: err } = await supabase.from('noticias').insert(payload)
        if (err) throw new Error(err.message)
        setSuccess(`"${titulo}" creada`)
      }

      startTransition(() => router.refresh())
      close()
      const { data } = await supabase.from('noticias').select('*, clubes(nombre)').order('created_at', { ascending: false })
      if (data) setNoticias(data as any)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublicada(n: Noticia) {
    const supabase = createClient()
    const { error: err } = await supabase.from('noticias').update({ publicada: !n.publicada }).eq('id', n.id)
    if (err) { setError(err.message); return }
    setNoticias((prev) => prev.map((x) => x.id === n.id ? { ...x, publicada: !x.publicada } : x))
    startTransition(() => router.refresh())
  }

  async function handleDelete(n: Noticia) {
    if (!confirm(`¿Eliminar "${n.titulo}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('noticias').delete().eq('id', n.id)
    if (err) { setError(err.message); return }
    setNoticias((prev) => prev.filter((x) => x.id !== n.id))
    setSuccess(`"${n.titulo}" eliminada`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing !== null

  if (showForm) {
    return (
      <div className="h-full flex flex-col">
        {/* Editor topbar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-lab-border flex-shrink-0">
          <h1 className="font-display text-2xl tracking-widest text-lab-white">
            {editing ? 'EDITAR NOTICIA' : 'NUEVA NOTICIA'}
          </h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              className="px-4 py-2 font-condensed text-sm tracking-wider text-lab-muted hover:text-lab-white border border-lab-border rounded-lg transition-colors"
            >
              CANCELAR
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-5 py-2 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editing ? 'GUARDAR CAMBIOS' : 'PUBLICAR'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg px-4 py-2.5 mb-4 text-lab-red text-sm flex-shrink-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-6 flex-1 min-h-0">
          {/* Left sidebar — metadata */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pb-4">
            {/* Cover image */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">
                Imagen de portada
              </label>
              <div
                className="relative w-full aspect-video rounded-lg border-2 border-dashed border-lab-border hover:border-lab-gold/50 transition-colors cursor-pointer overflow-hidden bg-lab-navy group"
                onClick={() => coverInputRef.current?.click()}
              >
                {(coverPreview || existingCover) ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreview ?? existingCover!}
                      alt="Portada"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-lab-muted group-hover:text-lab-gold transition-colors">
                    <ImageIcon className="w-8 h-8" />
                    <span className="font-condensed text-[11px] tracking-wider">CLICK PARA SUBIR</span>
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverChange}
              />
              {(coverPreview || existingCover) && (
                <button
                  type="button"
                  className="mt-1 text-[11px] font-condensed text-lab-muted hover:text-lab-red transition-colors tracking-wide"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); setExistingCover(null) }}
                >
                  Quitar imagen
                </button>
              )}
            </div>

            {/* Slug */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Slug *</label>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }}
                placeholder="url-de-la-nota"
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2 text-xs text-lab-white font-mono placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
              />
            </div>

            {/* Club */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Club</label>
              <select
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
              >
                <option value="">General / Liga</option>
                {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Extracto */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Extracto / Bajada</label>
              <textarea
                rows={3}
                value={extracto}
                onChange={(e) => setExtracto(e.target.value)}
                placeholder="Resumen breve que aparece en la lista de noticias..."
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors resize-none"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-lab-muted" />
                  <span className="font-condensed text-sm text-lab-gray tracking-wide">Publicada</span>
                </div>
                <div
                  onClick={() => setPublicada(!publicada)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${publicada ? 'bg-lab-gold' : 'bg-lab-border'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${publicada ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-lab-muted" />
                  <span className="font-condensed text-sm text-lab-gray tracking-wide">Destacada</span>
                </div>
                <div
                  onClick={() => setDestacada(!destacada)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${destacada ? 'bg-lab-gold' : 'bg-lab-border'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${destacada ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            </div>
          </div>

          {/* Right — title + TinyMCE editor */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto pb-4">
            <div>
              <input
                value={titulo}
                onChange={(e) => handleTituloChange(e.target.value)}
                placeholder="Título de la noticia..."
                className="w-full bg-transparent border-b border-lab-border pb-3 text-2xl font-display tracking-wider text-lab-white placeholder:text-lab-muted/40 focus:outline-none focus:border-lab-gold/60 transition-colors"
              />
            </div>
            <div className="flex-1 rounded-lg overflow-hidden border border-lab-border min-h-[500px]">
              <Editor
                apiKey={TINYMCE_API_KEY}
                value={contenido}
                onEditorChange={(val) => setContenido(val)}
                init={{
                  height: '100%',
                  min_height: 500,
                  menubar: true,
                  skin: 'oxide-dark',
                  content_css: 'dark',
                  plugins: [
                    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                    'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount',
                  ],
                  toolbar:
                    'undo redo | formatselect | bold italic underline | ' +
                    'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                    'bullist numlist outdent indent | link image media | removeformat | fullscreen code | help',
                  image_advtab: true,
                  image_uploadtab: true,
                  images_upload_handler: imagesUploadHandler,
                  automatic_uploads: true,
                  file_picker_types: 'image',
                  content_style: `
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.7; }
                    img { max-width: 100%; height: auto; border-radius: 6px; }
                  `,
                  branding: false,
                  promotion: false,
                }}
              />
            </div>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">NOTICIAS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {noticias.length} artículo{noticias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> NUEVA NOTICIA
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

      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Título</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Club</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Estado</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-28">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {noticias.map((n) => (
                <tr key={n.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {n.imagen_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.imagen_url} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide truncate max-w-xs">{n.titulo}</p>
                        {n.destacada && <span className="font-condensed text-[9px] tracking-wider text-lab-gold uppercase">★ Destacada</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-sm text-lab-gray">
                    {(n as any).clubes?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 font-condensed text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded ${
                      n.publicada ? 'bg-emerald-400/10 text-emerald-400' : 'bg-lab-muted/10 text-lab-muted'
                    }`}>
                      {n.publicada ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {n.publicada ? 'Publ.' : 'Borr.'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-[11px] text-lab-muted">
                    {new Date(n.fecha_publicacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => togglePublicada(n)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title={n.publicada ? 'Despublicar' : 'Publicar'}>
                        {n.publicada ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => openEdit(n)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(n)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {noticias.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">Sin noticias</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
