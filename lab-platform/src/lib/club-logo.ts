type ClubWithLogo = {
  slug?: string | null
  logo_url?: string | null
}

const CLUB_LOGO_OVERRIDES: Record<string, string> = {
  arias: '/clubes/logos/arias.png',
  velez: '/clubes/logos/velez.png',
}

export function getClubLogoUrl(club?: ClubWithLogo | null): string | null {
  if (!club) return null

  const logo = club.logo_url?.trim() || null

  // Arias must always use the official local crest.
  if (club.slug === 'arias') {
    return CLUB_LOGO_OVERRIDES.arias
  }

  if (club.slug === 'velez') {
    return CLUB_LOGO_OVERRIDES.velez
  }

  return logo
}
