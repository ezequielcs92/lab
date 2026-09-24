import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_STATES = new Set(['usar_lab', 'usar_externo', 'fusionado', 'omitido'])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (profile?.rol !== 'admin_liga') return NextResponse.json({ error: 'Se requiere rol de administrador' }, { status: 403 })

  const body = await request.json() as { estado?: string }
  if (!body.estado || !ALLOWED_STATES.has(body.estado)) {
    return NextResponse.json({ error: 'Estado de resolución inválido' }, { status: 400 })
  }

  const { id } = await params
  const { data, error } = await supabase
    .from('sync_conflictos')
    .update({ estado: body.estado as 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido' })
    .eq('id', id)
    .eq('estado', 'pendiente')
    .select('id, estado, resolved_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ conflicto: data })
}
