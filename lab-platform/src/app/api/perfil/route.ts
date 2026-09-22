import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isValidPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 72
}

const MAX_NOMBRE_LENGTH = 200

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
  }

  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''

  if (nombre.length > MAX_NOMBRE_LENGTH) {
    return NextResponse.json(
      { error: `El nombre no puede superar los ${MAX_NOMBRE_LENGTH} caracteres` },
      { status: 400 }
    )
  }

  const password = body.password
  const confirmPassword = body.confirmPassword

  if (password !== undefined || confirmPassword !== undefined) {
    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: 'La contraseña debe tener entre 8 y 72 caracteres' },
        { status: 400 }
      )
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Las contraseñas no coinciden' }, { status: 400 })
    }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  // Este endpoint solo gestiona nombre y contraseña. RLS impide modificar
  // rol, club_id o avatar_url desde el cliente.
  const { error } = await supabase.from('perfiles').upsert({
    id: user.id,
    nombre: nombre || null,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
