import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Scoreboard from '@/components/fixture/Scoreboard'
import StandingsTable from '@/components/fixture/StandingsTable'
import PlayerCard from '@/components/players/PlayerCard'
import { ArrowRight, Trophy, Calendar, Users, Archive, Gamepad2 } from 'lucide-react'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: partidos },
    { data: posiciones },
    { data: noticias },
    { data: clubes },
    { data: jugadoresDestacados },
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select('*, local:clubes!local_id(*), visitante:clubes!visitante_id(*)')
      .order('fecha_hora', { ascending: false })
      .limit(8),
    supabase
      .from('posiciones')
      .select('*, clubes(*)')
      .order('pts', { ascending: false }),
    supabase
      .from('noticias')
      .select('*')
      .eq('publicada', true)
      .order('fecha_publicacion', { ascending: false })
      .limit(4),
    supabase
      .from('clubes')
      .select('*')
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('jugadores')
      .select('*, clubes(*)')
      .eq('activo', true)
      .limit(4),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-field-gradient">
        <div className="bg-diamond-pattern absolute inset-0 opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-navy text-2xl font-bold">
                L
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-lab-gold to-transparent" />
            </div>
            <h1 className="font-display text-5xl md:text-7xl tracking-wider text-lab-white leading-none mb-4">
              LIGA ARGENTINA
              <br />
              <span className="text-gradient-gold">DE BÉISBOL</span>
            </h1>
            <p className="font-condensed text-lg md:text-xl text-lab-gray tracking-wide max-w-lg mb-8">
              La plataforma oficial del béisbol argentino. Resultados, estadísticas, archivo histórico y comunidad.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/fixture"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-lab-gold text-lab-navy font-condensed font-bold tracking-wider uppercase hover:bg-lab-gold-light transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Ver Fixture
              </Link>
              <Link
                href="/clubes"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-lab-border text-lab-white font-condensed font-bold tracking-wider uppercase hover:border-lab-gold/50 hover:text-lab-gold transition-colors"
              >
                <Users className="w-4 h-4" />
                Clubes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Scoreboard */}
      {partidos && partidos.length > 0 && (
        <section className="bg-lab-dark border-y border-lab-border py-6">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg tracking-widest text-lab-gold">RESULTADOS</h2>
              <Link href="/fixture" className="font-condensed text-xs tracking-wider text-lab-muted hover:text-lab-gold transition-colors uppercase">
                Ver todos →
              </Link>
            </div>
            <Scoreboard partidos={partidos as any} />
          </div>
        </section>
      )}

      {/* Main content grid */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Posiciones */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl tracking-widest text-lab-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-lab-gold" />
                TABLA DE POSICIONES
              </h2>
            </div>
            {posiciones && posiciones.length > 0 ? (
              <StandingsTable posiciones={posiciones as any} />
            ) : (
              <div className="bg-lab-surface rounded-lg border border-lab-border p-8 text-center">
                <Trophy className="w-12 h-12 text-lab-gold/30 mx-auto mb-3" />
                <p className="font-condensed text-lab-muted tracking-wider">
                  La tabla de posiciones se actualizará cuando comience la temporada
                </p>
              </div>
            )}
          </div>

          {/* Noticias */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl tracking-widest text-lab-white">NOTICIAS</h2>
              <Link href="/noticias" className="font-condensed text-xs tracking-wider text-lab-muted hover:text-lab-gold transition-colors uppercase">
                Más →
              </Link>
            </div>
            <div className="space-y-3">
              {noticias && noticias.length > 0 ? (
                noticias.map((noticia) => (
                  <Link
                    key={noticia.id}
                    href={`/noticias/${noticia.slug}`}
                    className="block bg-lab-surface rounded-lg border border-lab-border p-4 hover:border-lab-gold/30 transition-colors group"
                  >
                    <h3 className="font-condensed font-semibold text-lab-white tracking-wide group-hover:text-lab-gold transition-colors line-clamp-2">
                      {noticia.titulo}
                    </h3>
                    {noticia.extracto && (
                      <p className="text-lab-muted text-sm mt-1 line-clamp-2">{noticia.extracto}</p>
                    )}
                  </Link>
                ))
              ) : (
                <div className="bg-lab-surface rounded-lg border border-lab-border p-6 text-center">
                  <p className="font-condensed text-lab-muted tracking-wider text-sm">
                    Próximamente: noticias del béisbol argentino
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Clubes */}
      {clubes && clubes.length > 0 && (
        <section className="bg-lab-navy border-y border-lab-border py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl tracking-widest text-lab-white">NUESTROS CLUBES</h2>
              <Link href="/clubes" className="inline-flex items-center gap-1 font-condensed text-sm tracking-wider text-lab-gold hover:text-lab-gold-light transition-colors uppercase">
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {clubes.map((club) => (
                <Link
                  key={club.id}
                  href={`/${club.slug}`}
                  className="group bg-lab-surface rounded-lg border border-lab-border p-4 text-center hover:border-lab-gold/50 transition-all hover:-translate-y-1"
                >
                  <div
                    className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center font-display text-2xl transition-transform group-hover:scale-110"
                    style={{
                      backgroundColor: club.colores.primario,
                      color: club.colores.secundario,
                    }}
                  >
                    {(club.nombre_corto || club.nombre)[0]}
                  </div>
                  <h3 className="font-condensed font-semibold text-sm tracking-wide text-lab-white group-hover:text-lab-gold transition-colors">
                    {club.nombre_corto || club.nombre}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Jugadores destacados */}
      {jugadoresDestacados && jugadoresDestacados.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl tracking-widest text-lab-white">JUGADORES</h2>
            <Link href="/jugadores" className="inline-flex items-center gap-1 font-condensed text-sm tracking-wider text-lab-gold hover:text-lab-gold-light transition-colors uppercase">
              Ver roster <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {jugadoresDestacados.map((j: any) => (
              <Link key={j.id} href={`/jugadores/${j.slug}`} className="flex-shrink-0">
                <PlayerCard
                  jugador={j}
                  clubNombre={j.clubes?.nombre_corto || j.clubes?.nombre}
                  clubColores={j.clubes?.colores}
                  size="md"
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick links */}
      <section className="bg-lab-surface border-y border-lab-border py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickLink
              href="/archivo"
              icon={Archive}
              title="Archivo Histórico"
              description="Décadas de historia del béisbol argentino. Campeones, documentos y fotos."
            />
            <QuickLink
              href="/trivias"
              icon={Gamepad2}
              title="Trivias"
              description="¿Cuánto sabés de béisbol argentino? Poné a prueba tus conocimientos."
            />
            <QuickLink
              href="/la-liga"
              icon={Trophy}
              title="La Liga"
              description="Historia, autoridades, reglamentos y todo sobre la LAB."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-5 rounded-lg bg-lab-navy border border-lab-border hover:border-lab-gold/30 transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-lab-gold/10 flex items-center justify-center flex-shrink-0 group-hover:bg-lab-gold/20 transition-colors">
        <Icon className="w-5 h-5 text-lab-gold" />
      </div>
      <div>
        <h3 className="font-display text-lg tracking-wider text-lab-white group-hover:text-lab-gold transition-colors">
          {title}
        </h3>
        <p className="text-lab-muted text-sm mt-1">{description}</p>
      </div>
    </Link>
  )
}
