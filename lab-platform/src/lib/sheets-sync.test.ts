import { describe, expect, it } from 'vitest'
import { buildAcceptedSyncRows, buildSheetSnapshot, classifySheetRows, compareSheetSnapshot, parseSheetRows } from './sheets-sync'
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

  it('completes preview, accepted conflict, apply and idempotent retry', () => {
    const header = [...SHEET_HEADERS.Partidos]
    const original = header.map((name) => name === 'external_key' ? 'game-1' : name === 'estadio' ? 'Estadio A' : '')
    const changed = header.map((name) => name === 'external_key' ? 'game-1' : name === 'estadio' ? 'Estadio B' : '')
    const originalRow = parseSheetRows('Partidos', [header, original]).rows[0]
    const changedRow = parseSheetRows('Partidos', [header, changed]).rows[0]
    const key = `Partidos:${changedRow.key}`

    const preview = classifySheetRows([changedRow], new Map([[key, { sheet_hash: originalRow.hash }]]))
    expect(preview.changed_external).toEqual([changedRow])

    const accepted = buildAcceptedSyncRows(
      new Map([['Partidos', [changedRow]]]),
      new Map([[key, 'usar_externo']])
    )
    expect(accepted).toEqual([expect.objectContaining({ lab_hash: changedRow.hash, sheet_hash: changedRow.hash })])

    const retry = classifySheetRows(
      [changedRow],
      new Map([[key, { sheet_hash: accepted[0].sheet_hash }]])
    )
    expect(retry.unchanged).toEqual([changedRow])
    expect(retry.changed_external).toHaveLength(0)
  })

  it('does not mark rows resolved in favor of LAB or omitted as synchronized', () => {
    const header = [...SHEET_HEADERS.Partidos]
    const row = header.map((name) => name === 'external_key' ? 'game-1' : '')
    const parsed = parseSheetRows('Partidos', [header, row]).rows[0]
    const rows = new Map([['Partidos' as const, [parsed]]])
    const key = `Partidos:${parsed.key}`

    expect(buildAcceptedSyncRows(rows, new Map([[key, 'usar_lab']]))).toEqual([])
    expect(buildAcceptedSyncRows(rows, new Map([[key, 'omitido']]))).toEqual([])
  })

  it('detects rows added, removed or edited after preview', () => {
    const header = [...SHEET_HEADERS.Partidos]
    const row = (key: string, stadium: string) => header.map((name) => {
      if (name === 'external_key') return key
      if (name === 'estadio') return stadium
      return ''
    })
    const previewRows = parseSheetRows('Partidos', [header, row('game-1', 'A'), row('game-2', 'B')]).rows
    const currentRows = parseSheetRows('Partidos', [header, row('game-1', 'Modificado'), row('game-3', 'C')]).rows
    const snapshot = buildSheetSnapshot(new Map([['Partidos', previewRows]]))

    expect(compareSheetSnapshot(snapshot, new Map([['Partidos', currentRows]]))).toEqual([
      'Partidos:game-1',
      'Partidos:game-2',
      'Partidos:game-3',
    ])
  })
})
