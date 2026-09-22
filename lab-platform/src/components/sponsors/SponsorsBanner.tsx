import Image from 'next/image'
import Link from 'next/link'
import type { Sponsor, SponsorLocation } from '@/lib/database.types'
import { filterSponsorsByLocation, safeExternalUrl, safeImageUrl } from '@/lib/sponsors'

interface SponsorsBannerProps {
  sponsors: Sponsor[]
  location: SponsorLocation
  title?: string
  className?: string
}

const VARIANTS: Record<
  SponsorLocation,
  {
    container: string
    item: string
    image: { width: number; height: number }
    wrap: boolean
  }
> = {
  home_top: {
    container: 'gap-6 md:gap-10',
    item: 'h-16 md:h-20 px-4',
    image: { width: 160, height: 64 },
    wrap: true,
  },
  home_between: {
    container: 'gap-5 md:gap-8',
    item: 'h-14 md:h-16 px-3',
    image: { width: 140, height: 56 },
    wrap: true,
  },
  match: {
    container: 'gap-3',
    item: 'h-8 md:h-10 px-1.5',
    image: { width: 80, height: 32 },
    wrap: false,
  },
  news: {
    container: 'gap-4 md:gap-6',
    item: 'h-12 md:h-14 px-2',
    image: { width: 120, height: 48 },
    wrap: true,
  },
}

export default function SponsorsBanner({
  sponsors,
  location,
  title,
  className = '',
}: SponsorsBannerProps) {
  const filtered = filterSponsorsByLocation(sponsors, location)
  if (filtered.length === 0) return null

  const variant = VARIANTS[location]

  return (
    <div className={className}>
      {title && (
        <p className="font-condensed text-[10px] tracking-[0.2em] text-lab-muted uppercase mb-3 text-center">
          {title}
        </p>
      )}
      <div
        className={`flex items-center justify-center ${variant.wrap ? 'flex-wrap' : 'overflow-x-auto'} ${variant.container}`}
      >
        {filtered.map((sponsor) => (
          <SponsorLogo key={sponsor.id} sponsor={sponsor} variant={variant} />
        ))}
      </div>
    </div>
  )
}

function SponsorLogo({
  sponsor,
  variant,
}: {
  sponsor: Sponsor
  variant: (typeof VARIANTS)[SponsorLocation]
}) {
  const logoUrl = safeImageUrl(sponsor.logo_url)
  const destinationUrl = safeExternalUrl(sponsor.destino_url)
  if (!logoUrl) return null

  const content = (
    <div
      className={`relative flex items-center justify-center ${variant.item}`}
      style={{ width: variant.image.width }}
    >
      <Image
        src={logoUrl}
        alt={sponsor.nombre}
        width={variant.image.width}
        height={variant.image.height}
        className="object-contain max-h-full w-auto opacity-90 hover:opacity-100 transition-opacity"
        style={{ maxWidth: '100%' }}
      />
    </div>
  )

  if (destinationUrl) {
    return (
      <Link
        href={destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 hover:scale-105 transition-transform"
      >
        {content}
      </Link>
    )
  }

  return <div className="flex-shrink-0">{content}</div>
}
