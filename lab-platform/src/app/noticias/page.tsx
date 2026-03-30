import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Noticias',
  description: 'Últimas noticias de la Liga Argentina de Béisbol',
}

export const revalidate = 60

export default async function NoticiasPage() {
  const supabase = await createClient()

  const { data: noticias } = await supabase
    .from('noticias')
    .select('*, clubes(nombre, nombre_corto, slug, colores)')
    .eq('publicada', true)
    .order('fecha_publicacion', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          <span className="text-gradient-gold">NOTICIAS</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          Lo último del béisbol argentino
        </p>
      </div>

      {noticias && noticias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {noticias.map((noticia: any, idx: number) => (
            <Link
              key={noticia.id}
              href={`/noticias/${noticia.slug}`}
              className={`group bg-lab-surface rounded-xl border border-lab-border overflow-hidden hover:border-lab-gold/50 transition-all hover:-translate-y-1
                ${idx === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}
            >
              {noticia.imagen_url && (
                <div className={`relative overflow-hidden ${idx === 0 ? 'h-64' : 'h-44'}`}>
                  <img
                    src={noticia.imagen_url}
                    alt={noticia.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-lab-surface via-transparent to-transparent" />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  {noticia.clubes && (
                    <span
                      className="font-condensed text-xs tracking-widest uppercase font-semibold px-2 py-0.5 rounded"
                      style={{
                        color: noticia.clubes.colores.secundario,
                        backgroundColor: `${noticia.clubes.colores.primario}66`,
                      }}
                    >
                      {noticia.clubes.nombre_corto || noticia.clubes.nombre}
                    </span>
                  )}
                  {noticia.destacada && (
                    <span className="font-condensed text-xs tracking-widest uppercase font-semibold text-lab-gold">
                      ★ Destacada
                    </span>
                  )}
                  <span className="font-condensed text-xs tracking-wider text-lab-muted ml-auto">
                    {format(new Date(noticia.fecha_publicacion), "d MMM yyyy", { locale: es })}
                  </span>
                </div>
                <h2 className={`font-display tracking-wider text-lab-white group-hover:text-lab-gold transition-colors ${idx === 0 ? 'text-2xl' : 'text-lg'}`}>
                  {noticia.titulo}
                </h2>
                {noticia.extracto && (
                  <p className="text-lab-gray text-sm mt-2 line-clamp-2 leading-relaxed">
                    {noticia.extracto}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            Próximamente: noticias del béisbol argentino
          </p>
        </div>
      )}
    </div>
  )
}
