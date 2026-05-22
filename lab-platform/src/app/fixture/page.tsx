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
  const partidos: PartidoConClubes[] = []
  const posiciones: PosicionConClub[] = []

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
          <FixtureTabs partidos={partidos} />
        </div>

        {/* Sidebar: Standings */}
        <div>
          <h2 className="font-display text-lg tracking-widest text-lab-gold mb-4">POSICIONES</h2>
          {posiciones.length > 0 ? (
            <StandingsTable posiciones={posiciones} />
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
