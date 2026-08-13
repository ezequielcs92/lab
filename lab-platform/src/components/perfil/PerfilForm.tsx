'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import type { RolUsuario } from '@/lib/database.types'

const ROLE_LABELS: Record<RolUsuario, string> = {
  admin_liga: 'Administrador', editor_club: 'Editor de club', editor_blog: 'Editor',
  autor: 'Autor', colaborador: 'Colaborador', periodista: 'Redactor', fotografo: 'Fotografía',
  suscriptor: 'Suscriptor', usuario: 'Usuario',
}

export default function PerfilForm({ email, nombre, rol }: { email: string; nombre: string | null; rol: RolUsuario }) {
  const [isPending, setIsPending] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setMessage(null)
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '').trim()
    const confirmPassword = String(form.get('confirmPassword') ?? '').trim()
    const payload = { nombre: String(form.get('nombre') ?? '').trim(), ...(password ? { password, confirmPassword } : {}) }
    const response = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json()
    if (!response.ok) {
      setMessage({ type: 'error', text: data.error ?? 'No se pudieron guardar los cambios' })
      setIsPending(false)
      return
    }
    setMessage({ type: 'success', text: password ? 'Perfil y contraseña actualizados' : 'Perfil actualizado' })
    setIsPending(false)
    router.refresh()
    event.currentTarget.reset()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8"><h1 className="font-display text-3xl tracking-widest text-lab-white">MI PERFIL</h1><p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">Administra tus datos de acceso</p></div>
      {message && <div className={`flex items-center gap-2 rounded-lg px-4 py-3 mb-5 text-sm font-condensed border ${message.type === 'error' ? 'bg-lab-red/10 border-lab-red/30 text-lab-red' : 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'}`}>{message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}{message.text}</div>}
      <form onSubmit={submit} className="space-y-6">
        <section className="bg-lab-surface border border-lab-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5"><User className="w-4 h-4 text-lab-gold" /><h2 className="font-display text-xl tracking-widest text-lab-white">DATOS DE CUENTA</h2></div>
          <div className="space-y-4">
            <div><label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Email</label><div className="bg-lab-navy/50 border border-lab-border/50 rounded-lg px-3 py-2.5 text-sm text-lab-muted">{email}</div><p className="font-condensed text-xs text-lab-muted mt-1.5">El email solo puede cambiarlo un administrador.</p></div>
            <div><label htmlFor="nombre" className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Nombre completo</label><input id="nombre" name="nombre" type="text" defaultValue={nombre ?? ''} maxLength={200} className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50" /></div>
            <div><label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Rol</label><div className="text-sm text-lab-gold font-condensed tracking-wide">{ROLE_LABELS[rol]}</div></div>
          </div>
        </section>
        <section className="bg-lab-surface border border-lab-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1"><Lock className="w-4 h-4 text-lab-gold" /><h2 className="font-display text-xl tracking-widest text-lab-white">CAMBIAR CONTRASEÑA</h2></div><p className="font-condensed text-xs text-lab-muted mb-5">Déjalos vacíos si no quieres cambiarla.</p>
          <div className="space-y-4">
            <div className="relative"><label htmlFor="password" className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Nueva contraseña</label><input id="password" name="password" type={showPassword ? 'text' : 'password'} minLength={8} maxLength={72} autoComplete="new-password" className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 pr-10 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar contraseña" className="absolute right-3 bottom-2.5 text-lab-muted hover:text-lab-white">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
            <div><label htmlFor="confirmPassword" className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Repetir contraseña</label><input id="confirmPassword" name="confirmPassword" type={showPassword ? 'text' : 'password'} minLength={8} maxLength={72} autoComplete="new-password" className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50" /></div>
          </div>
        </section>
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 bg-lab-gold text-lab-accent-fg rounded-md font-condensed font-semibold text-sm tracking-wider uppercase hover:bg-lab-gold-light disabled:opacity-50">{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Guardar cambios</button>
      </form>
    </div>
  )
}
