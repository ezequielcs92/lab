import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markTablesStale } from '@/lib/supabase/revalidating-fetch'
import { parseRevalidateRequest } from '@/lib/cache-tags'
import type { RolUsuario } from '@/lib/database.types'

// Roles that can write from the admin. Anyone else (or nobody) cannot mark pages stale: every stale
// page is rebuilt from the database, so leaving this open would let anyone pile load on it.
const STAFF_ROLES: RolUsuario[] = ['admin_liga', 'editor_club', 'editor_blog', 'autor', 'colaborador', 'periodista', 'fotografo']

/** Called by the admin in the browser after it writes, so the public pages that show the change refresh. */
export async function POST(request: NextRequest) {
  const tables = parseRevalidateRequest(await request.json().catch(() => null))
  if (!tables) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (!profile || !STAFF_ROLES.includes(profile.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  markTablesStale(tables)
  return new NextResponse(null, { status: 204 })
}
