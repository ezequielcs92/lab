import type { StaffClub } from '@/lib/database.types'

export const STAFF_CATEGORIAS = {
  cuerpo_tecnico: 'Cuerpo Tecnico',
  autoridades: 'Autoridades',
} as const

export type StaffCategoria = keyof typeof STAFF_CATEGORIAS

const AUTHORITY_KEYWORDS = [
  'president',
  'presidente',
  'vicepresident',
  'vicepresidente',
  'director',
  'tesorer',
  'secretari',
  'vocal',
  'comision',
  'coordinador',
]

export function getStaffCategory(staff: Pick<StaffClub, 'cargo' | 'categoria'>): StaffCategoria {
  if (staff.categoria === 'autoridades') return 'autoridades'
  if (staff.categoria === 'cuerpo_tecnico') return 'cuerpo_tecnico'

  const cargo = staff.cargo?.trim().toLowerCase() ?? ''
  return AUTHORITY_KEYWORDS.some((keyword) => cargo.includes(keyword))
    ? 'autoridades'
    : 'cuerpo_tecnico'
}

export function isMissingStaffCategoriaColumnError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false
  return error.code === 'PGRST204' || error.message?.includes("'categoria' column") === true
}