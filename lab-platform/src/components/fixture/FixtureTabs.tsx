'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Image from 'next/image'
import type { PartidoConClubes } from '@/lib/database.types'
import { ESTADO_LABELS } from '@/lib/constants'
import { getClubLogoUrl } from '@/lib/club-logo'

interface Props {
  partidos: PartidoConClubes[]
}

function groupByFecha(list: PartidoConClubes[]) {
  const byFecha: Record<string, PartidoConClubes[]> = {}
  list.forEach((p) => {
    const key = p.fecha_numero ? `Fecha ${p.fecha_numero}` : format(new Date(p.fecha_hora), 'MMMM yyyy', { locale: es })
    if (!byFecha[key]) byFecha[key] = []
    byFecha[key]!.push(p)
  })
  return byFecha
}

function sortFechaKeys(entries: [string, PartidoConClubes[]][], direction: 'asc' | 'desc') {
  return entries.sort(([a], [b]) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0
    const numB = parseInt(b.replace(/\D/g, '')) || 0
    return direction === 'desc' ? numB - numA : numA - numB
  })
}

function TeamBadge({ club }: { club: PartidoConClubes['local'] }) {
  const clubLogoUrl = getClubLogoUrl(club)

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-7 h-7 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ backgroundColor: clubLogoUrl ? 'transparent' : club.colores.primario }}
      >
        {clubLogoUrl ? (
          <Image src={clubLogoUrl} alt={club.nombre} width={28} height={28} className="w-7 h-7 object-contain" />
        ) : (
          <span className="font-display text-xs" style={{ color: club.colores.secundario }}>
            {(club.nombre_corto || club.nombre)[0]}
          </span>
        )}
      </div>
      <span className="font-condensed text-sm tracking-wide text-lab-white hidden sm:inline">
        {club.nombre_corto || club.nombre}
      </span>
    </div>
  )
}

function MatchRow({ p, showResult }: { p: PartidoConClubes; showResult: boolean }) {
  const localWins = showResult && (p.marcador_local ?? -1) > (p.marcador_visitante ?? -1)
  const visitaWins = showResult && (p.marcador_visitante ?? -1) > (p.marcador_local ?? -1)

  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border p-4 hover:border-lab-gold/30 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Date/time */}
        <div className="sm:w-24 flex-shrink-0">
          <div className="font-condensed text-xs tracking-wider text-lab-muted uppercase">
            {format(new Date(p.fecha_hora), 'EEE d MMM', { locale: es })}
          </div>
          <div className="font-condensed text-xs text-lab-muted">
            {format(new Date(p.fecha_hora), 'HH:mm')} hs
          </div>
        </div>

        {/* Teams + score */}
        <div className="flex-1 flex items-center gap-3">
          <TeamBadge club={p.local} />
          <div className="flex items-center gap-2 font-display">
            <span className={`text-xl ${localWins ? 'text-lab-gold' : 'text-lab-gray'}`}>
              {showResult ? (p.marcador_local ?? '-') : '-'}
            </span>
            <span className="text-lab-muted text-sm">vs</span>
            <span className={`text-xl ${visitaWins ? 'text-lab-gold' : 'text-lab-gray'}`}>
              {showResult ? (p.marcador_visitante ?? '-') : '-'}
            </span>
          </div>
          <TeamBadge club={p.visitante} />
        </div>

        {/* Status */}
        <div className="sm:w-24 flex-shrink-0 text-right">
          <span className={`font-condensed text-xs tracking-widest uppercase font-semibold
            ${p.estado === 'en_curso' ? 'text-lab-red-light' : p.estado === 'finalizado' ? 'text-lab-gold' : 'text-lab-muted'}`}
          >
            {ESTADO_LABELS[p.estado as keyof typeof ESTADO_LABELS]}
          </span>
        </div>
      </div>

      {p.estadio && (
        <div className="mt-2 font-condensed text-xs text-lab-muted tracking-wider">
          📍 {p.estadio}
        </div>
      )}
    </div>
  )
}

function FechaGroup({ fecha, games, showResult }: { fecha: string; games: PartidoConClubes[]; showResult: boolean }) {
  return (
    <section>
      <h2 className="font-display text-lg tracking-widest text-lab-gold mb-4 uppercase">{fecha}</h2>
      <div className="space-y-3">
        {games.map((p) => <MatchRow key={p.id} p={p} showResult={showResult} />)}
      </div>
    </section>
  )
}

export default function FixtureTabs({ partidos }: Props) {
  const [tab, setTab] = useState<'resultados' | 'proximos'>('resultados')

  const finalizados = partidos.filter((p) => p.estado === 'finalizado' || p.estado === 'en_curso')
  const proximos = partidos.filter((p) => p.estado === 'programado')

  const resultadosAgrupados = sortFechaKeys(Object.entries(groupByFecha(finalizados)), 'desc')
  const proximosAgrupados = sortFechaKeys(Object.entries(groupByFecha(proximos)), 'asc')

  const TABS = [
    { id: 'resultados' as const, label: 'Resultados', count: finalizados.length },
    { id: 'proximos' as const, label: 'Próximos partidos', count: proximos.length },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-lab-surface border border-lab-border rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded font-condensed text-sm tracking-wider transition-all
              ${tab === t.id
                ? 'bg-lab-gold text-lab-accent-fg font-bold'
                : 'text-lab-muted hover:text-lab-white'}`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded font-condensed
              ${tab === t.id ? 'bg-lab-navy/30 text-lab-accent-fg' : 'bg-lab-border text-lab-muted'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Resultados tab */}
      {tab === 'resultados' && (
        <div className="space-y-8">
          {resultadosAgrupados.length > 0 ? (
            resultadosAgrupados.map(([fecha, games]) => (
              <FechaGroup key={fecha} fecha={fecha} games={games} showResult={true} />
            ))
          ) : (
            <div className="bg-lab-surface rounded-lg border border-lab-border p-12 text-center">
              <p className="font-condensed text-lab-muted tracking-wider text-lg">
                Aún no hay partidos finalizados
              </p>
            </div>
          )}
        </div>
      )}

      {/* Próximos partidos tab */}
      {tab === 'proximos' && (
        <div className="space-y-8">
          {proximosAgrupados.length > 0 ? (
            proximosAgrupados.map(([fecha, games]) => (
              <FechaGroup key={fecha} fecha={fecha} games={games} showResult={false} />
            ))
          ) : (
            <div className="bg-lab-surface rounded-lg border border-lab-border p-12 text-center">
              <p className="font-condensed text-lab-muted tracking-wider text-lg">
                No hay partidos programados próximamente
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
