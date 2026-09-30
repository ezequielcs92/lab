import { createClient } from '@/lib/supabase/server'
import JugadoresAdmin, { type AdminJugador } from '@/components/admin/JugadoresAdmin'
import type { Temporada } from '@/lib/database.types'

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

  const [{ data: jugadores }, { data: clubes }, { data: temporadas }, { data: temporadaActiva }] = await Promise.all([
    query,
    supabase.from('clubes').select('id, nombre').order('nombre'),
    supabase.from('temporadas').select('id, nombre, anio, activa').order('anio', { ascending: false }),
    supabase.from('temporadas').select('id').eq('activa', true).maybeSingle(),
  ])

  return (
    <JugadoresAdmin
      jugadores={(jugadores ?? []) as AdminJugador[]}
      clubes={clubes ?? []}
      temporadas={(temporadas ?? []) as Pick<Temporada, 'id' | 'nombre' | 'anio' | 'activa'>[]}
      activeSeasonId={temporadaActiva?.id ?? null}
      rol={rol}
      userClubId={userClubId}
    />
  )
}
