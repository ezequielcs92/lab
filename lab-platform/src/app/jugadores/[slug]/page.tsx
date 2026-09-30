import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import PlayerCard from '@/components/players/PlayerCard'
import { POSICION_LABELS } from '@/lib/constants'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getClubLogoUrl } from '@/lib/club-logo'
import PlayerSeasonStats from '@/components/players/PlayerSeasonStats'
import { chooseCanonicalPlayerProfile } from '@/lib/player-identity'

export const revalidate = 120

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('jugadores')
    .select('nombre, posicion')
    .eq('slug', slug)
    .single()

  if (!data) return { title: 'Jugador no encontrado' }
  return {
    title: `${data.nombre} - ${POSICION_LABELS[data.posicion]}`,
  }
}

export default async function JugadorPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: jugador } = await supabase
    .from('jugadores')
    .select('*, clubes(*)')
    .eq('slug', slug)
    .single()

  if (!jugador) notFound()

  if (jugador.stable_id) {
    const [{ data: activeSeason }, { data: profiles }] = await Promise.all([
      supabase.from('temporadas').select('id').eq('activa', true).maybeSingle(),
      supabase.from('jugadores').select('id, slug, stable_id, club_id, temporada_id, updated_at').eq('stable_id', jugador.stable_id),
    ])
    const canonicalProfile = chooseCanonicalPlayerProfile(profiles ?? [], activeSeason?.id ?? null)
    if (canonicalProfile && canonicalProfile.id !== jugador.id) {
      redirect(`/jugadores/${canonicalProfile.slug}`)
    }
  }

  const club = (jugador as any).clubes
  const clubLogoUrl = getClubLogoUrl(club)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <Link
        href="/jugadores"
        className="inline-flex items-center gap-2 font-condensed text-sm tracking-wider text-lab-muted hover:text-lab-gold transition-colors mb-8 uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al roster
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Card */}
        <div className="flex justify-center">
          <PlayerCard
            jugador={jugador}
            clubNombre={club?.nombre_corto || club?.nombre}
            clubColores={club?.colores}
            clubLogoUrl={clubLogoUrl}
            size="lg"
          />
        </div>

        {/* Info */}
        <div>
          <h1 className="font-display text-4xl tracking-wider text-lab-white mb-2">
            {jugador.nombre}
          </h1>

          <div className="flex items-center gap-3 mb-6">
            {club && (
              <Link
                href={`/${club.slug}`}
                className="inline-flex items-center gap-2 font-condensed text-sm tracking-wider uppercase hover:text-lab-gold transition-colors"
                style={{ color: club.colores.secundario }}
              >
                <div
                  className="w-5 h-5 rounded-sm flex items-center justify-center font-display text-xs"
                  style={{ backgroundColor: club.colores.primario, color: club.colores.secundario }}
                >
                  {(club.nombre_corto || club.nombre)[0]}
                </div>
                {club.nombre}
              </Link>
            )}
            <span className="px-2 py-0.5 rounded bg-lab-surface border border-lab-border font-condensed text-xs tracking-widest uppercase text-lab-gold">
              {POSICION_LABELS[jugador.posicion]}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <DetailSection title="Datos Personales">
              <DetailRow label="Número" value={jugador.numero_camiseta?.toString()} />
              <DetailRow label="Posición" value={POSICION_LABELS[jugador.posicion]} />
              <DetailRow label="Batea" value={jugador.batea} />
              <DetailRow label="Lanza" value={jugador.lanza} />
              <DetailRow label="Nacimiento" value={jugador.lugar_nacimiento} />
            </DetailSection>

            {jugador.bio && (
              <DetailSection title="Biografía">
                <p className="text-lab-gray text-sm leading-relaxed">{jugador.bio}</p>
              </DetailSection>
            )}

            <PlayerSeasonStats playerId={jugador.id} stableId={jugador.stable_id} />
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border p-4">
      <h2 className="font-display text-sm tracking-widest text-lab-gold mb-3 uppercase">{title}</h2>
      {children}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-1 border-b border-lab-border/30 last:border-0">
      <span className="font-condensed text-xs tracking-wider uppercase text-lab-muted">{label}</span>
      <span className="font-condensed text-sm font-semibold text-lab-white">{value}</span>
    </div>
  )
}
