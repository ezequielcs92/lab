import { createClient } from '@/lib/supabase/server'
import type {
  StatsBateoAgregado,
  StatsFildeoAgregado,
  StatsPitcheoAgregado,
} from '@/lib/database.types'
import {
  buildBattingSeasonLines,
  buildFieldingSeasonLines,
  buildPitchingSeasonLines,
  type SeasonSummary,
} from '@/lib/player-season-stats'

interface Props {
  playerId: string
  stableId: string | null
}

type StatTableRow = {
  key: string
  label: string
  values: (string | number)[]
  career?: boolean
}

export default async function PlayerSeasonStats({ playerId, stableId }: Props) {
  const supabase = await createClient()
  const { data: versions } = stableId
    ? await supabase.from('jugadores').select('id').eq('stable_id', stableId)
    : { data: [] as { id: string }[] }
  const playerIds = [...new Set([playerId, ...(versions ?? []).map((version) => version.id)])]

  const [battingResult, pitchingResult, fieldingResult] = await Promise.all([
    supabase.from('v_stats_bateo_completo').select('*').in('jugador_id', playerIds),
    supabase.from('v_stats_pitcheo_completo').select('*').in('jugador_id', playerIds),
    supabase.from('v_stats_fildeo_completo').select('*').in('jugador_id', playerIds),
  ])

  const batting = (battingResult.data ?? []) as StatsBateoAgregado[]
  const pitching = (pitchingResult.data ?? []) as StatsPitcheoAgregado[]
  const fielding = (fieldingResult.data ?? []) as StatsFildeoAgregado[]
  const seasonIds = [...new Set([...batting, ...pitching, ...fielding].map((row) => row.temporada_id))]
  const { data: seasons } = seasonIds.length
    ? await supabase.from('temporadas').select('id, anio, nombre').in('id', seasonIds)
    : { data: [] as SeasonSummary[] }
  const seasonList = (seasons ?? []) as SeasonSummary[]

  const battingLines = buildBattingSeasonLines(batting, seasonList)
  const pitchingLines = buildPitchingSeasonLines(pitching, seasonList)
  const fieldingLines = buildFieldingSeasonLines(fielding, seasonList)

  if (!battingLines.length && !pitchingLines.length && !fieldingLines.length) {
    return (
      <section className="bg-lab-surface rounded-lg border border-lab-border p-6">
        <h2 className="font-display text-lg tracking-widest text-lab-gold mb-2">ESTADÍSTICAS POR TEMPORADA</h2>
        <p className="font-condensed text-sm text-lab-muted tracking-wide">Las estadísticas individuales estarán disponibles cuando se carguen los registros históricos de la temporada.</p>
      </section>
    )
  }

  const seasonYears = new Map(seasonList.map((season) => [season.id, season.anio]))
  const hasUnverifiedStrikeouts = pitching.some((row) => [2017, 2018].includes(seasonYears.get(row.temporada_id) ?? 0))

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-xl tracking-widest text-lab-gold">ESTADÍSTICAS POR TEMPORADA</h2>
        <p className="font-condensed text-xs text-lab-muted tracking-wide mt-1">Ronda regular y playoffs · temporada por temporada y acumulado de carrera</p>
      </div>

      {battingLines.length > 0 && (
        <StatsTable title="BATEO" headers={['Temporada', 'AB', 'H', '2B', '3B', 'HR', 'RBI', 'R', 'BB', 'SO', 'SB', 'AVG', 'OBP', 'SLG', 'OPS']}
          rows={battingLines.map((line) => ({ key: line.key, label: line.label, career: line.year === null, values: [line.ab, line.h, line.doble, line.triple, line.hr, line.rbi, line.r, line.bb, line.so, line.sb, decimal(line.avg), decimal(line.obp), decimal(line.slg), decimal(line.ops)] }))} />
      )}

      {pitchingLines.length > 0 && (
        <StatsTable title="PITCHEO" headers={['Temporada', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO', 'W', 'L', 'SV', 'ERA', 'WHIP']}
          rows={pitchingLines.map((line) => ({ key: line.key, label: line.label, career: line.year === null, values: [line.ip, line.h, line.r, line.er, line.hr, line.bb, line.so === null ? '—' : line.so, line.w, line.l, line.sv, line.era.toFixed(2), decimal(line.whip)] }))} />
      )}

      {hasUnverifiedStrikeouts && (
        <p className="font-condensed text-xs text-lab-muted">— Los ponches de pitcheo de 2017 y 2018 están en conciliación con los archivos iScore originales.</p>
      )}

      {fieldingLines.length > 0 && (
        <StatsTable title="FILDEO" headers={['Temporada', 'PO', 'A', 'E', 'DP', 'FPCT']}
          rows={fieldingLines.map((line) => ({ key: line.key, label: line.label, career: line.year === null, values: [line.po, line.a, line.e, line.dp, decimal(line.fld_pct)] }))} />
      )}
    </section>
  )
}

function decimal(value: number): string {
  return value.toFixed(3).replace(/^0(?=\.)/, '')
}

function StatsTable({ title, headers, rows }: { title: string; headers: string[]; rows: StatTableRow[] }) {
  return (
    <div className="bg-lab-surface rounded-lg border border-lab-border overflow-hidden">
      <div className="px-4 py-3 border-b border-lab-border bg-lab-surface-light">
        <h3 className="font-display text-sm tracking-widest text-lab-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-xs font-condensed">
          <thead>
            <tr className="border-b border-lab-border text-lab-muted uppercase tracking-wider">
              {headers.map((header) => <th key={header} className="px-3 py-2 text-right first:text-left">{header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-lab-border/50">
            {rows.map((row) => (
              <tr key={row.key} className={row.career ? 'bg-lab-navy/40 font-bold text-lab-gold' : 'text-lab-gray'}>
                <th scope="row" className="px-3 py-2 text-left text-lab-white">{row.label}</th>
                {row.values.map((value, index) => <td key={`${row.key}-${index}`} className="px-3 py-2 text-right tabular-nums">{value}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
