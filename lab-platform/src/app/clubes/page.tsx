import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clubes',
  description: 'Todos los clubes de la Liga Argentina de Béisbol',
}

export const revalidate = 300

export default async function ClubesPage() {
  const supabase = await createClient()

  const { data: clubes } = await supabase
    .from('clubes')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          NUESTROS <span className="text-gradient-gold">CLUBES</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          Los equipos que conforman la Liga Argentina de Béisbol
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clubes?.map((club) => (
          <Link
            key={club.id}
            href={`/${club.slug}`}
            className="group relative bg-lab-surface rounded-xl border border-lab-border overflow-hidden hover:border-lab-gold/50 transition-all hover:-translate-y-1"
          >
            {/* Club color top bar */}
            <div
              className="h-2"
              style={{
                background: `linear-gradient(90deg, ${club.colores.primario}, ${club.colores.secundario})`,
              }}
            />

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 group-hover:scale-110 transition-transform">
                  {club.logo_url ? (
                    <Image
                      src={club.logo_url}
                      alt={`Logo ${club.nombre}`}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg object-contain"
                      style={{ backgroundColor: club.colores.primario }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-lg flex items-center justify-center font-display text-3xl"
                      style={{ backgroundColor: club.colores.primario, color: club.colores.secundario }}
                    >
                      {(club.nombre_corto || club.nombre)[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl tracking-wider text-lab-white group-hover:text-lab-gold transition-colors">
                    {club.nombre}
                  </h2>
                  {club.sede && (
                    <p className="font-condensed text-sm text-lab-muted tracking-wide mt-1">
                      📍 {club.sede}
                    </p>
                  )}
                  {club.fundacion && (
                    <p className="font-condensed text-sm text-lab-muted tracking-wide">
                      Fundado en {club.fundacion}
                    </p>
                  )}
                </div>
              </div>

              {club.historia && (
                <p className="text-lab-gray text-sm mt-4 line-clamp-3 leading-relaxed">
                  {club.historia.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <span className="font-condensed text-xs tracking-widest uppercase text-lab-gold group-hover:text-lab-gold-light transition-colors">
                  Ver equipo →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {(!clubes || clubes.length === 0) && (
        <div className="text-center py-16">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            Los clubes se mostrarán aquí cuando se registren en la plataforma
          </p>
        </div>
      )}
    </div>
  )
}
