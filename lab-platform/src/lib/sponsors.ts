import type { Sponsor, SponsorLocation } from '@/lib/database.types'

export function filterSponsorsByLocation(
  sponsors: Sponsor[],
  location: SponsorLocation
): Sponsor[] {
  return sponsors
    .filter((s) => s.ubicacion === location && isSponsorActive(s))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
}

export function isSponsorActive(sponsor: Sponsor, referenceDate = new Date()): boolean {
  if (!sponsor.activo) return false

  const today = referenceDate.toISOString().slice(0, 10)
  if (sponsor.vigencia_inicio && sponsor.vigencia_inicio > today) return false
  if (sponsor.vigencia_fin && sponsor.vigencia_fin < today) return false

  return true
}

export function safeExternalUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

export function safeImageUrl(value: string): string | null {
  const url = safeExternalUrl(value)
  return url?.startsWith('https:') ? url : null
}

export const SPONSOR_LOCATIONS: { value: SponsorLocation; label: string }[] = [
  { value: 'home_top', label: 'Sponsor principal · portada superior' },
  { value: 'home_between', label: 'Entre secciones de portada' },
  { value: 'match', label: 'Partido / transmisión' },
  { value: 'news', label: 'Noticias' },
]
