'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, FileText, Upload, Loader2, AlertCircle, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Documento {
  id: string
  titulo: string
  descripcion: string | null
  archivo_url: string
  tipo: string | null
  fecha_documento: string | null
  publico: boolean
  created_at: string
}

interface Props {
  documentos: Documento[]
}

const TIPOS = ['reglamento', 'circular', 'acta', 'condiciones', 'otro']

export default function DocumentosAdmin({ documentos: initial }: Props) {
  const [documentos, setDocumentos] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState('reglamento')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [publico, setPublico] = useState(true)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function openForm() {
    setTitulo(''); setDescripcion(''); setTipo('reglamento')
    setFecha(new Date().toISOString().slice(0, 10)); setPublico(true)
    setPdfFile(null); setError(null); setShowForm(true)
  }

  function closeForm() { setShowForm(false); setError(null) }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF')
      return
    }
    setPdfFile(file)
    setError(null)
    if (!titulo) setTitulo(file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim()) { setError('El título es requerido'); return }
    if (!pdfFile) { setError('Seleccioná un archivo PDF'); return }

    setSaving(true); setError(null)

    try {
      // Upload PDF
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('folder', 'documentos')

      const uploadRes = await fetch('/api/upload-doc', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Error al subir el PDF')

      // Insert into DB
      const supabase = createClient()
      const { error: dbErr } = await supabase.from('documentos').insert({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        archivo_url: uploadData.url,
        tipo: tipo || null,
        fecha_documento: fecha || null,
        publico,
      })
      if (dbErr) throw new Error(dbErr.message)

      setSuccess(`"${titulo}" subido correctamente`)
      startTransition(() => router.refresh())
      closeForm()

      const { data } = await supabase.from('documentos').select('*').order('fecha_documento', { ascending: false })
      if (data) setDocumentos(data as Documento[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.titulo}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('documentos').delete().eq('id', doc.id)
    if (err) { setError(err.message); return }
    setDocumentos((prev) => prev.filter((d) => d.id !== doc.id))
    setSuccess(`"${doc.titulo}" eliminado`)
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-lab-border">
        <h1 className="font-display text-2xl tracking-widest text-lab-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-lab-gold" />
          DOCUMENTOS OFICIALES
        </h1>
        {!showForm && (
          <button
            onClick={openForm}
            className="flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" /> SUBIR PDF
          </button>
        )}
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5 mb-4 text-green-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
          <button onClick={() => setSuccess(null)} className="ml-auto"><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-lab-surface border border-lab-border rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-display text-lg tracking-widest text-lab-white mb-2">NUEVO DOCUMENTO</h2>

          {error && (
            <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg px-4 py-2.5 text-lab-red text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* PDF file picker */}
          <div>
            <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">
              Archivo PDF *
            </label>
            <div
              className="relative border-2 border-dashed border-lab-border hover:border-lab-gold/50 rounded-lg p-6 text-center cursor-pointer transition-colors group"
              onClick={() => fileInputRef.current?.click()}
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-6 h-6 text-lab-gold" />
                  <span className="font-condensed text-lab-white text-sm">{pdfFile.name}</span>
                  <span className="text-lab-muted text-xs">({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-lab-muted group-hover:text-lab-gold transition-colors">
                  <Upload className="w-8 h-8" />
                  <span className="font-condensed text-sm tracking-wider">CLICK PARA SELECCIONAR PDF</span>
                  <span className="text-xs">Máximo 20MB</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <div className="md:col-span-2">
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Título *</label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Reglamento Temporada 2026-2027"
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            {/* Fecha */}
            <div>
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Fecha del documento</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors"
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Descripción (opcional)</label>
              <textarea
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripción del documento..."
                className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors resize-none"
              />
            </div>

            {/* Público toggle */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => setPublico(!publico)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${publico ? 'bg-lab-gold' : 'bg-lab-border'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${publico ? 'left-5' : 'left-0.5'}`} />
              </div>
              <span className="font-condensed text-sm text-lab-gray tracking-wide">Visible al público</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 font-condensed text-sm tracking-wider text-lab-muted hover:text-lab-white border border-lab-border rounded-lg transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-5 py-2 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {saving ? 'SUBIENDO...' : 'SUBIR DOCUMENTO'}
            </button>
          </div>
        </form>
      )}

      {/* Document list */}
      {documentos.length === 0 ? (
        <div className="text-center py-16 bg-lab-surface border border-lab-border rounded-xl">
          <FileText className="w-10 h-10 text-lab-muted/30 mx-auto mb-3" />
          <p className="font-condensed text-lab-muted tracking-wider">No hay documentos cargados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 bg-lab-surface border border-lab-border rounded-lg p-4 hover:border-lab-gold/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-lab-gold/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-lab-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-condensed font-semibold text-lab-white tracking-wide truncate">{doc.titulo}</h3>
                <div className="flex items-center gap-3 mt-1">
                  {doc.tipo && (
                    <span className="px-2 py-0.5 rounded bg-lab-navy font-condensed text-[10px] tracking-widest uppercase text-lab-gold">
                      {doc.tipo}
                    </span>
                  )}
                  {doc.fecha_documento && (
                    <span className="font-condensed text-[11px] text-lab-muted">
                      {format(new Date(doc.fecha_documento + 'T12:00:00'), "d MMM yyyy", { locale: es })}
                    </span>
                  )}
                  {!doc.publico && (
                    <span className="px-2 py-0.5 rounded bg-lab-border font-condensed text-[10px] tracking-widest uppercase text-lab-muted">
                      Oculto
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={doc.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 font-condensed text-xs tracking-wider text-lab-gold border border-lab-gold/30 rounded-lg hover:bg-lab-gold/10 transition-colors"
                >
                  VER
                </a>
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1.5 text-lab-muted hover:text-lab-red transition-colors rounded-lg hover:bg-lab-red/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
