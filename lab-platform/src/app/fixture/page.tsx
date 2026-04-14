import { createClient } from '@/lib/supabase/server'
import StandingsTable from '@/components/fixture/StandingsTable'
import { ESTADO_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Club, PartidoConClubes, PosicionConClub } from '@/lib/database.types'

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
      .order('fecha_hora', { ascending: true }),
    supabase
      .from('posiciones')
      .select('*, clubes(*)')
      .order('pts', { ascending: false }),
  ])

  // Group partidos by fecha_numero (matchday)
  const byFecha: Record<string, PartidoConClubes[]> = {}
  partidos?.forEach((p) => {
    const key = p.fecha_numero ? `Fecha ${p.fecha_numero}` : format(new Date(p.fecha_hora), 'MMMM yyyy', { locale: es })
    if (!byFecha[key]) byFecha[key] = []
    byFecha[key]!.push(p as unknown as PartidoConClubes)
  })

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
        <div className="lg:col-span-2 space-y-8">
          {Object.keys(byFecha).length > 0 ? (
            Object.entries(byFecha).map(([fecha, games]) => (
              <section key={fecha}>
                <h2 className="font-display text-lg tracking-widest text-lab-gold mb-4 uppercase">{fecha}</h2>
                <div className="space-y-3">
                  {games.map((p) => (
                    <div
                      key={p.id}
                      className="bg-lab-surface rounded-lg border border-lab-border p-4 hover:border-lab-gold/30 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Date */}
                        <div className="sm:w-24 flex-shrink-0">
                          <div className="font-condensed text-xs tracking-wider text-lab-muted uppercase">
                            {format(new Date(p.fecha_hora), "EEE d MMM", { locale: es })}
                          </div>
                          <div className="font-condensed text-xs text-lab-muted">
                            {format(new Date(p.fecha_hora), "HH:mm")} hs
                          </div>
                        </div>

                        {/* Teams */}
                        <div className="flex-1 flex items-center gap-3">
                          <TeamBadge club={p.local} />
                          <div className="flex items-center gap-2 font-display">
                            <span className={`text-xl ${p.estado === 'finalizado' && (p.marcador_local ?? -1) > (p.marcador_visitante ?? -1) ? 'text-lab-gold' : 'text-lab-gray'}`}>
                              {p.marcador_local ?? '-'}
                            </span>
                            <span className="text-lab-muted text-sm">vs</span>
                            <span className={`text-xl ${p.estado === 'finalizado' && (p.marcador_visitante ?? -1) > (p.marcador_local ?? -1) ? 'text-lab-gold' : 'text-lab-gray'}`}>
                              {p.marcador_visitante ?? '-'}
                            </span>
                          </div>
                          <TeamBadge club={p.visitante} />
                        </div>

                        {/* Status */}
                        <div className="sm:w-24 flex-shrink-0 text-right">
                          <span className={`font-condensed text-xs tracking-widest uppercase font-semibold
                            ${p.estado === 'en_curso' ? 'text-lab-red-light' : p.estado === 'finalizado' ? 'text-lab-gold' : 'text-lab-muted'}`}
                          >
                            {ESTADO_LABELS[p.estado as keyof typeof ESTADO_LABELS]}
                          </span>
                        </div>
                      </div>

                      {p.estadio && (
                        <div className="mt-2 font-condensed text-xs text-lab-muted tracking-wider">
                          📍 {p.estadio}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="bg-lab-surface rounded-lg border border-lab-border p-12 text-center">
              <p className="font-condensed text-lab-muted tracking-wider text-lg">
                El fixture se publicará próximamente
              </p>
            </div>
          )}
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

function TeamBadge({ club }: { club: Club }) {
  return (
    <Link href={`/${club.slug}`} className="flex items-center gap-2 group min-w-0">
      <div
        className="w-7 h-7 rounded-sm flex items-center justify-center font-display text-xs flex-shrink-0"
        style={{ backgroundColor: club.colores.primario, color: club.colores.secundario }}
      >
        {(club.nombre_corto || club.nombre)[0]}
      </div>
      <span className="font-condensed text-sm tracking-wide text-lab-white group-hover:text-lab-gold transition-colors truncate">
        {club.nombre_corto || club.nombre}
      </span>
    </Link>
  )
}
