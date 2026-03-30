import type { ArchivoHistorico } from '@/lib/database.types'
import { TIPO_HITO_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trophy, BookOpen, FileText, Camera, Medal, Heart } from 'lucide-react'

interface TimelineProps {
  hitos: ArchivoHistorico[]
}

const TIPO_ICONS = {
  campeon: Trophy,
  historia: BookOpen,
  documento: FileText,
  foto_historica: Camera,
  record: Medal,
  homenaje: Heart,
}

export default function Timeline({ hitos }: TimelineProps) {
  const sorted = [...hitos].sort((a, b) => new Date(b.fecha_hito).getTime() - new Date(a.fecha_hito).getTime())

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-lab-border" />

      <div className="space-y-8">
        {sorted.map((hito, idx) => {
          const Icon = TIPO_ICONS[hito.tipo] || BookOpen
          const isLeft = idx % 2 === 0

          return (
            <div
              key={hito.id}
              className={`relative flex items-start gap-6 ${
                isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Timeline dot */}
              <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10">
                <div className="w-8 h-8 rounded-full bg-lab-surface-light border-2 border-lab-gold flex items-center justify-center">
                  <Icon className="w-4 h-4 text-lab-gold" />
                </div>
              </div>

              {/* Content */}
              <div className={`ml-14 md:ml-0 md:w-[calc(50%-2rem)] ${isLeft ? 'md:pr-8' : 'md:pl-8'}`}>
                <div className="bg-lab-surface rounded-lg border border-lab-border p-4 hover:border-lab-gold/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-condensed text-xs tracking-widest uppercase text-lab-gold font-semibold">
                      {TIPO_HITO_LABELS[hito.tipo]}
                    </span>
                    <span className="text-lab-muted text-xs">•</span>
                    <span className="font-condensed text-xs tracking-wider text-lab-muted">
                      {format(new Date(hito.fecha_hito), "d 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                  <h3 className="font-display text-lg tracking-wider text-lab-white mb-1">
                    {hito.titulo}
                  </h3>
                  {hito.descripcion && (
                    <p className="text-lab-gray text-sm leading-relaxed">
                      {hito.descripcion}
                    </p>
                  )}
                  {hito.media_url && (
                    <div className="mt-3 rounded-md overflow-hidden">
                      <img
                        src={hito.media_url}
                        alt={hito.titulo}
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
