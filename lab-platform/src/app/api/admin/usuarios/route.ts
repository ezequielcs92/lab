import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RolUsuario } from '@/lib/database.types'

const VALID_ROLES: RolUsuario[] = [
  'admin_liga', 'editor_club', 'editor_blog', 'autor', 'colaborador',
  'periodista', 'fotografo', 'suscriptor', 'usuario',
]

const ROLES_WITH_CLUB: RolUsuario[] = ['editor_club', 'fotografo']

function isValidRole(value: unknown): value is RolUsuario {
  return typeof value === 'string' && VALID_ROLES.includes(value as RolUsuario)
}

function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 72
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim())
}

function normalizeNombre(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeClubId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'Ya existe un usuario con ese email.'
  }
  if (lower.includes('rate limit')) return 'Se enviaron demasiadas solicitudes. Esperá unos minutos.'
  if (lower.includes('password should be')) return 'La contraseña no cumple los requisitos mínimos.'
  if (lower.includes('invalid')) return 'Los datos no son válidos.'
  return message
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

async function validateClubId(admin: ReturnType<typeof createAdminClient>, clubId: string | null) {
  if (!clubId) return null
  if (!isValidUUID(clubId)) {
    return 'El club asignado no es un identificador válido'
  }
  const { data: club } = await admin.from('clubes').select('id').eq('id', clubId).maybeSingle()
  if (!club) return 'El club asignado no existe'
  return null
}

async function countOtherAdmins(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { count } = await admin
    .from('perfiles')
    .select('*', { count: 'exact', head: true })
    .eq('rol', 'admin_liga')
    .neq('id', id)
  return count ?? 0
}

// ─── CREATE ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 })
  }

  const body = await req.json()
  const { email, password, nombre, rol, club_id } = body

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
  }
  if (!validPassword(password)) {
    return NextResponse.json(
      { error: 'La contraseña debe tener entre 8 y 72 caracteres' },
      { status: 400 }
    )
  }
  if (!isValidRole(rol)) {
    return NextResponse.json({ error: 'El rol no es válido' }, { status: 400 })
  }

  const finalClubId = normalizeClubId(club_id)
  if (ROLES_WITH_CLUB.includes(rol) && !finalClubId) {
    return NextResponse.json({ error: 'El rol seleccionado requiere un club' }, { status: 400 })
  }

  const admin = createAdminClient()

  const clubError = await validateClubId(admin, finalClubId)
  if (clubError) return NextResponse.json({ error: clubError }, { status: 400 })

  // Create auth user (email already confirmed)
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })
  if (authErr || !created.user) {
    return NextResponse.json(
      { error: authErr ? translateAuthError(authErr.message) : 'Error al crear usuario' },
      { status: 400 }
    )
  }

  // Insert perfil
  const { error: perfilErr } = await admin.from('perfiles').insert({
    id: created.user.id,
    nombre: normalizeNombre(nombre),
    rol,
    club_id: finalClubId,
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
  if (!caller) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 })
  }

  const body = await req.json()
  const { id, email, password, nombre, rol, club_id } = body

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'El identificador de usuario no es válido' }, { status: 400 })
  }
  if (!isValidRole(rol)) {
    return NextResponse.json({ error: 'El rol no es válido' }, { status: 400 })
  }

  const finalClubId = normalizeClubId(club_id)
  if (ROLES_WITH_CLUB.includes(rol) && !finalClubId) {
    return NextResponse.json({ error: 'El rol seleccionado requiere un club' }, { status: 400 })
  }

  if (email !== undefined && !isValidEmail(email)) {
    return NextResponse.json({ error: 'El email no es válido' }, { status: 400 })
  }
  if (password !== undefined && !validPassword(password)) {
    return NextResponse.json(
      { error: 'La contraseña debe tener entre 8 y 72 caracteres' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const clubError = await validateClubId(admin, finalClubId)
  if (clubError) return NextResponse.json({ error: clubError }, { status: 400 })

  // Verify target auth user exists
  const { data: authUser, error: authUserErr } = await admin.auth.admin.getUserById(id)
  if (authUserErr || !authUser.user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Current profile (may not exist if created outside the app)
  const { data: existingPerfil } = await admin
    .from('perfiles')
    .select('rol, nombre, club_id')
    .eq('id', id)
    .maybeSingle()

  // Prevent degrading the last admin_liga
  if (existingPerfil?.rol === 'admin_liga' && rol !== 'admin_liga') {
    const otherAdmins = await countOtherAdmins(admin, id)
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: 'No podés degradar al último administrador de la liga' },
        { status: 400 }
      )
    }
  }

  const newProfile = {
    nombre: normalizeNombre(nombre),
    rol,
    club_id: finalClubId,
  }

  // Update profile first so auth and profile do not diverge if auth fails.
  let profileInserted = false
  if (existingPerfil) {
    const { error: profileErr } = await admin.from('perfiles').update(newProfile).eq('id', id)
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }
  } else {
    const { error: profileErr } = await admin.from('perfiles').insert({ id, ...newProfile })
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }
    profileInserted = true
  }

  const authUpdate: { email?: string; password?: string } = {}
  if (email !== undefined) authUpdate.email = email.trim().toLowerCase()
  if (password !== undefined) authUpdate.password = password

  if (Object.keys(authUpdate).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdate)
    if (authError) {
      // Best-effort rollback of the profile change to keep auth/profile consistent.
      if (profileInserted) {
        await admin.from('perfiles').delete().eq('id', id)
      } else if (existingPerfil) {
        await admin
          .from('perfiles')
          .update({
            nombre: existingPerfil.nombre,
            rol: existingPerfil.rol,
            club_id: existingPerfil.club_id,
          })
          .eq('id', id)
      }
      return NextResponse.json({ error: translateAuthError(authError.message) }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const caller = await requireAdmin()
  if (!caller) {
    return NextResponse.json({ error: 'No tenés permisos para realizar esta acción' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id || !isValidUUID(id)) {
    return NextResponse.json({ error: 'El identificador de usuario no es válido' }, { status: 400 })
  }
  if (id === caller.id) {
    return NextResponse.json({ error: 'No podés eliminar tu propia cuenta' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('rol')
    .eq('id', id)
    .maybeSingle()

  if (perfil?.rol === 'admin_liga') {
    const otherAdmins = await countOtherAdmins(admin, id)
    if (otherAdmins === 0) {
      return NextResponse.json(
        { error: 'No podés eliminar al último administrador de la liga' },
        { status: 400 }
      )
    }
  }

  // Deleting from auth.users cascades to perfiles
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
