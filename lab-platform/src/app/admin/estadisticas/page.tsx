import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EstadisticasAdmin from '@/components/admin/EstadisticasAdmin'
import type { Club, JugadorConClub, LiderConfig, Partido, PosicionAjuste, PosicionConClub } from '@/lib/database.types'

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
    supabase.from('posiciones').select('*, clubes(*)').eq('temporada_id', temporadaId).order('pct', { ascending: false }),
    supabase.from('lideres_config').select('*').eq('temporada_id', temporadaId).order('orden', { ascending: true }),
    supabase.from('jugadores').select('*, clubes(nombre, nombre_corto)').eq('temporada_id', temporadaId).eq('activo', true).order('nombre'),
    supabase.from('posiciones_ajustes').select('*').eq('temporada_id', temporadaId).is('division_id', null),
  ])
  const automaticPositions = (posiciones ?? []) as PosicionConClub[]
  const adjustmentsByClub = new Map(((ajustes ?? []) as PosicionAjuste[]).map((adjustment) => [adjustment.club_id, adjustment]))
  const effectivePositions = automaticPositions.map((position) => {
    const adjustment = adjustmentsByClub.get(position.club_id)
    return adjustment ? {
      ...position,
      jj: adjustment.jj ?? position.jj,
      jg: adjustment.jg ?? position.jg,
      jp: adjustment.jp ?? position.jp,
      pct: adjustment.pct ?? position.pct,
      gb: adjustment.gb ?? position.gb,
      racha: adjustment.racha ?? position.racha,
    } : position
  })

  return (
    <EstadisticasAdmin
      temporada={temporada ?? null}
      partidos={(partidos ?? []) as PartidoAdmin[]}
      posiciones={effectivePositions}
      automaticPositions={automaticPositions}
      configs={(configs ?? []) as LiderConfig[]}
      jugadores={(jugadores ?? []) as JugadorConClub[]}
    />
  )
}
