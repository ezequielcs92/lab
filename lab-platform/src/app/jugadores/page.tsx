import { createClient } from '@/lib/supabase/server'
import PlayerCard from '@/components/players/PlayerCard'
import Link from 'next/link'
import type { Metadata } from 'next'
import { POSICION_LABELS } from '@/lib/constants'
import type { PosicionJugador } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Jugadores',
  description: 'Roster completo de la Liga Argentina de Béisbol',
}

export const revalidate = 120

export default async function JugadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string; posicion?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('jugadores')
    .select('*, clubes(*)')
    .eq('activo', true)
    .order('nombre')

  if (filters.club) {
    query = query.eq('club_id', filters.club)
  }
  if (filters.posicion) {
    query = query.eq('posicion', filters.posicion as PosicionJugador)
  }

  const [{ data: jugadores }, { data: clubes }] = await Promise.all([
    query,
    supabase.from('clubes').select('id, nombre, nombre_corto').eq('activo', true).order('nombre'),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          ROSTER <span className="text-gradient-gold">COMPLETO</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          Todos los jugadores de la Liga Argentina de Béisbol
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/jugadores"
          className={`px-4 py-2 rounded-lg font-condensed text-sm tracking-wider uppercase transition-all
            ${!filters.club && !filters.posicion ? 'bg-lab-gold text-lab-navy font-bold' : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'}`}
        >
          Todos
        </Link>
        {clubes?.map(c => (
          <Link
            key={c.id}
            href={`/jugadores?club=${c.id}`}
            className={`px-4 py-2 rounded-lg font-condensed text-sm tracking-wider uppercase transition-all
              ${filters.club === c.id ? 'bg-lab-gold text-lab-navy font-bold' : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'}`}
          >
            {c.nombre_corto || c.nombre}
          </Link>
        ))}
      </div>

      {/* Position filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(Object.entries(POSICION_LABELS) as [PosicionJugador, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/jugadores?posicion=${key}${filters.club ? `&club=${filters.club}` : ''}`}
            className={`px-3 py-1 rounded-md font-condensed text-xs tracking-wider uppercase transition-all
              ${filters.posicion === key ? 'bg-lab-gold text-lab-navy font-bold' : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Players grid */}
      {jugadores && jugadores.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {jugadores.map((j: any) => (
            <Link key={j.id} href={`/jugadores/${j.slug}`}>
              <PlayerCard
                jugador={j}
                clubNombre={j.clubes?.nombre_corto || j.clubes?.nombre}
                clubColores={j.clubes?.colores}
                size="sm"
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            No se encontraron jugadores con los filtros seleccionados
          </p>
        </div>
      )}
    </div>
  )
}
