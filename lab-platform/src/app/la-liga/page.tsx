import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Trophy, BookOpen, Users, FileText, ArrowRight } from 'lucide-react'

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
          <p className="font-condensed text-lg md:text-xl text-lab-gray tracking-wide max-w-lg mx-auto">
            La Liga Argentina de Béisbol organiza y promueve el béisbol competitivo en la República Argentina desde 1940.
          </p>
        </div>
      </section>

      {/* Quick nav */}
      <section className="bg-lab-surface border-y border-lab-border py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NavCard href="/la-liga/historia" icon={BookOpen} title="Historia" description="Más de 80 años de béisbol argentino" />
            <NavCard href="/la-liga/autoridades" icon={Users} title="Autoridades" description="Comisión directiva actual" />
            <NavCard href="/la-liga/reglamentos" icon={FileText} title="Reglamentos" description="Documentación oficial" />
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
