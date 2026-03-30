import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const revalidate = 120

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('noticias')
    .select('titulo, extracto')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Noticia no encontrada' }
  return {
    title: data.titulo,
    description: data.extracto || undefined,
  }
}

export default async function NoticiaPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: noticia } = await supabase
    .from('noticias')
    .select('*, clubes(nombre, nombre_corto, slug, colores)')
    .eq('slug', slug)
    .single()

  if (!noticia) notFound()

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/noticias"
        className="inline-flex items-center gap-2 font-condensed text-sm tracking-wider text-lab-muted hover:text-lab-gold transition-colors mb-8 uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a noticias
      </Link>

      {noticia.imagen_url && (
        <div className="rounded-xl overflow-hidden mb-8 aspect-video">
          <img
            src={noticia.imagen_url}
            alt={noticia.titulo}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        {(noticia as any).clubes && (
          <Link
            href={`/${(noticia as any).clubes.slug}`}
            className="font-condensed text-xs tracking-widest uppercase font-semibold px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
            style={{
              color: (noticia as any).clubes.colores.secundario,
              backgroundColor: `${(noticia as any).clubes.colores.primario}66`,
            }}
          >
            {(noticia as any).clubes.nombre_corto || (noticia as any).clubes.nombre}
          </Link>
        )}
        <span className="font-condensed text-xs tracking-wider text-lab-muted">
          {format(new Date(noticia.fecha_publicacion), "d 'de' MMMM, yyyy", { locale: es })}
        </span>
      </div>

      <h1 className="font-display text-3xl md:text-4xl tracking-wider text-lab-white mb-6">
        {noticia.titulo}
      </h1>

      <div className="prose prose-invert prose-lg max-w-none">
        <div
          className="text-lab-gray leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: noticia.contenido }}
        />
      </div>
    </article>
  )
}
