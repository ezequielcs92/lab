import { describe, expect, it } from 'vitest'
import { buildLiveGameState, describeInning, hasHitsOrErrors } from './live-game'

const base = { estado: 'en_curso' as const, inning: '', mitad: '', hitsLocal: '', hitsVisitante: '', erroresLocal: '', erroresVisitante: '' }

describe('buildLiveGameState', () => {
  it('stores inning, half, hits and errors for a live game', () => {
    const result = buildLiveGameState({ ...base, inning: '7', mitad: 'alta', hitsLocal: '7', hitsVisitante: '6', erroresLocal: '0', erroresVisitante: '1' })
    expect(result).toEqual({ ok: true, value: {
      inning_actual: 7, mitad_inning: 'alta', hits_local: 7, hits_visitante: 6, errores_local: 0, errores_visitante: 1,
    } })
  })

  it('keeps empty fields as null', () => {
    expect(buildLiveGameState(base)).toEqual({ ok: true, value: {
      inning_actual: null, mitad_inning: null, hits_local: null, hits_visitante: null, errores_local: null, errores_visitante: null,
    } })
  })

  it('clears inning and half when the game is not live but keeps hits and errors', () => {
    const result = buildLiveGameState({ ...base, estado: 'finalizado', inning: '9', mitad: 'baja', hitsLocal: '8' })
    expect(result).toEqual({ ok: true, value: {
      inning_actual: null, mitad_inning: null, hits_local: 8, hits_visitante: null, errores_local: null, errores_visitante: null,
    } })
  })

  it('rejects invalid numbers and halves', () => {
    expect(buildLiveGameState({ ...base, inning: '0' }).ok).toBe(false)
    expect(buildLiveGameState({ ...base, inning: '2.5' }).ok).toBe(false)
    expect(buildLiveGameState({ ...base, hitsLocal: '-1' }).ok).toBe(false)
    expect(buildLiveGameState({ ...base, erroresVisitante: '100' }).ok).toBe(false)
    expect(buildLiveGameState({ ...base, inning: '3', mitad: 'media' }).ok).toBe(false)
  })

  it('requires an inning when a half is chosen for a live game', () => {
    expect(buildLiveGameState({ ...base, mitad: 'alta' })).toEqual({
      ok: false,
      error: 'Indicá el inning para registrar si está en la alta o en la baja',
    })
  })
})

describe('describeInning', () => {
  it('shows an arrow for the half', () => {
    expect(describeInning({ inning_actual: 7, mitad_inning: 'alta' })).toEqual({ label: 'Inning 7', arrow: '▲', accessibleLabel: 'Inning 7, alta' })
    expect(describeInning({ inning_actual: 3, mitad_inning: 'baja' })?.arrow).toBe('▼')
  })

  it('omits the arrow when the half is unknown and returns null without an inning', () => {
    expect(describeInning({ inning_actual: 5, mitad_inning: null })).toEqual({ label: 'Inning 5', arrow: '', accessibleLabel: 'Inning 5' })
    expect(describeInning({ inning_actual: null, mitad_inning: null })).toBeNull()
  })
})

describe('hasHitsOrErrors', () => {
  it('detects any recorded value, including zero', () => {
    expect(hasHitsOrErrors({ hits_local: null, hits_visitante: null, errores_local: 0, errores_visitante: null })).toBe(true)
    expect(hasHitsOrErrors({ hits_local: null, hits_visitante: null, errores_local: null, errores_visitante: null })).toBe(false)
  })
})
