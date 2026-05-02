import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  if (!email || !password || !rol) {
    return NextResponse.json({ error: 'Email, contraseña y rol son requeridos' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create auth user (email already confirmed)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
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
  const { id, nombre, rol, club_id } = body

  if (!id || !rol) {
    return NextResponse.json({ error: 'ID y rol son requeridos' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('perfiles').update({
    nombre: nombre || null,
    rol,
    club_id: club_id || null,
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
