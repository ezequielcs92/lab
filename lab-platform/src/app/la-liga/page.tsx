import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, Users, FileText, ArrowRight, MapPin, Calendar, Trophy, Swords } from 'lucide-react'

export const metadata: Metadata = {
  title: 'La Liga',
  description: 'Historia, autoridades y reglamentos de la Liga Argentina de Béisbol',
}

export const revalidate = 600

export default async function LaLigaPage() {
  const supabase = await createClient()

  const [{ data: autoridades }, { data: documentos }] = await Promise.all([
    supabase.from('autoridades').select('*').eq('activo', true).order('orden'),
    supabase.from('documentos').select('*').eq('publico', true).order('fecha_documento', { ascending: false }),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-field-gradient">
        <div className="bg-diamond-pattern absolute inset-0 opacity-20" />
        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-navy text-3xl font-bold mx-auto mb-6">
            L
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-wider text-lab-white leading-none mb-4">
            LA <span className="text-gradient-gold">LIGA</span>
          </h1>
          <p className="font-condensed text-lg md:text-xl text-lab-gray tracking-wide max-w-2xl mx-auto">
            La Liga Argentina de Béisbol es la principal competencia interprovincial de clubes del béisbol argentino. Fundada en 2017, reúne equipos de Salta, Córdoba y Buenos Aires en el nivel competitivo más alto del país.
          </p>
        </div>
      </section>

      {/* Datos clave */}
      <section className="bg-lab-navy border-y border-lab-border py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Calendar} label="Fundación" value="2017" />
            <StatCard icon={Swords} label="Equipos" value="6" />
            <StatCard icon={MapPin} label="Provincias" value="3" />
            <StatCard icon={Trophy} label="Formato" value="Round Robin" />
          </div>
        </div>
      </section>

      {/* Quick nav */}
      <section className="bg-lab-surface border-y border-lab-border py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NavCard href="/la-liga/historia" icon={BookOpen} title="Historia" description="Línea del tiempo del béisbol" />
            <NavCard href="/la-liga/autoridades" icon={Users} title="Autoridades" description="Fundadores y dirigentes" />
            <NavCard href="/la-liga/reglamentos" icon={FileText} title="Reglamentos" description="Documentación oficial" />
          </div>
        </div>
      </section>

      {/* Sobre la LAB */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <h2 className="font-display text-2xl md:text-3xl tracking-widest text-lab-white mb-6 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-lab-gold" />
          QUIÉNES SOMOS
        </h2>
        <div className="space-y-5 text-lab-gray leading-relaxed text-[15px]">
          <p>
            La Liga Argentina de Béisbol (LAB) fue fundada en 2017 por iniciativa de <strong className="text-lab-white">Pablo Tesouro</strong> y <strong className="text-lab-white">Roberto Braccini</strong>, con el objetivo de crear una competencia nacional de carácter profesional que impulsara el crecimiento del béisbol argentino.
          </p>
          <p>
            En los primeros años participaron equipos de Salta y Córdoba y, a partir de la sexta temporada en 2023, se incorporaron los clubes de Buenos Aires, conformando así una competencia nacional con la participación de clubes de las tres regiones donde el béisbol argentino tiene mayor desarrollo.
          </p>
          <p>
            El objetivo principal fue crear una competencia semiprofesional que elevara el nivel del béisbol nacional, permitiendo reforzar los equipos con jugadores profesionales extranjeros y generando un escenario de mayor exigencia para el desarrollo de los jugadores locales.
          </p>
          <p>
            En 2019 se alcanzó un hito muy importante: por primera vez el campeón de la liga representó a Argentina en una competencia internacional de clubes — la Serie Latinoamericana. Actualmente, ese lugar corresponde a la <strong className="text-lab-white">Serie de las Américas</strong>.
          </p>
        </div>
      </section>

      {/* La Competencia */}
      <section className="bg-lab-navy border-y border-lab-border py-14">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl tracking-widest text-lab-white mb-6 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-lab-gold" />
            LA COMPETENCIA
          </h2>
          <div className="space-y-5 text-lab-gray leading-relaxed text-[15px]">
            <p>
              Hasta 2025, la Liga Argentina de Béisbol estuvo integrada por seis equipos: <strong className="text-lab-white">Falcons</strong> y <strong className="text-lab-white">Arias</strong> de Córdoba, <strong className="text-lab-white">Infernales</strong> y <strong className="text-lab-white">Cachorros</strong> de Salta, y <strong className="text-lab-white">Patriots</strong> y <strong className="text-lab-white">DAOM</strong> de Buenos Aires.
            </p>
            <p>
              El formato de disputa es <strong className="text-lab-white">round robin</strong> (todos contra todos), seguido de una postemporada que define al campeón. Los partidos se juegan a <strong className="text-lab-white">siete innings</strong> y la competencia combina enfrentamientos dentro de cada provincia y cruces interprovinciales.
            </p>
            <p>
              El equipo ganador, además de consagrarse campeón, representa a la Argentina en la <strong className="text-lab-white">Serie de las Américas</strong>.
            </p>
            <p>
              En la temporada 2025 la fase regular se disputó entre el 11 de octubre y el 7 de diciembre, con un total de 66 juegos y 22 partidos por equipo. El campeón fue <strong className="text-lab-gold">Club DAOM</strong>, que representó a la Argentina en la Serie de las Américas 2026 disputada en Venezuela.
            </p>
          </div>
        </div>
      </section>

      {/* Autoridades */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-2xl tracking-widest text-lab-white flex items-center gap-2">
            <Users className="w-5 h-5 text-lab-gold" />
            AUTORIDADES
          </h2>
          <Link href="/la-liga/autoridades" className="font-condensed text-xs tracking-wider text-lab-gold hover:text-lab-gold-light transition-colors uppercase">
            Ver todas →
          </Link>
        </div>

        {autoridades && autoridades.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {autoridades.slice(0, 4).map((a) => (
              <div key={a.id} className="bg-lab-surface rounded-lg border border-lab-border p-5 text-center">
                <div className="w-16 h-16 rounded-full bg-lab-gold/10 mx-auto mb-3 flex items-center justify-center font-display text-xl text-lab-gold">
                  {a.nombre.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="font-condensed font-semibold text-lab-white tracking-wide text-sm">{a.nombre}</h3>
                <p className="font-condensed text-xs text-lab-gold tracking-wider uppercase mt-1">{a.cargo}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-lab-surface rounded-lg border border-lab-border p-8 text-center">
            <p className="font-condensed text-lab-muted tracking-wider">
              Las autoridades serán publicadas próximamente
            </p>
          </div>
        )}
      </section>

      {/* Documentos */}
      <section className="bg-lab-navy border-y border-lab-border py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl tracking-widest text-lab-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-lab-gold" />
              DOCUMENTOS OFICIALES
            </h2>
          </div>

          {documentos && documentos.length > 0 ? (
            <div className="space-y-3">
              {documentos.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.archivo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 bg-lab-surface rounded-lg border border-lab-border p-4 hover:border-lab-gold/30 transition-colors group"
                >
                  <FileText className="w-8 h-8 text-lab-gold flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-condensed font-semibold text-lab-white tracking-wide group-hover:text-lab-gold transition-colors truncate">
                      {doc.titulo}
                    </h3>
                    {doc.descripcion && (
                      <p className="text-lab-muted text-sm truncate">{doc.descripcion}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-lab-muted group-hover:text-lab-gold ml-auto flex-shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-lab-surface rounded-lg border border-lab-border p-8 text-center">
              <p className="font-condensed text-lab-muted tracking-wider">
                Documentos oficiales próximamente disponibles
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function NavCard({
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
      <Icon className="w-6 h-6 text-lab-gold flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="font-display text-lg tracking-wider text-lab-white group-hover:text-lab-gold transition-colors">
          {title}
        </h3>
        <p className="text-lab-muted text-sm mt-1">{description}</p>
      </div>
    </Link>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="text-center">
      <Icon className="w-6 h-6 text-lab-gold mx-auto mb-2" />
      <div className="font-display text-2xl tracking-wider text-lab-white">{value}</div>
      <div className="font-condensed text-xs tracking-widest uppercase text-lab-muted mt-1">{label}</div>
    </div>
  )
}
