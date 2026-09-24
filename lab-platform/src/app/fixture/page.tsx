import { createClient } from '@/lib/supabase/server'
import StandingsTable from '@/components/fixture/StandingsTable'
import FixtureTabs from '@/components/fixture/FixtureTabs'
import type { Metadata } from 'next'
import type { Club, Division, PartidoConClubes, PosicionEfectivaConClub } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Fixture y Resultados',
  description: 'Calendario de partidos y resultados de la Liga Argentina de Béisbol',
}

export const revalidate = 60

export default async function FixturePage() {
  const supabase = await createClient()

  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, nombre')
    .eq('activa', true)
    .single()
  const temporadaId = temporada?.id ?? ''

  const [{ data: partidos }, { data: posiciones }, { data: clubes }, { data: divisiones }] = await Promise.all([
    supabase
      .from('partidos')
      .select(
        '*, local:clubes!partidos_local_id_fkey(*), visitante:clubes!partidos_visitante_id_fkey(*)'
      )
      .eq('temporada_id', temporadaId)
      .order('fecha_hora', { ascending: true }),
    supabase
      .from('v_posiciones_efectivas')
      .select('*')
      .eq('temporada_id', temporadaId)
      .order('pct', { ascending: false }),
    supabase.from('clubes').select('*'),
    supabase.from('divisiones').select('*').eq('temporada_id', temporadaId).order('orden'),
  ])

  const clubesById = new Map((clubes ?? []).map((club) => [club.id, club as Club]))
  const effectivePositions = (posiciones ?? []).flatMap((position) => {
    const club = clubesById.get(position.club_id)
    return club ? [{ ...position, clubes: club } as PosicionEfectivaConClub] : []
  })
  const divisionList = (divisiones ?? []) as Division[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          FIXTURE & <span className="text-gradient-gold">RESULTADOS</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          Calendario completo {temporada?.nombre ? `· ${temporada.nombre}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <FixtureTabs partidos={(partidos ?? []) as PartidoConClubes[]} />
        </div>

        {/* Sidebar: Standings */}
        <div>
          <h2 className="font-display text-lg tracking-widest text-lab-gold mb-4">POSICIONES</h2>
          {effectivePositions.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-condensed text-xs tracking-widest text-lab-muted uppercase mb-2">General</h3>
                <StandingsTable posiciones={effectivePositions.filter((position) => position.division_id === null)} />
              </div>
              {divisionList.map((division) => (
                <div key={division.id}>
                  <h3 className="font-condensed text-xs tracking-widest text-lab-muted uppercase mb-2">División {division.nombre}</h3>
                  <StandingsTable posiciones={effectivePositions.filter((position) => position.division_id === division.id)} />
                </div>
              ))}
            </div>
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
