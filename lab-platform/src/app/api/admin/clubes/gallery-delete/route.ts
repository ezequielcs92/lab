import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { fotoId, clubId } = (await request.json()) as {
      fotoId?: string
      clubId?: string
    }

    if (!fotoId || !clubId) {
      return NextResponse.json({ error: 'fotoId y clubId son requeridos' }, { status: 400 })
    }

    const { data: perfil, error: perfilErr } = await supabase
      .from('perfiles')
      .select('rol, club_id')
      .eq('id', user.id)
      .single()

    if (perfilErr || !perfil) {
      return NextResponse.json({ error: perfilErr?.message ?? 'No se pudo validar perfil de usuario' }, { status: 403 })
    }

    const canManageClub =
      perfil.rol === 'admin_liga' ||
      ((perfil.rol === 'editor_club' || perfil.rol === 'fotografo') && perfil.club_id === clubId)

    if (!canManageClub) {
      return NextResponse.json({ error: 'Sin permisos para modificar la galería de este club' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { error: deleteErr } = await admin
      .from('galeria_clubes')
      .delete()
      .eq('id', fotoId)
      .eq('club_id', clubId)

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[gallery-delete] Error:', error)
    return NextResponse.json({ error: 'Error eliminando foto de galería' }, { status: 500 })
  }
}
