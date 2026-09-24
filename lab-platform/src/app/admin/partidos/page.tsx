import { createClient } from '@/lib/supabase/server'
import PartidosAdmin from '@/components/admin/PartidosAdmin'

export default async function AdminPartidosPage() {
  const supabase = await createClient()

  // Vercel skill: async-parallel — fetch all needed data in parallel
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('activa', true).single()
  const temporadaId = temporada?.id ?? ''
  const [{ data: partidos }, { data: clubes }, { data: inscripciones }] = await Promise.all([
    supabase
      .from('partidos')
      .select('*, local:clubes!partidos_local_id_fkey(nombre, nombre_corto), visitante:clubes!partidos_visitante_id_fkey(nombre, nombre_corto)')
      .eq('temporada_id', temporadaId)
      .order('fecha_hora', { ascending: false }),
    supabase.from('clubes').select('id, nombre, nombre_corto').eq('activo', true).order('nombre'),
    supabase.from('temporada_clubes').select('club_id').eq('temporada_id', temporadaId).eq('visible', true),
  ])
  const clubIds = new Set((inscripciones ?? []).map((item) => item.club_id))

  return (
    <PartidosAdmin
      partidos={(partidos ?? []) as any}
      clubes={(clubes ?? []).filter((club) => clubIds.has(club.id))}
      temporadaId={temporada?.id ?? null}
    />
  )
}
