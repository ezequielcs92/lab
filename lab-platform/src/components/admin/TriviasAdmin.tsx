'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Trivia } from '@/lib/database.types'
import { Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react'

interface Props {
  trivias: Trivia[]
}

export default function TriviasAdmin({ trivias: initial }: Props) {
  const [trivias, setTrivias] = useState(initial)
  const [editing, setEditing] = useState<Trivia | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [opciones, setOpciones] = useState<string[]>(['', '', '', ''])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function close() { setCreating(false); setEditing(null); setError(null); setOpciones(['', '', '', '']) }

  function openCreate() {
    setEditing(null); setCreating(true); setError(null); setSuccess(null)
    setOpciones(['', '', '', ''])
  }

  function openEdit(t: Trivia) {
    setCreating(false); setEditing(t); setError(null); setSuccess(null)
    const opts = Array.isArray(t.opciones) ? (t.opciones as string[]) : ['', '', '', '']
    setOpciones(opts.length >= 4 ? opts.slice(0, 4) : [...opts, ...Array(4 - opts.length).fill('')])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setSuccess(null)

    const fd = new FormData(e.currentTarget)
    const pregunta = (fd.get('pregunta') as string).trim()
    const respuesta_correcta = Number(fd.get('respuesta_correcta'))
    const dificultad = Number(fd.get('dificultad'))
    const explicacion = (fd.get('explicacion') as string).trim() || null

    const filteredOpciones = opciones.map(o => o.trim()).filter(Boolean)

    if (!pregunta || filteredOpciones.length < 2) {
      setError('Pregunta y al menos 2 opciones son requeridas')
      return
    }
    if (respuesta_correcta >= filteredOpciones.length) {
      setError('La respuesta correcta debe coincidir con una opción existente')
      return
    }

    const payload = {
      pregunta,
      opciones: filteredOpciones,
      respuesta_correcta,
      dificultad,
      explicacion,
      activa: true,
      archivo_historico_id: null,
    }

    const supabase = createClient()

    if (editing) {
      const { error: err } = await supabase.from('trivias').update(payload).eq('id', editing.id)
      if (err) { setError(err.message); return }
      setSuccess('Trivia actualizada')
    } else {
      const { error: err } = await supabase.from('trivias').insert(payload)
      if (err) { setError(err.message); return }
      setSuccess('Trivia creada')
    }

    startTransition(() => router.refresh())
    close()
    const { data } = await supabase.from('trivias').select('*').order('created_at', { ascending: false })
    if (data) setTrivias(data)
  }

  async function toggleActiva(t: Trivia) {
    const supabase = createClient()
    const { error: err } = await supabase.from('trivias').update({ activa: !t.activa }).eq('id', t.id)
    if (err) { setError(err.message); return }
    setTrivias((prev) => prev.map((x) => x.id === t.id ? { ...x, activa: !x.activa } : x))
    startTransition(() => router.refresh())
  }

  async function handleDelete(t: Trivia) {
    if (!confirm('¿Eliminar esta trivia?')) return
    const supabase = createClient()
    const { error: err } = await supabase.from('trivias').delete().eq('id', t.id)
    if (err) { setError(err.message); return }
    setTrivias((prev) => prev.filter((x) => x.id !== t.id))
    setSuccess('Trivia eliminada')
    startTransition(() => router.refresh())
  }

  const showForm = creating || editing
  const diffDots = (d: number) => Array.from({ length: 3 }, (_, i) => i < d)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">TRIVIAS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {trivias.length} pregunta{trivias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> NUEVA TRIVIA
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
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Pregunta</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Dificultad</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Estado</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-28">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {trivias.map((t) => (
                <tr key={t.id} className="hover:bg-lab-navy/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-condensed text-sm text-lab-white tracking-wide truncate max-w-sm">{t.pregunta}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex gap-1">
                      {diffDots(t.dificultad).map((active, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${active ? 'bg-lab-gold' : 'bg-lab-border'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-condensed text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded ${
                      t.activa ? 'bg-emerald-400/10 text-emerald-400' : 'bg-lab-muted/10 text-lab-muted'
                    }`}>
                      {t.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => toggleActiva(t)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title={t.activa ? 'Desactivar' : 'Activar'}>
                        {t.activa ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold" title="Editar">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {trivias.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">Sin trivias</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-12 px-4 overflow-y-auto">
          <div className="bg-lab-surface border border-lab-border rounded-xl w-full max-w-lg p-6 relative mb-20">
            <button onClick={close} className="absolute top-4 right-4 text-lab-muted hover:text-lab-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl tracking-widest text-lab-white mb-5">
              {editing ? 'EDITAR TRIVIA' : 'NUEVA TRIVIA'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Pregunta *</label>
                <textarea name="pregunta" rows={2} defaultValue={editing?.pregunta ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors resize-none" />
              </div>

              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Opciones (mín. 2)</label>
                <div className="space-y-2">
                  {opciones.map((op, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-display text-sm text-lab-gold/50 w-5">{i + 1}</span>
                      <input
                        value={op}
                        onChange={(e) => setOpciones(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`Opción ${i + 1}`}
                        className="flex-1 bg-lab-navy border border-lab-border rounded-lg px-3 py-2 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Respuesta correcta (índice 0-3)</label>
                  <input name="respuesta_correcta" type="number" min="0" max="3" defaultValue={editing?.respuesta_correcta ?? 0} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors" />
                </div>
                <div>
                  <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Dificultad (1-3)</label>
                  <input name="dificultad" type="number" min="1" max="3" defaultValue={editing?.dificultad ?? 1} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Explicación</label>
                <textarea name="explicacion" rows={2} defaultValue={editing?.explicacion ?? ''} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isPending} className="flex-1 bg-lab-gold text-lab-navy font-condensed font-semibold text-sm tracking-wider py-2.5 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'GUARDAR' : 'CREAR TRIVIA'}
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
