import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), queries: [] as { table: string; filters: [string, unknown][]; range?: [number, number]; orders: string[] }[], failStats: false }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
import EstadisticasPage from './page'

const player = { id: 'player-a', nombre: 'Jugador de prueba', slug: 'jugador-de-prueba', stable_id: 'person-a', club_id: 'club-a' }
const club = { id: 'club-a', nombre: 'Falcons', slug: 'falcons', nombre_corto: 'Falcons', colores: { primario: '#000', secundario: '#fff' } }

describe('public statistics page integration with mocked database', () => {
  beforeEach(() => {
    vi.stubGlobal('React', React)
    mocks.queries.length = 0
    mocks.failStats = false
    mocks.createClient.mockResolvedValue({ from(table: string) {
      const log = { table, filters: [] as [string, unknown][], orders: [] as string[], range: undefined as [number, number] | undefined }
      mocks.queries.push(log)
      const response = () => {
        let data: unknown[] = []
        if (table === 'temporadas') data = [{ id: 'season-2019', nombre: 'Temporada 2019', anio: 2019 }, { id: 'active', nombre: 'Temporada 2026', anio: 2026 }]
        if (table === 'clubes') data = [club]
        if (table === 'jugadores') data = [player]
        if (table === 'temporada_clubes') data = [{ club_id: 'club-a' }]
        if (table.startsWith('v_stats')) data = [{ jugador_id: player.id, club_id: club.id, temporada_id: 'season-2019', fase: 'playoffs', ab: 7, h: 3, hr: 1, avg: 0.429, po: 2, a: 1, e: 0, dp: 0, fld_pct: 1 }]
        return { data, error: mocks.failStats && table.startsWith('v_stats') ? { message: 'Database unavailable' } : null, count: table.startsWith('v_stats') ? 51 : null }
      }
      const query = {
        select: vi.fn().mockReturnThis(),
        eq(key: string, value: unknown) { log.filters.push([key, value]); return query },
        order(key: string) { log.orders.push(key); return query },
        in: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        range(from: number, to: number) { log.range = [from, to]; return query },
        single: vi.fn().mockResolvedValue({ data: { id: 'active', nombre: 'Temporada 2026' }, error: null }),
        then(resolve: (value: ReturnType<typeof response>) => unknown) { return Promise.resolve(response()).then(resolve) },
      }
      return query
    } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('renders a full season table without running the top-10 queries', async () => {
    const html = renderToStaticMarkup(await EstadisticasPage({ searchParams: Promise.resolve({ temporada: 'season-2019', vista: 'tabla', tipo: 'bateo', fase: 'playoffs' }) }))
    expect(html).toContain('Jugador de prueba')
    expect(html).toContain('51 registros')
    expect(html).toContain('pagina=2')
    const queries = mocks.queries.filter((query) => query.table.startsWith('v_stats'))
    expect(queries).toHaveLength(1)
    expect(queries[0]).toMatchObject({ table: 'v_stats_bateo_completo', range: [0, 49] })
    expect(queries[0].filters).toContainEqual(['fase', 'playoffs'])
    expect(queries[0].filters).toContainEqual(['temporada_id', 'season-2019'])
  })
  it('filters historical fielding by phase rather than querying mixed career totals', async () => {
    const html = renderToStaticMarkup(await EstadisticasPage({ searchParams: Promise.resolve({ temporada: 'historico', vista: 'tabla', tipo: 'fildeo', fase: 'playoffs' }) }))
    expect(html).toContain('FPCT')
    expect(html).toContain('Playoffs')
    const query = mocks.queries.find((item) => item.table === 'v_stats_fildeo_historico_fase')!
    expect(query.filters).toEqual([['fase', 'playoffs']])
  })
  it('uses the selected page and a safe sort metric', async () => {
    await EstadisticasPage({ searchParams: Promise.resolve({ temporada: 'season-2019', vista: 'tabla', pagina: '2', orden: 'unknown' }) })
    const query = mocks.queries.find((item) => item.table === 'v_stats_bateo_completo')!
    expect(query.range).toEqual([50, 99])
    expect(query.orders).toEqual(['h', 'jugador_id', 'club_id'])
  })
  it('also filters the historical leader cards by the requested phase', async () => {
    await EstadisticasPage({ searchParams: Promise.resolve({ temporada: 'historico', tipo: 'bateo', fase: 'playoffs' }) })
    const queries = mocks.queries.filter((item) => item.table === 'v_stats_bateo_historico_fase')
    expect(queries).toHaveLength(9)
    expect(queries.every((query) => query.filters.some(([key, value]) => key === 'fase' && value === 'playoffs'))).toBe(true)
  })
  it('distinguishes a failed load from an empty statistics table', async () => {
    mocks.failStats = true
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = renderToStaticMarkup(await EstadisticasPage({ searchParams: Promise.resolve({ vista: 'tabla' }) }))
    expect(html).toContain('No se pudieron cargar las estadísticas')
    vi.restoreAllMocks()
  })
})
