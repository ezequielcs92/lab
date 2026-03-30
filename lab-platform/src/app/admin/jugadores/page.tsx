import { createClient } from '@/lib/supabase/server'
import JugadoresAdmin from '@/components/admin/JugadoresAdmin'

export default async function AdminJugadoresPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, club_id')
    .eq('id', user!.id)
    .single()

  const rol = perfil?.rol ?? 'usuario'
  const userClubId = perfil?.club_id ?? null

  // Supabase skill: RLS handles row-level filtering, but editor_club sees only their club
  const query = supabase
    .from('jugadores')
    .select('*, clubes(nombre, nombre_corto)')
    .order('nombre')

  if (rol === 'editor_club' && userClubId) {
    query.eq('club_id', userClubId)
  }

  const [{ data: jugadores }, { data: clubes }] = await Promise.all([
    query,
    supabase.from('clubes').select('id, nombre').eq('activo', true).order('nombre'),
  ])

  return (
    <JugadoresAdmin
      jugadores={(jugadores ?? []) as any}
      clubes={clubes ?? []}
      rol={rol}
      userClubId={userClubId}
    />
  )
}
