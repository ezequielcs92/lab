import Link from 'next/link'
import { Trophy, Mail, MapPin } from 'lucide-react'

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
              <div className="w-10 h-10 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-navy text-xl font-bold">
                L
              </div>
              <div>
                <div className="font-display text-2xl tracking-wider text-lab-white">LAB</div>
                <div className="font-condensed text-xs text-lab-gold tracking-widest uppercase">
                  Liga Argentina de Béisbol
                </div>
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
                { name: 'Archivo Histórico', href: '/archivo' },
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
                { name: 'Autoridades', href: '/la-liga/autoridades' },
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
                Buenos Aires, Argentina
              </li>
              <li className="flex items-center gap-2 text-lab-muted text-sm">
                <Mail className="w-4 h-4 text-lab-gold" />
                contacto@lab.ar
              </li>
              <li className="flex items-center gap-2 text-lab-muted text-sm">
                <Trophy className="w-4 h-4 text-lab-gold" />
                Desde 1940
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
