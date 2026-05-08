import type { PartidoConClubes } from '@/lib/database.types'
import { ESTADO_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import { getClubLogoUrl } from '@/lib/club-logo'

interface ScoreboardProps {
  partidos: PartidoConClubes[]
}

export default function Scoreboard({ partidos }: ScoreboardProps) {
  if (partidos.length === 0) {
    return (
      <div className="text-center py-8 text-lab-muted font-condensed tracking-wider">
        No hay partidos programados
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
      {partidos.map((partido) => (
        <ScoreCard key={partido.id} partido={partido} />
      ))}
    </div>
  )
}

function ScoreCard({ partido }: { partido: PartidoConClubes }) {
  const isLive = partido.estado === 'en_curso'
  const isFinal = partido.estado === 'finalizado'

  return (
    <div className="flex-shrink-0 w-60 snap-center bg-lab-surface rounded-lg border border-lab-border overflow-hidden hover:border-lab-gold/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lab-border/50">
        <span className="font-condensed text-xs tracking-wider text-lab-muted uppercase">
          {format(new Date(partido.fecha_hora), "EEE d MMM", { locale: es })}
        </span>
        <span className={`font-condensed text-xs tracking-wider font-semibold uppercase flex items-center gap-1.5
          ${isLive ? 'text-lab-red-light' : isFinal ? 'text-lab-gold' : 'text-lab-muted'}`}
        >
          {isLive && <span className="live-dot" />}
          {ESTADO_LABELS[partido.estado]}
        </span>
      </div>

      {/* Teams */}
      <div className="px-3 py-3 space-y-2">
        <TeamRow
          nombre={partido.local.nombre_corto || partido.local.nombre}
          colores={partido.local.colores}
          marcador={partido.marcador_local}
          isWinner={isFinal && partido.marcador_local !== null && partido.marcador_visitante !== null && partido.marcador_local > partido.marcador_visitante}
          logoUrl={getClubLogoUrl(partido.local)}
        />
        <TeamRow
          nombre={partido.visitante.nombre_corto || partido.visitante.nombre}
          colores={partido.visitante.colores}
          marcador={partido.marcador_visitante}
          isWinner={isFinal && partido.marcador_local !== null && partido.marcador_visitante !== null && partido.marcador_visitante > partido.marcador_local}
          logoUrl={getClubLogoUrl(partido.visitante)}
        />
      </div>

      {/* Footer */}
      {isFinal && (
        <div className="px-3 pb-2">
          <Link
            href={`/fixture/${partido.id}`}
            className="block text-center font-condensed text-xs tracking-wider text-lab-gold hover:text-lab-gold-light transition-colors"
          >
            VER DETALLES →
          </Link>
        </div>
      )}
    </div>
  )
}

function TeamRow({
  nombre,
  colores,
  marcador,
  isWinner,
  logoUrl,
}: {
  nombre: string
  colores: { primario: string; secundario: string; acento: string }
  marcador: number | null
  isWinner: boolean
  logoUrl?: string | null
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-sm flex items-center justify-center overflow-hidden font-display text-xs flex-shrink-0"
          style={{ backgroundColor: logoUrl ? 'transparent' : colores.primario, color: colores.secundario }}
        >
          {logoUrl ? (
            <Image src={logoUrl} alt={nombre} width={24} height={24} className="w-6 h-6 object-contain" />
          ) : (
            nombre[0]
          )}
        </div>
        <span className={`font-condensed text-sm tracking-wide ${isWinner ? 'text-lab-white font-bold' : 'text-lab-gray'}`}>
          {nombre}
        </span>
      </div>
      <span className={`font-display text-xl ${isWinner ? 'text-lab-gold' : 'text-lab-gray'}`}>
        {marcador !== null ? marcador : '-'}
      </span>
    </div>
  )
}
