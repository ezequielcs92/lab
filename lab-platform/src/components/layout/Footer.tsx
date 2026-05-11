import Link from 'next/link'
import Image from 'next/image'
import { Trophy, Mail, MapPin } from 'lucide-react'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="bg-lab-navy border-t border-lab-border mt-auto">
      {/* Baseball stitch line */}
      <div className="baseball-stitch h-6" />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-32 h-12 md:w-36 md:h-14">
                <Image
                  src="/logos/lab.svg"
                  alt="Liga Argentina de Béisbol"
                  fill
                  sizes="(min-width: 768px) 144px, 128px"
                  className="object-contain object-left"
                />
              </div>
            </div>
            <p className="text-lab-muted text-sm leading-relaxed">
              La plataforma oficial del béisbol argentino. Resultados, estadísticas, historia y comunidad.
            </p>
          </div>

          {/* Navegación */}
          <div>
            <h4 className="font-display text-lg tracking-wider text-lab-gold mb-4">NAVEGACIÓN</h4>
            <ul className="space-y-2">
              {[
                { name: 'Clubes', href: '/clubes' },
                { name: 'Fixture', href: '/fixture' },
                { name: 'Noticias', href: '/noticias' },
                { name: 'Jugadores', href: '/jugadores' },
                { name: 'Línea de Tiempo', href: '/archivo' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-lab-muted hover:text-lab-white font-condensed text-sm tracking-wide transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* La Liga */}
          <div>
            <h4 className="font-display text-lg tracking-wider text-lab-gold mb-4">LA LIGA</h4>
            <ul className="space-y-2">
              {[
                { name: 'Historia', href: '/la-liga/historia' },
                { name: 'Comisión Directiva', href: '/la-liga/autoridades' },
                { name: 'Reglamentos', href: '/la-liga/reglamentos' },
                { name: 'Trivias', href: '/trivias' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-lab-muted hover:text-lab-white font-condensed text-sm tracking-wide transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="font-display text-lg tracking-wider text-lab-gold mb-4">CONTACTO</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-lab-muted text-sm">
                <MapPin className="w-4 h-4 text-lab-gold" />
                Salta · Córdoba · Buenos Aires
              </li>
              <li className="flex items-center gap-2 text-lab-muted text-sm">
                <Mail className="w-4 h-4 text-lab-gold" />
                contacto@lab.ar
              </li>
              <li className="flex items-center gap-2 text-lab-muted text-sm">
                <Trophy className="w-4 h-4 text-lab-gold" />
                Desde 2017
              </li>
              <li>
                <a
                  href="https://www.instagram.com/ligaargentinabeisbol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-lab-muted hover:text-lab-gold transition-colors text-sm"
                >
                  <InstagramIcon className="w-4 h-4 text-lab-gold" />
                  @ligaargentinabeisbol
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-lab-border mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-lab-muted text-xs font-condensed tracking-wider">
            © {new Date().getFullYear()} Liga Argentina de Béisbol. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 text-lab-muted text-xs font-condensed tracking-wider">
            <a
              href="https://www.instagram.com/ligaargentinabeisbol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-lab-gold transition-colors"
            >
              <InstagramIcon className="w-3.5 h-3.5" />
              Instagram
            </a>
            <Link href="/privacidad" className="hover:text-lab-white transition-colors">
              Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-lab-white transition-colors">
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
