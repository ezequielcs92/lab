'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Noticia, Club } from '@/lib/database.types'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'

interface Props {
  noticias: (Noticia & { clubes: Pick<Club, 'nombre'> | null })[]
  clubes: Pick<Club, 'id' | 'nombre'>[]
  rol: string
  userClubId: string | null
}

export default function NoticiasAdmin({ noticias: initial, clubes, rol, userClubId }: Props) {
  const [noticias, setNoticias] = useState(initial)
  const [editing, setEditing] = useState<Noticia | null>(null)
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
    const titulo = (fd.get('titulo') as string).trim()
    const slug = (fd.get('slug') as string).trim()
    const extracto = (fd.get('extracto') as string).trim() || null
    const contenido = (fd.get('contenido') as string).trim()
    const club_id = (fd.get('club_id') as string) || null
    const publicada = fd.get('publicada') === 'on'
    const destacada = fd.get('destacada') === 'on'

    if (!titulo || !slug || !contenido) {
      setError('Título, slug y contenido son requeridos')
      return
    }

    const payload = {
      titulo, slug, extracto, contenido, club_id,
      publicada, destacada,
      imagen_url: null, autor_id: null,
      fecha_publicacion: new Date().toISOString(),
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('noticias').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setSuccess(`"${titulo}" actualizada`)
    } else {
      const { error: err } = await supabase.from('noticias').insert(payload)
      if (err) { setError(err.message); return }
      setSuccess(`"${titulo}" creada`)
    }

    startTransition(() => router.refresh())
    close()
    const { data } = await supabase.from('noticias').select('*, clubes(nombre)').order('created_at', { ascending: false })
    if (data) setNoticias(data as any)
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

  const showForm = creating || editing

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
          onClick={() => { setEditing(null); setCreating(true); setError(null); setSuccess(null) }}
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
                    <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide truncate max-w-xs">{n.titulo}</p>
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
                      <button onClick={() => { setCreating(false); setEditing(n); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
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

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-12 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-2xl p-6 relative mb-20">
            <button onClick={close} className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR NOTICIA' : 'NUEVA NOTICIA'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Título *" name="titulo" defaultValue={editing?.titulo ?? ''} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Slug *" name="slug" defaultValue={editing?.slug ?? ''} placeholder="titulo-de-la-nota" />
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Club (opcional)</label>
                  <select name="club_id" defaultValue={editing?.club_id ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    <option value="">General</option>
                    {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>
              <Field label="Extracto" name="extracto" defaultValue={editing?.extracto ?? ''} />
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Contenido *</label>
                <textarea name="contenido" rows={8} defaultValue={editing?.contenido ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors resize-y" />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="publicada" defaultChecked={editing?.publicada ?? false} className="accent-lab-gold w-4 h-4" />
                  <span className="font-condensed text-sm text-lab-gray tracking-wide">Publicada</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="destacada" defaultChecked={editing?.destacada ?? false} className="accent-lab-gold w-4 h-4" />
                  <span className="font-condensed text-sm text-lab-gray tracking-wide">Destacada</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR' : 'CREAR NOTICIA'}
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

function Field({ label, name, defaultValue = '', placeholder }: { label: string; name: string; defaultValue?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">{label}</label>
      <input id={name} name={name} defaultValue={defaultValue} placeholder={placeholder} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors" />
    </div>
  )
}
