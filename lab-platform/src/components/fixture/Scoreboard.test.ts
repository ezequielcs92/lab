import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Scoreboard from './Scoreboard'
import type { PartidoConClubes } from '@/lib/database.types'

const colores = { primario: '#123456', secundario: '#ffffff', acento: '#ff0000' }
const club = (nombre: string) => ({ id: nombre, nombre, nombre_corto: nombre, slug: nombre.toLowerCase(), colores, logo_url: null })

function game(overrides: Record<string, unknown> = {}): PartidoConClubes {
  return {
    id: 'g1', estado: 'en_curso', fecha_hora: '2026-10-31T16:00:00Z', streaming_url: null,
    marcador_local: 7, marcador_visitante: 3,
    inning_actual: null, mitad_inning: null, hits_local: null, hits_visitante: null, errores_local: null, errores_visitante: null,
    local: club('Cardenales'), visitante: club('Tiburones'),
    ...overrides,
  } as unknown as PartidoConClubes
}

describe('Scoreboard live information', () => {
  beforeEach(() => { vi.stubGlobal('React', React) })

  it('shows the inning with an arrow and the R/H/E columns for a live game', () => {
    const html = renderToStaticMarkup(React.createElement(Scoreboard, {
      partidos: [game({ inning_actual: 7, mitad_inning: 'alta', hits_visitante: 6, hits_local: 7, errores_visitante: 1, errores_local: 0 })],
    }))
    expect(html).toContain('Inning 7')
    expect(html).toContain('▲')
    expect(html).toContain('aria-label="Inning 7, alta"')
    expect(html).toMatch(/>R<[\s\S]*>H<[\s\S]*>E</)
  })

  it('shows the bottom half with a down arrow', () => {
    const html = renderToStaticMarkup(React.createElement(Scoreboard, { partidos: [game({ inning_actual: 3, mitad_inning: 'baja' })] }))
    expect(html).toContain('Inning 3')
    expect(html).toContain('▼')
    expect(html).not.toMatch(/>H</)
  })

  it('keeps the card unchanged when no live data was entered or the game is not live', () => {
    const empty = renderToStaticMarkup(React.createElement(Scoreboard, { partidos: [game()] }))
    expect(empty).not.toContain('Inning')
    const finished = renderToStaticMarkup(React.createElement(Scoreboard, {
      partidos: [game({ estado: 'finalizado', inning_actual: 7, mitad_inning: 'alta', hits_local: 8 })],
    }))
    expect(finished).not.toContain('Inning')
    expect(finished).not.toMatch(/>H</)
  })
})
