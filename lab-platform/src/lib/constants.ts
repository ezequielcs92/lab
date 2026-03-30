import type { PosicionJugador, EstadoPartido, TipoHito } from './database.types'

export const POSICION_LABELS: Record<PosicionJugador, string> = {
  pitcher: 'Pitcher',
  catcher: 'Catcher',
  primera_base: '1ra Base',
  segunda_base: '2da Base',
  tercera_base: '3ra Base',
  shortstop: 'Shortstop',
  left_field: 'Left Field',
  center_field: 'Center Field',
  right_field: 'Right Field',
  designated_hitter: 'Bateador Designado',
  utility: 'Utility',
}

export const POSICION_ABBR: Record<PosicionJugador, string> = {
  pitcher: 'P',
  catcher: 'C',
  primera_base: '1B',
  segunda_base: '2B',
  tercera_base: '3B',
  shortstop: 'SS',
  left_field: 'LF',
  center_field: 'CF',
  right_field: 'RF',
  designated_hitter: 'DH',
  utility: 'UT',
}

export const ESTADO_LABELS: Record<EstadoPartido, string> = {
  programado: 'Programado',
  en_curso: 'En Vivo',
  finalizado: 'Finalizado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado',
}

export const TIPO_HITO_LABELS: Record<TipoHito, string> = {
  campeon: 'Campeón',
  historia: 'Historia',
  documento: 'Documento',
  foto_historica: 'Foto Histórica',
  record: 'Récord',
  homenaje: 'Homenaje',
}

export const SITE_CONFIG = {
  name: 'Liga Argentina de Béisbol',
  shortName: 'LAB',
  description: 'Plataforma oficial de la Liga Argentina de Béisbol. Resultados, estadísticas, archivo histórico y más.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://lab.ar',
} as const
