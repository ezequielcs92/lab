'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Radio } from 'lucide-react'
import type { Json, PartidoConClubes } from '@/lib/database.types'
import { extractYouTubeId, getYouTubeWatchUrl } from '@/lib/youtube'
import { getClubLogoUrl } from '@/lib/club-logo'

function countdownTo(date: string): string {
  const distance = new Date(date).getTime() - Date.now()
  if (distance <= 0) return 'La transmisión está por comenzar'
  const days = Math.floor(distance / 86_400_000)
  const hours = Math.floor((distance % 86_400_000) / 3_600_000)
  const minutes = Math.floor((distance % 3_600_000) / 60_000)
  return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`
}

function innings(value: Json): { inning: number; local: number; visitante: number }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const inning = Number(item.inning)
    const local = Number(item.local)
    const visitante = Number(item.visitante)
    return Number.isInteger(inning) && Number.isInteger(local) && Number.isInteger(visitante)
      ? [{ inning, local, visitante }]
      : []
  })
}

export default function LiveStreamBanner({ partido }: { partido: PartidoConClubes }) {
  const [countdown, setCountdown] = useState(() => countdownTo(partido.fecha_hora))
  const videoId = partido.streaming_url ? extractYouTubeId(partido.streaming_url) : null
  const isFinal = partido.estado === 'finalizado'
  const isLive = partido.estado === 'en_curso'
  const inningScores = innings(partido.marcador_innings)

  useEffect(() => {
    if (isFinal || isLive) return
    const timer = window.setInterval(() => setCountdown(countdownTo(partido.fecha_hora)), 30_000)
    return () => window.clearInterval(timer)
  }, [isFinal, isLive, partido.fecha_hora])

  if (!videoId) return null
  const watchUrl = getYouTubeWatchUrl(videoId)
  const localLogo = getClubLogoUrl(partido.local)
  const visitanteLogo = getClubLogoUrl(partido.visitante)

  return (
    <section aria-label="Transmisión del partido" className="bg-lab-surface rounded-xl border border-lab-border overflow-hidden">
      <div className="grid md:grid-cols-[1fr_auto] items-stretch">
        <div className="relative p-6 md:p-8 bg-gradient-to-br from-lab-navy to-lab-dark overflow-hidden">
          <div className="bg-diamond-pattern absolute inset-0 opacity-20" />
          <div className="relative flex items-center justify-center gap-6 md:gap-12">
            <TeamLogo name={partido.local.nombre_corto || partido.local.nombre} url={localLogo} />
            <div className="text-center">
              <p className={`font-display tracking-widest uppercase ${isLive ? 'text-lab-red-light' : 'text-lab-gold'}`}>
                {isLive ? 'En vivo' : isFinal ? 'Partido finalizado' : 'Próxima transmisión'}
              </p>
              <p className="font-display text-3xl md:text-5xl text-lab-white mt-2">
                {partido.marcador_local ?? '-'} <span className="text-lab-muted">:</span> {partido.marcador_visitante ?? '-'}
              </p>
            </div>
            <TeamLogo name={partido.visitante.nombre_corto || partido.visitante.nombre} url={visitanteLogo} />
          </div>
        </div>

        <div className="p-6 md:w-72 flex flex-col justify-center bg-lab-navy/30">
          {!isLive && !isFinal && <p className="font-display text-2xl text-lab-gold mb-2">{countdown}</p>}
          <p className="font-condensed text-sm text-lab-gray mb-5">
            {new Date(partido.fecha_hora).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
          <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 font-condensed text-sm tracking-wider uppercase px-4 py-3 rounded-lg bg-lab-red text-white hover:bg-lab-red-light transition-colors">
            {isLive && <Radio className="w-4 h-4" />}
            {!isLive && <ExternalLink className="w-4 h-4" />}
            {isFinal ? 'Ver partido' : isLive ? 'Ver en YouTube' : 'Ir a YouTube'}
          </a>
        </div>
      </div>

      {isFinal && inningScores.length > 0 && (
        <div className="overflow-x-auto border-t border-lab-border">
          <table className="w-full min-w-max text-xs font-condensed">
            <thead>
              <tr className="border-b border-lab-border bg-lab-navy/30 text-lab-muted">
                <th className="text-left px-4 py-2">Equipo</th>
                {inningScores.map((item) => <th key={item.inning} className="px-3 py-2 text-center">{item.inning}</th>)}
                <th className="px-4 py-2 text-center text-lab-gold">R</th>
              </tr>
            </thead>
            <tbody>
              <InningRow label={partido.visitante.nombre_corto || partido.visitante.nombre} scores={inningScores.map((item) => item.visitante)} total={partido.marcador_visitante} />
              <InningRow label={partido.local.nombre_corto || partido.local.nombre} scores={inningScores.map((item) => item.local)} total={partido.marcador_local} />
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TeamLogo({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="text-center w-24">
      <div className="relative w-14 h-14 mx-auto mb-2">
        {url ? <Image src={url} alt={name} fill className="object-contain" /> : <span className="font-display text-4xl text-lab-gold">{name[0]}</span>}
      </div>
      <p className="font-condensed text-sm text-lab-white truncate">{name}</p>
    </div>
  )
}

function InningRow({ label, scores, total }: { label: string; scores: number[]; total: number | null }) {
  return (
    <tr className="border-t border-lab-border/50 first:border-0">
      <th className="text-left px-4 py-2 text-lab-white">{label}</th>
      {scores.map((score, index) => <td key={index} className="px-3 py-2 text-center text-lab-gray">{score}</td>)}
      <td className="px-4 py-2 text-center font-bold text-lab-gold">{total ?? '-'}</td>
    </tr>
  )
}
