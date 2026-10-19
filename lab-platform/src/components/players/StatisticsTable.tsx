import Link from 'next/link'
import type { LeaderRow } from '@/lib/database.types'
import { STATISTICS_COLUMNS, formatStatistic, statisticsUrl, type StatisticsScope } from '@/lib/statistics-table'

interface Props {
  scope: StatisticsScope
  rows: LeaderRow[]
  count: number
  page: number
  pageSize: number
  filters: Record<string, string | undefined>
  error: boolean
  historical: boolean
}

export default function StatisticsTable({ scope, rows, count, page, pageSize, filters, error, historical }: Props) {
  const columns = STATISTICS_COLUMNS[scope]
  const pages = Math.max(1, Math.ceil(count / pageSize))
  return (
    <section aria-label={`Tabla de ${scope}`} className="space-y-4">
      <p className="font-condensed text-sm text-lab-muted">
        {historical ? 'Acumulados por jugador de la fase seleccionada. El club indicado corresponde a su ficha de referencia.' : 'Estadísticas por jugador y club de la temporada y fase seleccionadas.'}
        {' '}La tabla no aplica los mínimos de clasificación de líderes. Solo se incluyen métricas disponibles.
      </p>
      {error ? <p role="alert" className="text-lab-red-light">No se pudieron cargar las estadísticas. Intentá nuevamente.</p> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-lab-border bg-lab-surface">
            <table className="w-full min-w-max font-condensed text-sm">
              <caption className="sr-only">Estadísticas de {scope}, {filters.fase === 'playoffs' ? 'playoffs' : 'ronda regular'}</caption>
              <thead className="bg-lab-surface-light text-lab-gold">
                <tr><th scope="col" className="px-3 py-3 text-left">Jugador</th><th scope="col" className="px-3 py-3 text-left">Club</th>
                  {columns.map((column) => <th key={column.key} scope="col" className="px-3 py-3 text-right">{column.label}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-lab-border">
                {rows.map((row) => <tr key={`${row.jugador_id}|${row.club_id}`} className="text-lab-gray">
                  <th scope="row" className="px-3 py-2 text-left font-normal"><Link href={`/jugadores/${row.jugadores.slug}`} className="text-lab-white hover:text-lab-gold">{row.jugadores.nombre}</Link></th>
                  <td className="px-3 py-2">{row.clubes.nombre_corto || row.clubes.nombre}</td>
                  {columns.map((column) => <td key={column.key} className="px-3 py-2 text-right tabular-nums">{formatStatistic((row as unknown as Record<string, unknown>)[column.key], column.key)}</td>)}
                </tr>)}
                {!rows.length && <tr><td colSpan={columns.length + 2} className="p-8 text-center text-lab-muted">No hay registros para estos filtros o esta página.</td></tr>}
              </tbody>
            </table>
          </div>
          <nav aria-label="Paginación de estadísticas" className="flex flex-wrap items-center gap-4 font-condensed text-sm text-lab-gray">
            <span>{count} registros · página {page} de {pages}</span>
            {page > 1 && <Link href={statisticsUrl(filters, { pagina: String(page - 1) })} className="text-lab-gold">Anterior</Link>}
            {page < pages && <Link href={statisticsUrl(filters, { pagina: String(page + 1) })} className="text-lab-gold">Siguiente</Link>}
            {page > pages && <Link href={statisticsUrl(filters, { pagina: '1' })} className="text-lab-gold">Primera página</Link>}
          </nav>
        </>
      )}
    </section>
  )
}
