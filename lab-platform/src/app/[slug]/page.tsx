import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PlayerCard from '@/components/players/PlayerCard'
import Link from 'next/link'
import type { Metadata } from 'next'
import Image from 'next/image'
import { MapPin, Calendar, Users, Image as ImageIcon } from 'lucide-react'
import type { Club, Jugador, StaffClub, GaleriaClub } from '@/lib/database.types'
import { sanitizeContent } from '@/lib/sanitize'
import { getClubLogoUrl } from '@/lib/club-logo'
import { getStaffCategory } from '@/lib/staff-category'

export const revalidate = 120

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('clubes')
    .select('*')
    .eq('slug', slug)
    .single()
  const club = data as Club | null

  if (!club) return { title: 'Club no encontrado' }

  return {
    title: club.nombre,
    description: club.historia?.substring(0, 160) || `Página oficial de ${club.nombre} en la LAB`,
  }
}

export default async function ClubPage({ params, searchParams }: Props) {
  const { slug } = await params
  const filters = await searchParams
  const supabase = await createClient()

  const [clubRes, jugadoresRes, staffRes, galeriaRes] = await Promise.all([
    supabase.from('clubes').select('*').eq('slug', slug).single(),
    supabase.from('jugadores').select('*').eq('activo', true).order('numero_camiseta'),
    supabase.from('staff_clubes').select('*').order('orden'),
    supabase.from('galeria_clubes').select('*').order('orden'),
  ])

  const club = clubRes.data as Club | null
  if (!club) notFound()

  const jugadores = (jugadoresRes.data || []) as Jugador[]
  const staff = (staffRes.data || []) as StaffClub[]
  const galeria = (galeriaRes.data || []) as GaleriaClub[]

  // Filter jugadores & staff by club
  const jugadoresClub = jugadores.filter(j => j.club_id === club.id)
  const staffClub = staff.filter(s => s.club_id === club.id)
  const galeriaClub = galeria.filter(g => g.club_id === club.id)
  const clubLogoUrl = getClubLogoUrl(club)

  const staffByCategory = {
    cuerpo_tecnico: staffClub.filter((s) => getStaffCategory(s) === 'cuerpo_tecnico'),
    autoridades: staffClub.filter((s) => getStaffCategory(s) === 'autoridades'),
  }

  const hasStaffTabs = staffByCategory.cuerpo_tecnico.length > 0 || staffByCategory.autoridades.length > 0
  const requestedTab = filters.tab === 'autoridades' ? 'autoridades' : 'cuerpo_tecnico'
  const activeTab = requestedTab
  const visibleStaff = activeTab === 'autoridades' ? staffByCategory.autoridades : staffByCategory.cuerpo_tecnico

  return (
    <div
      className="club-themed"
      style={{
        '--club-primary': club.colores.primario,
        '--club-secondary': club.colores.secundario,
        '--club-accent': club.colores.acento,
      } as React.CSSProperties}
    >
      {/* Club Header */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${club.colores.primario} 0%, ${club.colores.primario}dd 60%, ${club.colores.secundario}33 100%)`,
        }}
      >
        <div className="bg-diamond-pattern absolute inset-0 opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {clubLogoUrl ? (
              <Image
                src={clubLogoUrl}
                alt={`Logo ${club.nombre}`}
                width={96}
                height={96}
                className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-contain flex-shrink-0"
                style={{ backgroundColor: `${club.colores.secundario}22`, border: `2px solid ${club.colores.secundario}44` }}
              />
            ) : (
              <div
                className="w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center font-display text-5xl flex-shrink-0"
                style={{
                  backgroundColor: `${club.colores.secundario}22`,
                  color: club.colores.secundario,
                  border: `2px solid ${club.colores.secundario}44`,
                }}
              >
                {(club.nombre_corto || club.nombre)[0]}
              </div>
            )}
            <div>
              <h1 className="font-display text-4xl md:text-6xl tracking-wider leading-none" style={{ color: club.colores.acento }}>
                {club.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                {club.sede && (
                  <span className="inline-flex items-center gap-1.5 font-condensed text-sm tracking-wide" style={{ color: `${club.colores.secundario}cc` }}>
                    <MapPin className="w-4 h-4" />
                    {club.sede}
                  </span>
                )}
                {club.fundacion && (
                  <span className="inline-flex items-center gap-1.5 font-condensed text-sm tracking-wide" style={{ color: `${club.colores.secundario}cc` }}>
                    <Calendar className="w-4 h-4" />
                    Fundado en {club.fundacion}
                  </span>
                )}
                {club.estadio_nombre && (
                  <span className="inline-flex items-center gap-1.5 font-condensed text-sm tracking-wide" style={{ color: `${club.colores.secundario}cc` }}>
                    🏟️ {club.estadio_nombre}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Bottom accent */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${club.colores.secundario}, ${club.colores.acento}, ${club.colores.secundario})` }} />
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Historia */}
        {club.historia && (
          <section className="mb-12">
            <h2 className="font-display text-2xl tracking-widest text-lab-white mb-4">HISTORIA</h2>
            <div className="bg-lab-surface rounded-lg border border-lab-border p-6">
              <div
                className="text-lab-gray leading-relaxed prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeContent(club.historia ?? '') }}
              />
            </div>
          </section>
        )}

        {/* Roster */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5" style={{ color: club.colores.secundario }} />
            <h2 className="font-display text-2xl tracking-widest text-lab-white">ROSTER</h2>
            <span className="font-condensed text-sm text-lab-muted ml-2">
              ({jugadoresClub.length} jugadores)
            </span>
          </div>

          {jugadoresClub.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {jugadoresClub.map((jugador) => (
                <Link key={jugador.id} href={`/jugadores/${jugador.slug}`}>
                  <PlayerCard
                    jugador={jugador}
                    clubNombre={club.nombre_corto || club.nombre}
                    clubColores={club.colores}
                    clubLogoUrl={clubLogoUrl}
                    size="sm"
                  />
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-lab-surface rounded-lg border border-lab-border p-8 text-center">
              <Users className="w-10 h-10 text-lab-muted/30 mx-auto mb-3" />
              <p className="font-condensed text-lab-muted tracking-wider">
                El roster se actualizará próximamente
              </p>
            </div>
          )}
        </section>

        {/* Staff & autoridades */}
        {hasStaffTabs && (
          <section className="mb-12" id="staff-tabs">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="font-display text-2xl tracking-widest text-lab-white">
                {activeTab === 'autoridades' ? 'AUTORIDADES' : 'CUERPO TÉCNICO'}
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  href={`/${club.slug}?tab=cuerpo_tecnico#staff-tabs`}
                  className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
                    activeTab === 'cuerpo_tecnico'
                      ? 'bg-lab-gold text-lab-navy font-bold'
                      : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'
                  }`}
                >
                  Cuerpo Tecnico ({staffByCategory.cuerpo_tecnico.length})
                </Link>
                <Link
                  href={`/${club.slug}?tab=autoridades#staff-tabs`}
                  className={`px-3 py-1.5 rounded-lg font-condensed text-xs tracking-wider uppercase transition-all ${
                    activeTab === 'autoridades'
                      ? 'bg-lab-gold text-lab-navy font-bold'
                      : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white'
                  }`}
                >
                  Autoridades ({staffByCategory.autoridades.length})
                </Link>
              </div>
            </div>

            {visibleStaff.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleStaff.map((s) => (
                  <div key={s.id} className="bg-lab-surface rounded-lg border border-lab-border p-4 text-center">
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center font-display text-xl"
                      style={{ backgroundColor: `${club.colores.primario}`, color: club.colores.secundario }}
                    >
                      {s.nombre.split(' ').map(n => n[0]).join('')}
                    </div>
                    <h3 className="font-condensed font-semibold text-lab-white tracking-wide text-sm">{s.nombre}</h3>
                    <p className="font-condensed text-xs text-lab-muted tracking-wider uppercase">{s.cargo}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-lab-surface rounded-lg border border-lab-border p-8 text-center">
                <p className="font-condensed text-lab-muted tracking-wider">
                  {activeTab === 'autoridades' ? 'No hay autoridades cargadas' : 'No hay cuerpo tecnico cargado'}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Galería */}
        {galeriaClub.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <ImageIcon className="w-5 h-5" style={{ color: club.colores.secundario }} />
              <h2 className="font-display text-2xl tracking-widest text-lab-white">GALERÍA</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {galeriaClub.map((foto) => (
                <div key={foto.id} className="relative aspect-video rounded-lg overflow-hidden bg-lab-surface border border-lab-border">
                  <Image
                    src={foto.imagen_url}
                    alt={foto.titulo || 'Galería'}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                    className="object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
