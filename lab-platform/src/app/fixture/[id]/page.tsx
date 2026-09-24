import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ESTADO_LABELS } from '@/lib/constants'
import { getClubLogoUrl } from '@/lib/club-logo'
import SponsorsBanner from '@/components/sponsors/SponsorsBanner'
import LiveStreamBanner from '@/components/fixture/LiveStreamBanner'
import MVPVoting from '@/components/voting/MVPVoting'
import type {
  EstadisticaBateoConJugador,
  EstadisticaPitcheoConJugador,
  EstadisticaFildeoConJugador,
  Jugador,
  PartidoConClubes,
  Sponsor,
} from '@/lib/database.types'
import { ArrowLeft, Calendar, MapPin } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PartidoDetallePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: partido } = await supabase
    .from('partidos')
    .select('*, local:clubes!partidos_local_id_fkey(*), visitante:clubes!partidos_visitante_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!partido) notFound()

  const p = partido as PartidoConClubes

  const { data: jugadores } = await supabase
    .from('jugadores')
    .select('*')
    .eq('temporada_id', p.temporada_id)
    .in('club_id', [p.local_id, p.visitante_id])
    .eq('activo', true)

  const jugadoresLocal = ((jugadores ?? []) as Jugador[]).filter((j) => j.club_id === p.local_id)
  const jugadoresVisitante = ((jugadores ?? []) as Jugador[]).filter((j) => j.club_id === p.visitante_id)

  const [
    { data: sponsors },
    { data: bateo },
    { data: pitcheo },
    { data: fildeo },
  ] = await Promise.all([
    supabase.from('sponsors').select('*').eq('ubicacion', 'match'),
    supabase
      .from('estadisticas_bateo')
      .select('*, jugadores(*), clubes(*)')
      .eq('partido_id', id)
      .order('orden_bateo', { ascending: true }),
    supabase
      .from('estadisticas_pitcheo')
      .select('*, jugadores(*), clubes(*)')
      .eq('partido_id', id),
    supabase.from('estadisticas_fildeo').select('*, jugadores(*), clubes(*)').eq('partido_id', id),
  ])

  const bateoLocal = ((bateo ?? []) as EstadisticaBateoConJugador[]).filter(
    (s) => s.club_id === p.local_id
  )
  const bateoVisita = ((bateo ?? []) as EstadisticaBateoConJugador[]).filter(
    (s) => s.club_id === p.visitante_id
  )
  const pitcheoLocal = ((pitcheo ?? []) as EstadisticaPitcheoConJugador[]).filter(
    (s) => s.club_id === p.local_id
  )
  const pitcheoVisita = ((pitcheo ?? []) as EstadisticaPitcheoConJugador[]).filter(
    (s) => s.club_id === p.visitante_id
  )
  const fildeoLocal = ((fildeo ?? []) as EstadisticaFildeoConJugador[]).filter(
    (s) => s.club_id === p.local_id
  )
  const fildeoVisita = ((fildeo ?? []) as EstadisticaFildeoConJugador[]).filter(
    (s) => s.club_id === p.visitante_id
  )

  const matchSponsors = (sponsors ?? []) as Sponsor[]
  const isFinal = p.estado === 'finalizado'

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link
        href="/fixture"
        className="inline-flex items-center gap-2 font-condensed text-sm text-lab-muted hover:text-lab-white tracking-wider mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> VOLVER AL FIXTURE
      </Link>

      {/* Header */}
      <div className="bg-lab-surface rounded-xl border border-lab-border p-6 md:p-10 mb-8">
        <div className="flex items-center justify-center gap-2 text-lab-muted font-condensed text-xs tracking-widest uppercase mb-6">
          <Calendar className="w-3.5 h-3.5" />
          {format(new Date(p.fecha_hora), "EEEE d 'de' MMMM · HH:mm", { locale: es })}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10">
          <TeamHeader club={p.local} />

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4 font-display text-5xl md:text-7xl text-lab-white tracking-wider">
              <span>{p.marcador_local ?? '-'}</span>
              <span className="text-lab-muted text-2xl">:</span>
              <span>{p.marcador_visitante ?? '-'}</span>
            </div>
            <span
              className={`mt-3 font-condensed text-xs tracking-[0.15em] uppercase font-semibold px-3 py-1 rounded ${
                p.estado === 'en_curso'
                  ? 'bg-lab-red/20 text-lab-red-light'
                  : p.estado === 'finalizado'
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-lab-muted/10 text-lab-muted'
              }`}
            >
              {ESTADO_LABELS[p.estado]}
            </span>
          </div>

          <TeamHeader club={p.visitante} />
        </div>

        {p.estadio && (
          <div className="flex items-center justify-center gap-2 mt-6 text-lab-muted font-condensed text-sm tracking-wider">
            <MapPin className="w-4 h-4" /> {p.estadio}
          </div>
        )}
      </div>

      {matchSponsors.length > 0 && (
        <div className="mb-8">
          <SponsorsBanner sponsors={matchSponsors} location="match" title="Patrocinadores del partido" />
        </div>
      )}

      {p.streaming_url && <div className="mb-8"><LiveStreamBanner partido={p} /></div>}

      {isFinal && (
        <div className="mb-8">
          <MVPVoting partido={p} jugadoresLocal={jugadoresLocal} jugadoresVisitante={jugadoresVisitante} />
        </div>
      )}

      {/* Box score */}
      <div className="space-y-10">
        <section>
          <h2 className="font-display text-xl tracking-widest text-lab-gold mb-4">BATEO</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BattingTable rows={bateoLocal} title={p.local.nombre_corto || p.local.nombre} />
            <BattingTable rows={bateoVisita} title={p.visitante.nombre_corto || p.visitante.nombre} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl tracking-widest text-lab-gold mb-4">PITCHEO</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PitchingTable rows={pitcheoLocal} title={p.local.nombre_corto || p.local.nombre} />
            <PitchingTable rows={pitcheoVisita} title={p.visitante.nombre_corto || p.visitante.nombre} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl tracking-widest text-lab-gold mb-4">FILDEO</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FieldingTable rows={fildeoLocal} title={p.local.nombre_corto || p.local.nombre} />
            <FieldingTable rows={fildeoVisita} title={p.visitante.nombre_corto || p.visitante.nombre} />
          </div>
        </section>
      </div>
    </div>
  )
}

function TeamHeader({ club }: { club: PartidoConClubes['local'] }) {
  const logoUrl = getClubLogoUrl(club)
  return (
    <div className="flex flex-col items-center text-center md:w-1/3">
      <div
        className="w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center overflow-hidden mb-3"
        style={{ backgroundColor: logoUrl ? 'transparent' : club.colores.primario }}
      >
        {logoUrl ? (
          <Image src={logoUrl} alt={club.nombre} width={80} height={80} className="w-full h-full object-contain" />
        ) : (
          <span className="font-display text-2xl" style={{ color: club.colores.secundario }}>
            {(club.nombre_corto || club.nombre)[0]}
          </span>
        )}
      </div>
      <h2 className="font-display text-xl md:text-2xl text-lab-white tracking-wider">
        {club.nombre_corto || club.nombre}
      </h2>
    </div>
  )
}

function BattingTable({ rows, title }: { rows: EstadisticaBateoConJugador[]; title: string }) {
  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
      <div className="px-4 py-3 border-b border-lab-border bg-lab-surface-light">
        <h3 className="font-condensed text-sm tracking-wider text-lab-white font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-lab-border">
              <th className="px-3 py-2 text-left font-condensed text-[10px] tracking-wider uppercase text-lab-muted">Jugador</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">AB</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">H</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">2B</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">3B</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">HR</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">RBI</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">R</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">BB</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">SO</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">SB</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-lab-border/50 hover:bg-lab-navy/30">
                  <td className="px-3 py-2 font-condensed text-lab-white truncate max-w-[120px]">
                    {r.jugadores.nombre}
                  </td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.ab}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.h}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.doble}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.triple}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.hr}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.rbi}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.r}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.bb}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.so}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.sb}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center font-condensed text-lab-muted tracking-wider">
                  Sin estadisticas de bateo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PitchingTable({ rows, title }: { rows: EstadisticaPitcheoConJugador[]; title: string }) {
  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
      <div className="px-4 py-3 border-b border-lab-border bg-lab-surface-light">
        <h3 className="font-condensed text-sm tracking-wider text-lab-white font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-lab-border">
              <th className="px-3 py-2 text-left font-condensed text-[10px] tracking-wider uppercase text-lab-muted">Jugador</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">IP</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">H</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">R</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">ER</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">BB</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">SO</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">HR</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">W</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">L</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">SV</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-lab-border/50 hover:bg-lab-navy/30">
                  <td className="px-3 py-2 font-condensed text-lab-white truncate max-w-[120px]">{r.jugadores.nombre}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.ip}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.h}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.r}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.er}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.bb}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.so}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.hr}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.w ? 'W' : ''}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.l ? 'L' : ''}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.sv ? 'SV' : ''}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center font-condensed text-lab-muted tracking-wider">
                  Sin estadisticas de pitcheo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FieldingTable({ rows, title }: { rows: EstadisticaFildeoConJugador[]; title: string }) {
  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
      <div className="px-4 py-3 border-b border-lab-border bg-lab-surface-light">
        <h3 className="font-condensed text-sm tracking-wider text-lab-white font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-lab-border">
              <th className="px-3 py-2 text-left font-condensed text-[10px] tracking-wider uppercase text-lab-muted">Jugador</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">PO</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">A</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">E</th>
              <th className="px-2 py-2 text-center font-condensed text-[10px] tracking-wider uppercase text-lab-muted">DP</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-lab-border/50 hover:bg-lab-navy/30">
                  <td className="px-3 py-2 font-condensed text-lab-white truncate max-w-[120px]">{r.jugadores.nombre}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.po}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.a}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.e}</td>
                  <td className="px-2 py-2 text-center font-condensed text-lab-gray">{r.dp}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center font-condensed text-lab-muted tracking-wider">
                  Sin estadisticas de fildeo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
