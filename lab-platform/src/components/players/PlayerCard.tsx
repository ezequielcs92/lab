import type { Jugador, ColoresClub } from '@/lib/database.types'
import { POSICION_ABBR } from '@/lib/constants'
import Image from 'next/image'

interface PlayerCardProps {
  jugador: Jugador
  clubNombre?: string
  clubColores?: ColoresClub
  clubLogoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export default function PlayerCard({
  jugador,
  clubNombre,
  clubColores = { primario: '#0A1628', secundario: '#D4A843', acento: '#FFFFFF' },
  clubLogoUrl,
  size = 'md',
}: PlayerCardProps) {
  const hasStats = jugador.avg !== null || jugador.era !== null
  const isPitcher = jugador.posicion === 'pitcher'

  const sizeClasses = {
    sm: 'w-48 h-72',
    md: 'w-64 h-96',
    lg: 'w-80 h-[480px]',
  }

  const photoSizes = {
    sm: { w: 120, h: 140 },
    md: { w: 180, h: 210 },
    lg: { w: 240, h: 280 },
  }

  return (
    <div
      className={`${sizeClasses[size]} relative rounded-xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
      style={{
        '--club-primary': clubColores.primario,
        '--club-secondary': clubColores.secundario,
        '--club-accent': clubColores.acento,
      } as React.CSSProperties}
    >
      {/* Card background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${clubColores.primario} 0%, ${clubColores.primario}ee 40%, ${clubColores.secundario}33 100%)`,
        }}
      />

      {/* Diamond pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 49.5%, ${clubColores.secundario} 49.5%, ${clubColores.secundario} 50.5%, transparent 50.5%),
            linear-gradient(-45deg, transparent 49.5%, ${clubColores.secundario} 49.5%, ${clubColores.secundario} 50.5%, transparent 50.5%)
          `,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Shine effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(105deg, transparent 40%, ${clubColores.secundario}22 45%, ${clubColores.secundario}44 50%, ${clubColores.secundario}22 55%, transparent 60%)`,
        }}
      />

      {/* Top bar with position + number */}
      <div className="relative z-10 flex items-center justify-between px-3 pt-3">
        <span
          className="font-display text-sm tracking-widest px-2 py-0.5 rounded"
          style={{ backgroundColor: clubColores.secundario, color: clubColores.primario }}
        >
          {POSICION_ABBR[jugador.posicion]}
        </span>
        {jugador.numero_camiseta && (
          <span
            className="font-display text-3xl leading-none"
            style={{ color: clubColores.secundario }}
          >
            {jugador.numero_camiseta}
          </span>
        )}
      </div>

      {/* Player photo */}
      <div className="relative z-10 flex justify-center mt-1">
        <div
          className="relative rounded-lg overflow-hidden"
          style={{ width: photoSizes[size].w, height: photoSizes[size].h }}
        >
          {jugador.foto_url ? (
            <Image
              src={jugador.foto_url}
              alt={jugador.nombre}
              fill
              className="object-cover object-top"
              sizes={`${photoSizes[size].w}px`}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-display text-4xl"
              style={{ backgroundColor: `${clubColores.secundario}22`, color: clubColores.secundario }}
            >
              {jugador.nombre.split(' ').map(n => n[0]).join('')}
            </div>
          )}
        </div>
      </div>

      {/* Club logo watermark */}
      {clubLogoUrl && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 z-0">
          <Image src={clubLogoUrl} alt="" width={200} height={200} className="object-contain" />
        </div>
      )}

      {/* Player info */}
      <div className="relative z-10 px-3 mt-2">
        {/* Name plate */}
        <div
          className="rounded-md px-2 py-1.5"
          style={{ backgroundColor: `${clubColores.secundario}22`, borderLeft: `3px solid ${clubColores.secundario}` }}
        >
          <h3
            className="font-display text-lg tracking-wider leading-tight truncate"
            style={{ color: clubColores.acento }}
          >
            {jugador.nombre}
          </h3>
          {clubNombre && (
            <p
              className="font-condensed text-xs tracking-wider uppercase"
              style={{ color: clubColores.secundario }}
            >
              {clubNombre}
            </p>
          )}
        </div>

        {/* Stats section (Fase 2 ready) */}
        {hasStats && (
          <div className="mt-2 grid grid-cols-3 gap-1">
            {isPitcher ? (
              <>
                <StatBadge label="ERA" value={jugador.era?.toFixed(2)} color={clubColores.secundario} />
                <StatBadge label="W" value={jugador.w?.toString()} color={clubColores.secundario} />
                <StatBadge label="SO" value={jugador.so?.toString()} color={clubColores.secundario} />
              </>
            ) : (
              <>
                <StatBadge label="AVG" value={jugador.avg?.toFixed(3)} color={clubColores.secundario} />
                <StatBadge label="HR" value={jugador.hr?.toString()} color={clubColores.secundario} />
                <StatBadge label="RBI" value={jugador.rbi?.toString()} color={clubColores.secundario} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom border accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${clubColores.secundario}, ${clubColores.acento}, ${clubColores.secundario})` }}
      />
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value?: string; color: string }) {
  if (!value) return null
  return (
    <div className="text-center">
      <div className="font-display text-sm" style={{ color }}>{value}</div>
      <div className="font-condensed text-[10px] tracking-wider text-lab-muted uppercase">{label}</div>
    </div>
  )
}
