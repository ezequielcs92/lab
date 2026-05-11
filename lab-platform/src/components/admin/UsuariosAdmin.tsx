'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RolUsuario, Club } from '@/lib/database.types'
import {
  Plus, Pencil, Trash2, X, Loader2, AlertCircle, Check,
  Eye, EyeOff, UserCircle2, ShieldCheck,
} from 'lucide-react'

export interface UsuarioRow {
  id: string
  email: string
  nombre: string | null
  rol: RolUsuario
  club_id: string | null
  club_nombre: string | null
  created_at: string
}

interface Props {
  usuarios: UsuarioRow[]
  clubes: Pick<Club, 'id' | 'nombre'>[]
  currentUserId: string
}

const ROLES: { value: RolUsuario; label: string; color: string; description: string }[] = [
  { value: 'admin_liga', label: 'Admin', color: 'bg-lab-gold/20 text-lab-gold border-lab-gold/30', description: 'Acceso total al panel' },
  { value: 'editor_club', label: 'Editor', color: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30', description: 'Gestiona contenido de su club' },
  { value: 'periodista', label: 'Redactor', color: 'bg-sky-400/15 text-sky-400 border-sky-400/30', description: 'Crea y edita noticias' },
  { value: 'fotografo', label: 'Fotografía', color: 'bg-purple-400/15 text-purple-400 border-purple-400/30', description: 'Gestiona fotos y archivo' },
]

function RolBadge({ rol }: { rol: RolUsuario }) {
  const r = ROLES.find((x) => x.value === rol)
  if (!r) return <span className="font-condensed text-xs text-lab-muted">—</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded border font-condensed text-[11px] tracking-wider uppercase ${r.color}`}>
      {r.label}
    </span>
  )
}

const ROLES_WITH_CLUB: RolUsuario[] = ['editor_club', 'fotografo']

export default function UsuariosAdmin({ usuarios: initial, clubes, currentUserId }: Props) {
  const [usuarios, setUsuarios] = useState(initial)
  const [editing, setEditing] = useState<UsuarioRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRol, setSelectedRol] = useState<RolUsuario>('editor_club')
  const router = useRouter()

  function close() {
    setCreating(false); setEditing(null); setError(null); setShowPassword(false)
    setSelectedRol('editor_club')
  }

  function openCreate() {
    setCreating(true); setEditing(null); setError(null); setSuccess(null)
    setSelectedRol('editor_club')
  }

  function openEdit(u: UsuarioRow) {
    setEditing(u); setCreating(false); setError(null); setSuccess(null)
    setSelectedRol(u.rol)
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true); setError(null)

    const fd = new FormData(e.currentTarget)
    const payload = {
      email: (fd.get('email') as string).trim(),
      password: fd.get('password') as string,
      nombre: (fd.get('nombre') as string).trim() || undefined,
      rol: fd.get('rol') as RolUsuario,
      club_id: (fd.get('club_id') as string) || undefined,
    }

    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error); setIsPending(false); return }

    setSuccess(`Usuario "${payload.email}" creado`)
    router.refresh()
    close()

    // Refresh list
    const club = clubes.find(c => c.id === payload.club_id)
    setUsuarios(prev => [...prev, {
      id: data.id,
      email: payload.email,
      nombre: payload.nombre ?? null,
      rol: payload.rol,
      club_id: payload.club_id ?? null,
      club_nombre: club?.nombre ?? null,
      created_at: new Date().toISOString(),
    }])
    setIsPending(false)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setIsPending(true); setError(null)

    const fd = new FormData(e.currentTarget)
    const payload = {
      id: editing.id,
      nombre: (fd.get('nombre') as string).trim() || undefined,
      rol: fd.get('rol') as RolUsuario,
      club_id: (fd.get('club_id') as string) || undefined,
    }

    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error); setIsPending(false); return }

    const club = clubes.find(c => c.id === payload.club_id)
    setUsuarios(prev => prev.map(u => u.id === editing.id
      ? { ...u, nombre: payload.nombre ?? null, rol: payload.rol, club_id: payload.club_id ?? null, club_nombre: club?.nombre ?? null }
      : u
    ))
    setSuccess(`Usuario actualizado`)
    router.refresh()
    close()
    setIsPending(false)
  }

  async function handleDelete(u: UsuarioRow) {
    if (u.id === currentUserId) { setError('No puedes eliminar tu propia cuenta'); return }
    if (!confirm(`¿Eliminar el usuario "${u.email}"? Esta acción no se puede deshacer.`)) return
    setError(null)

    const res = await fetch(`/api/admin/usuarios?id=${u.id}`, { method: 'DELETE' })
    const data = await res.json()

    if (!res.ok) { setError(data.error); return }

    setUsuarios(prev => prev.filter(x => x.id !== u.id))
    setSuccess(`Usuario eliminado`)
    router.refresh()
  }

  const showForm = creating || editing !== null
  const rolNeedsClub = ROLES_WITH_CLUB.includes(selectedRol)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-widest text-lab-white">USUARIOS</h1>
          <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-lab-gold text-lab-accent-fg font-condensed font-semibold text-sm tracking-wider px-4 py-2 rounded-lg hover:bg-lab-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" /> NUEVO USUARIO
          </button>
        )}
      </div>

      {/* Role legend */}
      {!showForm && (
        <div className="flex flex-wrap gap-2 mb-6">
          {ROLES.map((r) => (
            <div key={r.value} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${r.color} text-xs font-condensed`}>
              <ShieldCheck className="w-3 h-3" />
              <span className="tracking-wider uppercase font-semibold">{r.label}</span>
              <span className="opacity-60">— {r.description}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-lab-red/10 border border-lab-red/30 rounded-lg px-4 py-2.5 mb-4 text-lab-red text-sm font-condensed">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-4 py-2.5 mb-4 text-emerald-400 text-sm font-condensed">
          <Check className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-lab-surface border border-lab-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl tracking-widest text-lab-white">
              {editing ? 'EDITAR USUARIO' : 'NUEVO USUARIO'}
            </h2>
            <button onClick={close} className="p-1.5 rounded-md text-lab-muted hover:text-lab-white hover:bg-lab-surface-light transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-4">
            {/* Email — only on create */}
            {creating && (
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Email *</label>
                <input name="email" type="email" required autoComplete="off"
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                  placeholder="usuario@email.com" />
              </div>
            )}

            {/* Email display (read-only on edit) */}
            {editing && (
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Email</label>
                <div className="w-full bg-lab-navy/50 border border-lab-border/50 rounded-lg px-3 py-2.5 text-sm text-lab-muted">
                  {editing.email}
                </div>
              </div>
            )}

            {/* Password — only on create */}
            {creating && (
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Contraseña * <span className="normal-case opacity-60">(mín. 8 caracteres)</span></label>
                <div className="relative">
                  <input name="password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password"
                    className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 pr-10 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lab-muted hover:text-lab-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Nombre completo</label>
                <input name="nombre" type="text" defaultValue={editing?.nombre ?? ''}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white placeholder:text-lab-muted/50 focus:outline-none focus:border-lab-gold/50 transition-colors"
                  placeholder="Nombre y apellido" />
              </div>

              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Rol *</label>
                <select name="rol" value={selectedRol} onChange={(e) => setSelectedRol(e.target.value as RolUsuario)}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label} — {r.description}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Club — only for editor/fotografo */}
            {rolNeedsClub && (
              <div>
                <label className="block font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Club asignado</label>
                <select name="club_id" defaultValue={editing?.club_id ?? ''}
                  className="w-full bg-lab-navy border border-lab-border rounded-lg px-3 py-2.5 text-sm text-lab-white focus:outline-none focus:border-lab-gold/50 transition-colors">
                  <option value="">Sin club</option>
                  {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-lab-gold text-lab-accent-fg rounded-md font-condensed font-semibold text-sm tracking-wider uppercase hover:bg-lab-gold-light transition-colors disabled:opacity-50">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editing ? 'Guardar cambios' : 'Crear usuario'}
              </button>
              <button type="button" onClick={close}
                className="px-4 py-2 rounded-md border border-lab-border font-condensed text-sm text-lab-muted hover:text-lab-white hover:border-lab-gold/30 transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-lab-border">
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Usuario</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Rol</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden md:table-cell">Club</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase hidden lg:table-cell">Desde</th>
                <th className="px-4 py-3 font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase w-24">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lab-border">
              {usuarios.map((u) => (
                <tr key={u.id} className={`hover:bg-lab-navy/40 transition-colors ${u.id === currentUserId ? 'bg-lab-gold/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-lab-navy border border-lab-border flex items-center justify-center flex-shrink-0">
                        <UserCircle2 className="w-4 h-4 text-lab-muted" />
                      </div>
                      <div>
                        {u.nombre && (
                          <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide leading-tight">{u.nombre}</p>
                        )}
                        <p className={`font-condensed text-xs text-lab-muted ${!u.nombre ? 'text-sm text-lab-white' : ''}`}>{u.email}</p>
                        {u.id === currentUserId && (
                          <span className="font-condensed text-[10px] tracking-wider text-lab-gold uppercase">Tú</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RolBadge rol={u.rol} /></td>
                  <td className="px-4 py-3 hidden md:table-cell font-condensed text-sm text-lab-gray">{u.club_nombre ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell font-condensed text-xs text-lab-muted">
                    {new Date(u.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-gold">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={u.id === currentUserId}
                        className="p-1.5 rounded hover:bg-lab-navy transition-colors text-lab-muted hover:text-lab-red disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.id === currentUserId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center font-condensed text-lab-muted tracking-wider">
                    Sin usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
