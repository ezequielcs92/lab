import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EstadisticasAdmin from '@/components/admin/EstadisticasAdmin'
import type { Club, Division, JugadorConClub, LiderConfig, Partido, PosicionAjuste, PosicionEfectiva } from '@/lib/database.types'

type PartidoAdmin = Partido & {
  local: Pick<Club, 'id' | 'nombre' | 'nombre_corto'>
  visitante: Pick<Club, 'id' | 'nombre' | 'nombre_corto'>
}

export default async function AdminEstadisticasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin_liga') redirect('/admin')

  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nombre')
    .eq('activa', true)
    .single()
  const temporadaId = temporada?.id ?? ''

  const [
    { data: partidos },
    { data: posiciones },
    { data: configs },
    { data: jugadores },
    { data: ajustes },
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select('*, local:clubes!partidos_local_id_fkey(id, nombre, nombre_corto), visitante:clubes!partidos_visitante_id_fkey(id, nombre, nombre_corto)')
      .eq('temporada_id', temporadaId)
      .order('fecha_hora', { ascending: false }),
    supabase.from('v_posiciones_efectivas').select('*').eq('temporada_id', temporadaId),
    supabase.from('lideres_config').select('*').eq('temporada_id', temporadaId).order('orden', { ascending: true }),
    supabase.from('jugadores').select('*, clubes(nombre, nombre_corto)').eq('temporada_id', temporadaId).eq('activo', true).order('nombre'),
    supabase.from('posiciones_ajustes').select('*').eq('temporada_id', temporadaId),
  ])
  const [{ data: divisiones }, { data: clubes }] = await Promise.all([
    supabase.from('divisiones').select('*').eq('temporada_id', temporadaId).order('orden'),
    supabase.from('clubes').select('id, nombre, nombre_corto'),
  ])
  return (
    <EstadisticasAdmin
      temporada={temporada ?? null}
      partidos={(partidos ?? []) as PartidoAdmin[]}
      standingScopes={[
        { key: 'general', divisionId: null, nombre: 'General' },
        ...((divisiones ?? []) as Division[]).map((division) => ({ key: division.id, divisionId: division.id, nombre: `Zona ${division.nombre}` })),
      ]}
      standingsData={{
        positions: (posiciones ?? []) as PosicionEfectiva[],
        adjustments: (ajustes ?? []) as PosicionAjuste[],
        clubs: (clubes ?? []) as { id: string; nombre: string; nombre_corto: string | null }[],
      }}
      configs={(configs ?? []) as LiderConfig[]}
      jugadores={(jugadores ?? []) as JugadorConClub[]}
    />
  )
}
