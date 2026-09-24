import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import type {
  Club,
  Jugador,
  LiderConfig,
  LeaderRow,
  StatsBateoAgregado,
  StatsFildeoAgregado,
  StatsPitcheoAgregado,
} from '@/lib/database.types'
import { getClubLogoUrl } from '@/lib/club-logo'
import { Trophy } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Estadísticas',
  description: 'Líderes y estadísticas de la Liga Argentina de Béisbol',
}

export const revalidate = 120

const ASCENDING_METRICS = ['era', 'e']
const THREE_DECIMAL_METRICS = ['avg', 'obp', 'slg', 'ops', 'whip', 'so_pct', 'fld_pct']
type AggregateRow = StatsBateoAgregado | StatsPitcheoAgregado | StatsFildeoAgregado
type StatsType = 'todos' | 'bateo' | 'pitcheo' | 'fildeo'
const HISTORICAL_LEADER_CONFIGS: LiderConfig[] = [
  ...(['h', 'hr', 'rbi', 'r', 'ab', 'avg', 'obp', 'bb', 'sb'] as const).map((metrica, index) => ({
    id: `historico-bateo-${metrica}`,
    temporada_id: '', categoria: `historico_bateo_${metrica}`, etiqueta: metrica.toUpperCase(),
    scope: 'bateo', metrica, orden: index + 1, activo: true, limite: 10, created_at: '', updated_at: '',
  })),
  ...(['w', 'l', 'era', 'sv', 'so'] as const).map((metrica, index) => ({
    id: `historico-pitcheo-${metrica}`,
    temporada_id: '', categoria: `historico_pitcheo_${metrica}`, etiqueta: metrica === 'so' ? 'K' : metrica.toUpperCase(),
    scope: 'pitcheo', metrica, orden: index + 20, activo: true, limite: 10, created_at: '', updated_at: '',
  })),
]

interface Props {
  searchParams: Promise<{ temporada?: string; club?: string; fase?: string; tipo?: string }>
}

export default async function EstadisticasPage({ searchParams }: Props) {
  const supabase = await createClient()
  const filters = await searchParams
  const isHistorical = filters.temporada === 'historico'

  const [{ data: temporadas }, { data: activeSeason }, { data: clubes }] = await Promise.all([
    supabase.from('temporadas').select('id, nombre, anio').order('anio', { ascending: false }),
    supabase.from('temporadas').select('id, nombre').eq('activa', true).single(),
    // Los clubes históricos pueden estar inactivos para la competencia vigente,
    // pero sus estadísticas deben seguir siendo consultables por temporada.
    supabase.from('clubes').select('*').order('nombre'),
  ])
  const selectedSeason = isHistorical ? null : (temporadas ?? []).find((season) => season.id === filters.temporada)
    ?? (temporadas ?? []).find((season) => season.id === activeSeason?.id)
  const temporadaId = selectedSeason?.id ?? ''
  const fase = filters.fase === 'playoffs' ? 'playoffs' : 'regular'
  const tipo: StatsType = ['bateo', 'pitcheo', 'fildeo'].includes(filters.tipo ?? '')
    ? filters.tipo as StatsType
    : 'todos'
  const [{ data: jugadores }, configResult, { data: memberships }] = await Promise.all([
    isHistorical
      ? supabase.from('jugadores').select('*')
      : supabase.from('jugadores').select('*').eq('temporada_id', temporadaId),
    isHistorical
      ? Promise.resolve(null)
      : supabase.from('lideres_config').select('*').eq('temporada_id', temporadaId).eq('activo', true).order('orden', { ascending: true }),
    isHistorical
      ? Promise.resolve({ data: [] })
      : supabase.from('temporada_clubes').select('club_id').eq('temporada_id', temporadaId).eq('visible', true),
  ])
  const seasonClubIds = new Set(
    (memberships?.length ? memberships : jugadores ?? []).map((row) => row.club_id).filter(Boolean)
  )
  const filterClubs = (clubes ?? []).filter((club) => seasonClubIds.has(club.id))
  const clubId = filterClubs.some((club) => club.id === filters.club) ? filters.club : undefined

  const activeConfigs = (isHistorical ? HISTORICAL_LEADER_CONFIGS : ((configResult?.data ?? []) as LiderConfig[]))
    .filter((config) => tipo === 'todos' || config.scope === tipo)
  const jugadoresById = new Map((jugadores ?? []).map((jugador) => [jugador.id, jugador as Jugador]))
  const clubesById = new Map((clubes ?? []).map((club) => [club.id, club as Club]))

  const leaderData = await Promise.all(
    activeConfigs.map(async (cfg) => {
      const view = isHistorical
        ? cfg.scope === 'bateo' ? 'v_stats_bateo_historico' : 'v_stats_pitcheo_historico'
        : cfg.scope === 'bateo'
          ? 'v_stats_bateo_agregado'
          : cfg.scope === 'pitcheo'
            ? 'v_stats_pitcheo_agregado'
            : 'v_stats_fildeo_agregado'
      const ascending = ASCENDING_METRICS.includes(cfg.metrica)
      let query = supabase
        .from(view)
        .select('*')
        .eq('temporada_id', temporadaId)
        .eq('fase', fase)
        .order(cfg.metrica, { ascending })
        .limit(cfg.limite || 10)
      if (isHistorical) {
        query = supabase.from(view).select('*').order(cfg.metrica, { ascending }).limit(cfg.limite || 10)
      } else if (clubId) query = query.eq('club_id', clubId)
      if (!isHistorical && fase === 'regular' && cfg.scope === 'bateo' && ['avg', 'obp', 'slg', 'ops'].includes(cfg.metrica)) {
        query = query.gte('ab', 48)
      }
      if (!isHistorical && fase === 'regular' && cfg.scope === 'pitcheo' && ['era', 'whip', 'so_pct'].includes(cfg.metrica)) {
        query = query.gte('ip', 24)
      }
      const { data, error } = await query
      if (error) console.error(`[estadisticas] ${cfg.categoria}:`, error.message)

      const rows = ((data ?? []) as unknown as AggregateRow[]).flatMap((row) => {
        const jugador = jugadoresById.get(row.jugador_id)
        const club = clubesById.get(row.club_id)
        return jugador && club ? [{ ...row, jugadores: jugador, clubes: club } as LeaderRow] : []
      })

      return {
        config: cfg,
        rows,
      }
    })
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          ESTADISTICAS <span className="text-gradient-gold">Y LIDERES</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
           {isHistorical ? 'Ranking histórico acumulado' : selectedSeason?.nombre ?? 'Temporada actual'} · {isHistorical ? 'Todas las temporadas' : fase === 'regular' ? 'Ronda regular' : 'Playoffs'}
        </p>
      </div>

      <form action="/estadisticas" className="grid grid-cols-2 lg:grid-cols-5 gap-3 bg-lab-surface border border-lab-border rounded-xl p-4 mb-8">
        <FilterSelect name="temporada" label="Temporada" defaultValue={isHistorical ? 'historico' : temporadaId}>
          <option value="historico">Líderes históricos</option>
          {(temporadas ?? []).map((season) => <option key={season.id} value={season.id}>{season.nombre}</option>)}
        </FilterSelect>
        {!isHistorical && <FilterSelect name="club" label="Club" defaultValue={clubId ?? ''}>
          <option value="">Todos</option>
          {filterClubs.map((club) => <option key={club.id} value={club.id}>{club.nombre_corto ?? club.nombre}</option>)}
        </FilterSelect>}
        <FilterSelect name="fase" label="Fase" defaultValue={fase}>
          <option value="regular">Ronda regular</option>
          <option value="playoffs">Playoffs</option>
        </FilterSelect>
        <FilterSelect name="tipo" label="Tipo" defaultValue={tipo}>
          <option value="todos">Todos</option>
          <option value="bateo">Bateo</option>
          <option value="pitcheo">Pitcheo</option>
          <option value="fildeo">Fildeo</option>
        </FilterSelect>
        <button type="submit" className="self-end h-10 rounded-lg bg-lab-gold text-lab-accent-fg font-condensed font-bold tracking-wider">
          FILTRAR
        </button>
      </form>

      {activeConfigs.length === 0 ? (
        <div className="bg-lab-surface rounded-lg border border-lab-border p-12 text-center">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            Aún no hay categorías de líderes configuradas
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {leaderData.map(({ config, rows }) => (
            <LeaderCard key={config.id} config={config} rows={rows} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({ name, label, defaultValue, children }: {
  name: string
  label: string
  defaultValue: string
  children: React.ReactNode
}) {
  return (
    <label className="font-condensed text-[11px] tracking-wider uppercase text-lab-muted">
      {label}
      <select name={name} defaultValue={defaultValue} className="mt-1 block w-full h-10 bg-lab-navy border border-lab-border rounded-lg px-3 text-sm normal-case text-lab-white">
        {children}
      </select>
    </label>
  )
}

function LeaderCard({ config, rows }: { config: LiderConfig; rows: LeaderRow[] }) {
  return (
    <div className="bg-lab-surface rounded-xl border border-lab-border overflow-hidden">
      <div className="px-5 py-4 border-b border-lab-border/50 bg-lab-surface-light flex items-center gap-2">
        <Trophy className="w-4 h-4 text-lab-gold" />
        <h2 className="font-display text-lg tracking-wider text-lab-gold">{config.etiqueta}</h2>
      </div>
      <div className="divide-y divide-lab-border/50">
        {rows.length > 0 ? (
          rows.map((row, idx) => {
            const value = (row as unknown as Record<string, unknown>)[config.metrica]
            const formatted =
              typeof value !== 'number'
                ? String(value ?? '')
                : THREE_DECIMAL_METRICS.includes(config.metrica)
                  ? value.toFixed(3)
                  : config.metrica === 'era'
                    ? value.toFixed(2)
                    : config.metrica === 'ip'
                      ? value.toFixed(1)
                      : value.toLocaleString('es-AR')
            const club = row.clubes
            const jugador = row.jugadores
            const logoUrl = getClubLogoUrl(club)

            return (
              <Link
                key={row.jugador_id}
                href={`/jugadores/${jugador.slug}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-lab-navy/30 transition-colors"
              >
                <span
                  className={`font-display text-lg w-6 text-center ${
                    idx === 0 ? 'text-lab-gold' : 'text-lab-muted'
                  }`}
                >
                  {idx + 1}
                </span>
                <div
                  className="w-7 h-7 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: logoUrl ? 'transparent' : club.colores.primario }}
                >
                  {logoUrl ? (
                    <Image src={logoUrl} alt={club.nombre} width={28} height={28} className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="font-display text-xs" style={{ color: club.colores.secundario }}>
                      {(club.nombre_corto || club.nombre)[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-condensed text-sm text-lab-white font-semibold tracking-wide truncate">
                    {jugador.nombre}
                  </p>
                  <p className="font-condensed text-[11px] text-lab-muted truncate">
                    {club.nombre_corto || club.nombre}
                  </p>
                </div>
                <span className="font-display text-xl text-lab-white">{formatted}</span>
              </Link>
            )
          })
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="font-condensed text-sm text-lab-muted tracking-wider">
              Sin datos suficientes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
