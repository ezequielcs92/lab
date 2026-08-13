import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RolUsuario } from '@/lib/database.types'

const VALID_ROLES: RolUsuario[] = [
  'admin_liga', 'editor_club', 'editor_blog', 'autor', 'colaborador',
  'periodista', 'fotografo', 'suscriptor', 'usuario',
]

function isValidRole(value: unknown): value is RolUsuario {
  return typeof value === 'string' && VALID_ROLES.includes(value as RolUsuario)
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 72
}

/** Verify the caller is admin_liga */
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_liga') return null
  return user
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()
  const { email, password, nombre, rol, club_id } = body

  if (typeof email !== 'string' || !email.trim() || !validPassword(password) || !isValidRole(rol)) {
    return NextResponse.json({ error: 'Email, contraseña y rol son requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create auth user (email already confirmed)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })
  if (authErr || !created.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Error al crear usuario' }, { status: 400 })
  }

  // Insert perfil
  const { error: perfilErr } = await admin.from('perfiles').insert({
    id: created.user.id,
    nombre: nombre || null,
    rol,
    club_id: club_id || null,
  })
  if (perfilErr) {
    // Rollback: delete the auth user we just created
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: perfilErr.message }, { status: 500 })
  }

  return NextResponse.json({ id: created.user.id })
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()
  const { id, email, password, nombre, rol, club_id } = body

  if (typeof id !== 'string' || !isValidRole(rol)) {
    return NextResponse.json({ error: 'ID y rol son requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()
  const authUpdate: { email?: string; password?: string } = {}
  if (email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
    }
    authUpdate.email = email.trim().toLowerCase()
  }
  if (password !== undefined) {
    if (!validPassword(password)) {
      return NextResponse.json({ error: 'La contraseña debe tener entre 8 y 72 caracteres' }, { status: 400 })
    }
    authUpdate.password = password
  }

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate)
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { error } = await admin.from('perfiles').update({
    nombre: typeof nombre === 'string' && nombre.trim() ? nombre.trim() : null,
    rol,
    club_id: typeof club_id === 'string' && club_id ? club_id : null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  if (id === caller.id) return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })

  const admin = createAdminClient()
  // Deleting from auth.users cascades to perfiles
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
