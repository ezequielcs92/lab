import { createClient } from '@/lib/supabase/server'
import PartidosAdmin from '@/components/admin/PartidosAdmin'

export default async function AdminPartidosPage() {
  const supabase = await createClient()

  // Vercel skill: async-parallel — fetch all needed data in parallel
  const [{ data: partidos }, { data: clubes }, { data: temporada }] = await Promise.all([
    supabase
      .from('partidos')
      .select('*, local:clubes!partidos_local_id_fkey(nombre, nombre_corto), visitante:clubes!partidos_visitante_id_fkey(nombre, nombre_corto)')
      .order('fecha_hora', { ascending: false }),
    supabase.from('clubes').select('id, nombre, nombre_corto').eq('activo', true).order('nombre'),
    supabase.from('temporadas').select('id').eq('activa', true).single(),
  ])

  return (
    <PartidosAdmin
      partidos={(partidos ?? []) as any}
      clubes={clubes ?? []}
      temporadaId={temporada?.id ?? null}
    />
  )
}
