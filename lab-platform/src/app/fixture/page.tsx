import { createClient } from '@/lib/supabase/server'
import StandingsTable from '@/components/fixture/StandingsTable'
import FixtureTabs from '@/components/fixture/FixtureTabs'
import type { Metadata } from 'next'
import type { PartidoConClubes, PosicionConClub } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Fixture y Resultados',
  description: 'Calendario de partidos y resultados de la Liga Argentina de Béisbol',
}

export const revalidate = 60

export default async function FixturePage() {
  const supabase = await createClient()

  const [{ data: partidos }, { data: posiciones }] = await Promise.all([
    supabase
      .from('partidos')
      .select('*, local:clubes!local_id(*), visitante:clubes!visitante_id(*)')
      .order('fecha_numero', { ascending: true })
      .order('fecha_hora', { ascending: true }),
    supabase
      .from('posiciones')
      .select('*, clubes(*)')
      .order('pts', { ascending: false }),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          FIXTURE & <span className="text-gradient-gold">RESULTADOS</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          Calendario completo de la temporada
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <FixtureTabs partidos={(partidos ?? []) as unknown as PartidoConClubes[]} />
        </div>

        {/* Sidebar: Standings */}
        <div>
          <h2 className="font-display text-lg tracking-widest text-lab-gold mb-4">POSICIONES</h2>
          {posiciones && posiciones.length > 0 ? (
            <StandingsTable posiciones={posiciones as unknown as PosicionConClub[]} />
          ) : (
            <div className="bg-lab-surface rounded-lg border border-lab-border p-6 text-center">
              <p className="font-condensed text-lab-muted tracking-wider text-sm">
                Sin datos de posiciones aún
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
