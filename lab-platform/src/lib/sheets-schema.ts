export const SHEET_HEADERS = {
  Partidos: [
    'external_key', 'fecha_numero', 'fecha_hora', 'fase', 'local_slug', 'visitante_slug',
    'estadio', 'estado', 'marcador_local', 'marcador_visitante', 'marcador_innings_json', 'streaming_url', 'updated_at',
  ],
  Bateo: [
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'orden_bateo',
    'ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp',
    'extras_json', 'updated_at',
  ],
  Pitcheo: [
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'ip', 'h', 'r',
    'er', 'bb', 'so', 'hr', 'w', 'l', 'sv', 'hld', 'wp', 'bk', 'bf', 'extras_json', 'updated_at',
  ],
  Fildeo: [
    'partido_external_key', 'jugador_stable_id', 'jugador_nombre', 'club_slug', 'po', 'a', 'e',
    'dp', 'extras_json', 'updated_at',
  ],
} as const

export type SheetName = keyof typeof SHEET_HEADERS
