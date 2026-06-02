import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { clubId, imageUrls } = (await request.json()) as {
      clubId?: string
      imageUrls?: string[]
    }

    if (!clubId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'clubId e imageUrls son requeridos' }, { status: 400 })
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

    const { data: maxOrderRows, error: maxOrderErr } = await admin
      .from('galeria_clubes')
      .select('orden')
      .eq('club_id', clubId)
      .order('orden', { ascending: false })
      .limit(1)

    if (maxOrderErr) {
      return NextResponse.json({ error: maxOrderErr.message }, { status: 400 })
    }

    const baseOrder = (maxOrderRows?.[0]?.orden ?? 0) + 1

    const rowsToInsert = imageUrls.map((imagen_url, index) => ({
      club_id: clubId,
      imagen_url,
      titulo: null as string | null,
      descripcion: null as string | null,
      orden: baseOrder + index,
    }))

    const { data: inserted, error: insertErr } = await admin
      .from('galeria_clubes')
      .insert(rowsToInsert)
      .select('*')

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    const sorted = (inserted ?? []).sort((a, b) => a.orden - b.orden)

    return NextResponse.json({
      inserted: sorted,
      message: `Se agregaron ${sorted.length} foto(s) al álbum.`,
    })
  } catch (error) {
    console.error('[gallery-upload] Error:', error)
    return NextResponse.json({ error: 'Error subiendo fotos de galería' }, { status: 500 })
  }
}
