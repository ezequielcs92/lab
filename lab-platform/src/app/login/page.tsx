'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Credenciales inválidas. Verificá tu email y contraseña.'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-accent-fg text-3xl font-bold mx-auto mb-4">
            L
          </div>
          <h1 className="font-display text-3xl tracking-wider text-lab-white">
            PANEL <span className="text-gradient-gold">ADMIN</span>
          </h1>
          <p className="font-condensed text-lab-muted tracking-wider mt-2">
            Acceso para administradores y editores de club
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-lab-surface rounded-xl border border-lab-border p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg p-3 text-lab-red text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block font-condensed text-xs tracking-widest uppercase text-lab-muted mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lab-muted" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lab.org.ar"
                className="w-full bg-lab-navy border border-lab-border rounded-lg py-3 pl-10 pr-4 text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block font-condensed text-xs tracking-widest uppercase text-lab-muted mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lab-muted" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-lab-navy border border-lab-border rounded-lg py-3 pl-10 pr-4 text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lab-gold text-lab-accent-fg font-display text-lg tracking-wider py-3 rounded-lg hover:bg-lab-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                INGRESANDO...
              </>
            ) : (
              'INGRESAR'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
