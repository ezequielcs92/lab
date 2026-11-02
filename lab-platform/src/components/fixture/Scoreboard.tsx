import type { PartidoConClubes } from '@/lib/database.types'
import { ESTADO_LABELS } from '@/lib/constants'
import { formatArgentinaDateTime } from '@/lib/date-time'
import Link from 'next/link'
import Image from 'next/image'
import { getClubLogoUrl } from '@/lib/club-logo'
import { extractYouTubeId, getYouTubeWatchUrl, isYouTubeUrl } from '@/lib/youtube'
import { Radio } from 'lucide-react'
import { describeInning, hasHitsOrErrors } from '@/lib/live-game'

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
  const hasStream = Boolean(partido.streaming_url && isYouTubeUrl(partido.streaming_url))
  const videoId = partido.streaming_url ? extractYouTubeId(partido.streaming_url) : null
  const inning = isLive ? describeInning(partido) : null
  const showRhe = isLive && hasHitsOrErrors(partido)

  return (
    <div className={`flex-shrink-0 w-60 snap-center bg-lab-surface rounded-lg border overflow-hidden hover:border-lab-gold/30 transition-colors ${hasStream ? 'border-lab-red/40' : 'border-lab-border'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lab-border/50">
        <span className="font-condensed text-xs tracking-wider text-lab-muted uppercase">
          {formatArgentinaDateTime(partido.fecha_hora, { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
        <span className={`font-condensed text-xs tracking-wider font-semibold uppercase flex items-center gap-1.5
          ${isLive ? 'text-lab-red-light' : isFinal ? 'text-lab-gold' : 'text-lab-muted'}`}
        >
          {isLive && <span className="live-dot" />}
          {ESTADO_LABELS[partido.estado]}
        </span>
      </div>

      {inning && (
        <p className="px-3 pt-2 font-condensed text-xs tracking-wider text-lab-gold uppercase" aria-label={inning.accessibleLabel}>
          {inning.label}{inning.arrow && <span aria-hidden="true"> {inning.arrow}</span>}
        </p>
      )}

      {/* Teams */}
      <div className="px-3 py-3 space-y-2">
        {showRhe && (
          <div className="flex justify-end gap-3 font-condensed text-[10px] tracking-widest text-lab-muted" aria-hidden="true">
            <span className="w-6 text-right">R</span>
            <span className="w-5 text-center">H</span>
            <span className="w-5 text-center">E</span>
          </div>
        )}
        <TeamRow
          nombre={partido.visitante.nombre_corto || partido.visitante.nombre}
          colores={partido.visitante.colores}
          marcador={partido.marcador_visitante}
          detalle={showRhe ? { hits: partido.hits_visitante, errores: partido.errores_visitante } : undefined}
          isWinner={isFinal && partido.marcador_local !== null && partido.marcador_visitante !== null && partido.marcador_visitante > partido.marcador_local}
          logoUrl={getClubLogoUrl(partido.visitante)}
        />
        <TeamRow
          nombre={partido.local.nombre_corto || partido.local.nombre}
          colores={partido.local.colores}
          marcador={partido.marcador_local}
          detalle={showRhe ? { hits: partido.hits_local, errores: partido.errores_local } : undefined}
          isWinner={isFinal && partido.marcador_local !== null && partido.marcador_visitante !== null && partido.marcador_local > partido.marcador_visitante}
          logoUrl={getClubLogoUrl(partido.local)}
        />
      </div>

      {/* Footer */}
      <div className="px-3 pb-2">
        {hasStream ? (
          <a
            href={videoId ? getYouTubeWatchUrl(videoId) : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-center font-condensed text-xs tracking-wider text-lab-red-light hover:text-lab-red transition-colors"
          >
            <Radio className="w-3 h-3" />
            {isFinal ? 'VER PARTIDO' : isLive ? 'VER EN YOUTUBE' : 'IR A YOUTUBE'} →
          </a>
        ) : isFinal ? (
          <Link
            href={`/fixture/${partido.id}`}
            className="block text-center font-condensed text-xs tracking-wider text-lab-gold hover:text-lab-gold-light transition-colors"
          >
            VER DETALLES →
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function TeamRow({
  nombre,
  colores,
  marcador,
  detalle,
  isWinner,
  logoUrl,
}: {
  nombre: string
  colores: { primario: string; secundario: string; acento: string }
  marcador: number | null
  detalle?: { hits: number | null; errores: number | null }
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
      <span className="flex items-baseline gap-3">
        <span className={`font-display text-xl ${detalle ? 'w-6 text-right' : ''} ${isWinner ? 'text-lab-gold' : 'text-lab-gray'}`}>
          {marcador !== null ? marcador : '-'}
        </span>
        {detalle && (
          <>
            <span className="w-5 text-center font-condensed text-sm text-lab-gray">{detalle.hits ?? '-'}</span>
            <span className="w-5 text-center font-condensed text-sm text-lab-gray">{detalle.errores ?? '-'}</span>
          </>
        )}
      </span>
    </div>
  )
}
