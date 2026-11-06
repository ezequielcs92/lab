import { describe, expect, it } from 'vitest'
import { ALL_TAG, parseRevalidateRequest, readTags, tagsForWrites, VIEWS_TAG, writtenTable } from './cache-tags'

const rest = (path: string) => `https://x.supabase.co/rest/v1/${path}`

describe('readTags', () => {
  it('tags a read with its table and the tables embedded in the select', () => {
    expect(readTags(rest('partidos?select=*,local:clubes!partidos_local_id_fkey(nombre),visitante:clubes!partidos_visitante_id_fkey(nombre)')))
      .toEqual([ALL_TAG, 'db:partidos', 'db:clubes'])
  })

  it('marks reads of views so any change to their source tables reaches them', () => {
    expect(readTags(rest('v_stats_bateo_completo?select=*&stable_id=eq.1'))).toEqual([ALL_TAG, 'db:v_stats_bateo_completo', VIEWS_TAG])
  })

  it('tags RPC reads and anything unknown with the catch-all tag', () => {
    expect(readTags(rest('rpc/resumen_visitas'))).toEqual([ALL_TAG, 'db:rpc:resumen_visitas'])
    expect(readTags('https://x.supabase.co/storage/v1/object/a.png')).toEqual([ALL_TAG])
  })
})

describe('writtenTable', () => {
  it('reports the table of a successful write method and ignores reads', () => {
    expect(writtenTable(rest('jugadores?id=eq.1'), 'PATCH')).toBe('jugadores')
    expect(writtenTable(rest('noticias'), 'POST')).toBe('noticias')
    expect(writtenTable(rest('noticias'), 'DELETE')).toBe('noticias')
    expect(writtenTable(rest('noticias'), 'GET')).toBeNull()
    expect(writtenTable(rest('noticias'), undefined)).toBeNull()
    expect(writtenTable('https://x.supabase.co/auth/v1/token', 'POST')).toBeNull()
  })

  it('treats RPCs as "anything may have changed" except the read-only ones', () => {
    expect(writtenTable(rest('rpc/merge_player_identities'), 'POST')).toBe('*')
    expect(writtenTable(rest('rpc/resumen_visitas'), 'POST')).toBeNull()
    expect(writtenTable(rest('rpc/registrar_visita'), 'POST')).toBeNull()
  })
})

describe('tagsForWrites', () => {
  it('makes the views stale when a table they are computed from changes', () => {
    expect(tagsForWrites(['estadisticas_bateo'])).toEqual(['db:estadisticas_bateo', VIEWS_TAG])
    expect(tagsForWrites(['partidos'])).toEqual(['db:partidos', VIEWS_TAG])
  })

  it('only touches the written table otherwise', () => {
    expect(tagsForWrites(['noticias', 'sponsors'])).toEqual(['db:noticias', 'db:sponsors'])
  })

  it('refreshes everything after an RPC that may change anything', () => {
    expect(tagsForWrites(['jugadores', '*'])).toEqual([ALL_TAG])
  })
})

describe('parseRevalidateRequest', () => {
  it('accepts a short list of table names', () => {
    expect(parseRevalidateRequest({ tables: ['noticias', 'noticias', '*'] })).toEqual(['noticias', '*'])
  })

  it('rejects anything else', () => {
    expect(parseRevalidateRequest(null)).toBeNull()
    expect(parseRevalidateRequest({ tables: [] })).toBeNull()
    expect(parseRevalidateRequest({ tables: ['x; drop'] })).toBeNull()
    expect(parseRevalidateRequest({ tables: Array.from({ length: 31 }, () => 'a') })).toBeNull()
  })
})
