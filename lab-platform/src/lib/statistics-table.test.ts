import { describe, expect, it } from 'vitest'
import { formatStatistic, getStatisticsTableOptions, getStatisticsView, statisticsUrl } from './statistics-table'

describe('statistics tables', () => {
  it.each(['-1', 'NaN', '0', '1.5', '999999', undefined])('sanitizes page %s', (pagina) => {
    expect(getStatisticsTableOptions('bateo', { pagina, orden: 'unknown' })).toMatchObject({ page: 1, metric: 'h', from: 0, to: 49 })
  })
  it('whitelists sort columns and paginates deterministically', () => {
    expect(getStatisticsTableOptions('pitcheo', { pagina: '2', orden: 'era', direccion: 'asc' })).toMatchObject({ from: 50, to: 99, metric: 'era', ascending: true })
    expect(getStatisticsTableOptions('fildeo', { orden: 'hr;drop table' }).metric).toBe('po')
  })
  it('selects phase-aware historical views for all scopes', () => {
    expect(getStatisticsView('fildeo', true)).toBe('v_stats_fildeo_historico_fase')
    expect(getStatisticsView('bateo', false)).toBe('v_stats_bateo_completo')
  })
  it('preserves filters in navigation and replaces the requested page', () => {
    const url = statisticsUrl({ fase: 'playoffs', vista: 'tabla', pagina: '1', tipo: 'bateo' }, { pagina: '2' })
    const params = new URL(url, 'https://lab.test').searchParams
    expect(params.get('fase')).toBe('playoffs')
    expect(params.get('pagina')).toBe('2')
  })
  it('distinguishes missing values from zero and respects baseball innings', () => {
    expect(formatStatistic(null, 'ab')).toBe('—')
    expect(formatStatistic(0, 'ab')).toBe('0')
    expect(formatStatistic(4.2, 'ip')).toBe('4.2')
    expect(formatStatistic(0.325, 'avg')).toBe('0.325')
  })
})
