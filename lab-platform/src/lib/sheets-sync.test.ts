import { describe, expect, it } from 'vitest'
import { classifySheetRows, parseSheetRows } from './sheets-sync'
import { SHEET_HEADERS } from './sheets-schema'

describe('Google Sheets sync parsing', () => {
  it('parses rows with deterministic composite keys', () => {
    const header = [...SHEET_HEADERS.Bateo]
    const row = header.map((name) => name === 'partido_external_key' ? 'game-1' : name === 'jugador_stable_id' ? 'player-1' : '')
    const result = parseSheetRows('Bateo', [header, row])
    expect(result.errors).toEqual([])
    expect(result.rows[0]?.key).toBe('game-1:player-1')
  })

  it('rejects duplicate keys and missing keys', () => {
    const header = [...SHEET_HEADERS.Partidos]
    const missingKey = header.map((name) => name === 'estadio' ? 'Estadio' : '')
    const duplicate = header.map((name) => name === 'external_key' ? 'game-1' : '')
    const result = parseSheetRows('Partidos', [header, missingKey, duplicate, duplicate])
    expect(result.errors).toEqual([
      'Partidos, fila 2: falta la clave externa',
      'Partidos, fila 4: clave externa duplicada (game-1)',
    ])
  })

  it('classifies changes without applying them', () => {
    const header = [...SHEET_HEADERS.Partidos]
    const row = header.map((name) => name === 'external_key' ? 'game-1' : '')
    const parsed = parseSheetRows('Partidos', [header, row]).rows
    const key = `Partidos:${parsed[0].key}`
    const result = classifySheetRows(parsed, new Map([[key, { sheet_hash: 'old-hash' }]]))
    expect(result.changed_external).toHaveLength(1)
    expect(result.new).toHaveLength(0)
  })
})
