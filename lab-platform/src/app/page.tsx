import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Scoreboard from '@/components/fixture/Scoreboard'
import StandingsTable from '@/components/fixture/StandingsTable'
import SpotlightSection from '@/components/layout/SpotlightSection'
import { ArrowRight, Trophy, Calendar, Users, Archive, Gamepad2, Newspaper } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getClubLogoUrl } from '@/lib/club-logo'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: partidos },
    { data: posiciones },
    { data: noticias },
    { data: clubes },
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
  ])

  return (
    <div>
      {/* Hero */}
      <SpotlightSection className="relative overflow-hidden">
        {/* Foto de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
        />
        {/* Overlay azul navy — deja ver la foto pero mantiene el azul */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(6,15,32,0.94) 0%, rgba(11,29,58,0.90) 50%, rgba(6,15,32,0.96) 100%)' }} />
        {/* Líneas de diamante encima */}
        <div className="bg-diamond-pattern absolute inset-0 opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="font-display text-5xl md:text-7xl tracking-wider text-lab-white leading-none mb-4">
              LIGA ARGENTINA
              <br />
              <span className="text-gradient-gold">DE BÉISBOL</span>
            </h1>
            <p className="font-condensed text-lg md:text-xl text-lab-gray tracking-wide max-w-lg mb-8">
              La plataforma oficial del béisbol argentino. Resultados, estadísticas, línea de tiempo y comunidad.
            </p>
          </div>
        </div>
      </SpotlightSection>

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

      {/* Noticias */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl tracking-widest text-lab-white flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-lab-gold" />
            NOTICIAS
          </h2>
          <Link href="/noticias" className="font-condensed text-xs tracking-wider text-lab-gold hover:text-lab-gold-light transition-colors uppercase">
            Ver todas →
          </Link>
        </div>
        {noticias && noticias.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_3fr] gap-3">
            {/* Featured card */}
            <Link
              href={`/noticias/${noticias[0].slug}`}
              className="block bg-lab-surface rounded-lg border border-lab-border overflow-hidden hover:border-lab-gold/40 transition-colors group"
            >
              <div className="h-48 relative overflow-hidden bg-gradient-to-br from-lab-navy to-lab-dark">
                <div className="bg-diamond-pattern absolute inset-0 opacity-15" />
                {noticias[0].imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={noticias[0].imagen_url}
                    alt={noticias[0].titulo}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-lab-gold/15 flex items-center justify-center">
                      <Newspaper className="w-7 h-7 text-lab-gold/50" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 md:p-5">
                <p className="font-condensed text-[10px] tracking-[0.18em] uppercase text-lab-gold font-semibold mb-2">
                  {noticias[0].destacada ? 'Destacada · ' : ''}
                  {noticias[0].fecha_publicacion
                    ? format(new Date(noticias[0].fecha_publicacion), "d MMM yyyy", { locale: es })
                    : ''}
                </p>
                <h3 className="font-display text-xl md:text-2xl tracking-wider text-lab-white leading-tight group-hover:text-lab-gold-light transition-colors mb-2">
                  {noticias[0].titulo}
                </h3>
                {noticias[0].extracto && (
                  <p className="text-lab-muted text-xs leading-relaxed line-clamp-2">{noticias[0].extracto}</p>
                )}
              </div>
            </Link>
            {/* Side list */}
            <div className="flex flex-col gap-2.5">
              {noticias.slice(1).map((noticia) => (
                <Link
                  key={noticia.id}
                  href={`/noticias/${noticia.slug}`}
                  className="flex-1 block bg-lab-surface rounded-lg border border-lab-border p-4 hover:border-lab-gold/30 transition-colors group"
                >
                  <p className="font-condensed text-[9px] tracking-[0.15em] uppercase text-lab-muted mb-1">
                    {noticia.fecha_publicacion
                      ? format(new Date(noticia.fecha_publicacion), "d MMM yyyy", { locale: es })
                      : ''}
                  </p>
                  <h3 className="font-condensed font-semibold text-sm text-lab-white leading-snug group-hover:text-lab-gold transition-colors line-clamp-2">
                    {noticia.titulo}
                  </h3>
                  {noticia.extracto && (
                    <p className="text-lab-muted text-[11px] mt-1 line-clamp-2 leading-snug">{noticia.extracto}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-lab-surface rounded-lg border border-lab-border p-8 text-center">
            <Newspaper className="w-10 h-10 text-lab-gold/30 mx-auto mb-3" />
            <p className="font-condensed text-lab-muted tracking-wider text-sm">
              Próximamente: noticias del béisbol argentino
            </p>
          </div>
        )}
      </section>

      {/* Tabla de posiciones */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl tracking-widest text-lab-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-lab-gold" />
            TABLA DE POSICIONES
          </h2>
          <Link href="/fixture" className="font-condensed text-xs tracking-wider text-lab-muted hover:text-lab-gold transition-colors uppercase">
            Ver fixture →
          </Link>
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
            <div className="flex gap-8 overflow-x-auto pb-3 snap-x snap-mandatory">
              {clubes.map((club) => {
                const clubLogoUrl = getClubLogoUrl(club)

                return (
                  <Link
                    key={club.id}
                    href={`/${club.slug}`}
                    className="group flex-shrink-0 w-32 text-center snap-start"
                  >
                    {clubLogoUrl ? (
                      <div className="relative w-24 h-24 mx-auto mb-3 overflow-hidden transition-transform duration-200 group-hover:scale-110">
                        <Image src={clubLogoUrl} alt={club.nombre} fill sizes="96px" className="object-contain" />
                      </div>
                    ) : (
                      <div
                        className="w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center font-display text-4xl transition-transform duration-200 group-hover:scale-110"
                        style={{
                          backgroundColor: club.colores.primario,
                          color: club.colores.secundario,
                        }}
                      >
                        {(club.nombre_corto || club.nombre)[0]}
                      </div>
                    )}
                    <h3 className="font-condensed font-semibold text-lg tracking-wide text-lab-white group-hover:text-lab-gold transition-colors leading-none">
                      {club.nombre_corto || club.nombre}
                    </h3>
                  </Link>
                )
              })}
            </div>
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
              title="Línea de Tiempo"
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
              description="Historia, comisión directiva, reglamentos y todo sobre la LAB."
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
