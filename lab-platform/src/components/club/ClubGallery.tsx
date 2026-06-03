'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { GaleriaClub } from '@/lib/database.types'

export default function ClubGallery({ fotos }: { fotos: GaleriaClub[] }) {
  const [index, setIndex] = useState<number | null>(null)

  const close = useCallback(() => setIndex(null), [])
  const prev = useCallback(() => setIndex(i => (i === null ? null : (i - 1 + fotos.length) % fotos.length)), [fotos.length])
  const next = useCallback(() => setIndex(i => (i === null ? null : (i + 1) % fotos.length)), [fotos.length])

  useEffect(() => {
    if (index === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, close, prev, next])

  const current = index !== null ? fotos[index] : null

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fotos.map((foto, i) => (
          <button
            key={foto.id}
            onClick={() => setIndex(i)}
            className="relative aspect-video rounded-lg overflow-hidden bg-lab-surface border border-lab-border group focus:outline-none focus-visible:ring-2 focus-visible:ring-lab-gold"
          >
            <Image
              src={foto.imagen_url}
              alt={foto.titulo || `Foto ${i + 1}`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {current && index !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* Prev */}
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className="absolute left-3 md:left-6 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* Image */}
          <div
            className="relative max-w-5xl w-full mx-16 aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.imagen_url}
              alt={current.titulo || `Foto ${index + 1}`}
              fill
              sizes="(min-width: 1280px) 80vw, 95vw"
              className="object-contain"
              priority
            />
            {current.titulo && (
              <p className="absolute bottom-0 left-0 right-0 text-center font-condensed text-sm text-white bg-black/50 py-2 px-4">
                {current.titulo}
              </p>
            )}
          </div>

          {/* Next */}
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className="absolute right-3 md:right-6 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-7 h-7" />
          </button>

          {/* Close */}
          <button
            onClick={close}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-condensed text-sm text-white/60 tracking-widest">
            {index + 1} / {fotos.length}
          </span>
        </div>
      )}
    </>
  )
}
