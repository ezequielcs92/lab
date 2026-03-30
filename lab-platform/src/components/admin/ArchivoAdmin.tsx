'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { ArchivoHistorico, TipoHito } from '@/lib/database.types'
import { TIPO_HITO_LABELS } from '@/lib/constants'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check } from 'lucide-react'

interface Props {
  items: ArchivoHistorico[]
}

const TIPOS = Object.entries(TIPO_HITO_LABELS) as [TipoHito, string][]

export default function ArchivoAdmin({ items: initial }: Props) {
  const [items, setItems] = useState(initial)
  const [editing, setEditing] = useState<ArchivoHistorico | null>(null)
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
    const fecha_hito = fd.get('fecha_hito') as string
    const tipo = fd.get('tipo') as TipoHito
    const descripcion = (fd.get('descripcion') as string).trim() || null
    const fuente = (fd.get('fuente') as string).trim() || null
    const temporada_referencia = fd.get('temporada_referencia') ? Number(fd.get('temporada_referencia')) : null

    if (!titulo || !fecha_hito) {
      setError('Título y fecha son requeridos')
      return
    }

    const payload = {
      titulo, fecha_hito, tipo, descripcion, fuente, temporada_referencia,
      media_url: null, media_urls: [], club_id: null,
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('archivo_historico').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setSuccess(`"${titulo}" actualizado`)
    } else {
      const { error: err } = await supabase.from('archivo_historico').insert(payload)
      if (err) { setError(err.message); return }
      setSuccess(`"${titulo}" creado`)
    }

    startTransition(() => router.refresh())
    close()
    const { data } = await supabase.from('archivo_historico').select('*').order('fecha_hito', { ascending: false })
    if (data) setItems(data)
  }

  async function handleDelete(item: ArchivoHistorico) {
    if (!confirm(`¿Eliminar "${item.titulo}"?`)) return
    const supabase = createClient()
    const { error: err } = await supabase.from('archivo_historico').delete().eq('id', item.id)
    if (err) { setError(err.message); return }
    setItems((prev) => prev.filter((x) => x.id !== item.id))
    setSuccess(`"${item.titulo}" eliminado`)
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">ARCHIVO HISTÓRICO</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {items.length} registro{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setCreating(true); setError(null); setSuccess(null) }}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> NUEVO REGISTRO
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
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Hito</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Tipo</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Fecha</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide truncate max-w-sm">{item.titulo}</p>
                    {item.descripcion && <p className="font-condensed text-[11px] text-lab-muted truncate max-w-sm">{item.descripcion}</p>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <span className="font-condensed text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded bg-lab-gold/10 text-lab-gold">
                      {TIPO_HITO_LABELS[item.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell font-condensed text-[11px] text-lab-muted">
                    {new Date(item.fecha_hito).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => { setCreating(false); setEditing(item); setError(null); setSuccess(null) }} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">Sin registros históricos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-16 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-lg p-6 relative mb-20">
            <button onClick={close} className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Título *" name="titulo" defaultValue={editing?.titulo ?? ''} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fecha del hito *" name="fecha_hito" type="date" defaultValue={editing?.fecha_hito ?? ''} />
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Tipo</label>
                  <select name="tipo" defaultValue={editing?.tipo ?? 'historia'} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                    {TIPOS.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Descripción</label>
                <textarea name="descripcion" rows={4} defaultValue={editing?.descripcion ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors resize-y" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Fuente" name="fuente" defaultValue={editing?.fuente ?? ''} />
                <Field label="Temporada Ref." name="temporada_referencia" type="number" defaultValue={editing?.temporada_referencia ?? ''} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR' : 'CREAR REGISTRO'}
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

function Field({ label, name, type = 'text', defaultValue = '' }: { label: string; name: string; type?: string; defaultValue?: string | number | null }) {
  return (
    <div>
      <label htmlFor={name} className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors" />
    </div>
  )
}
