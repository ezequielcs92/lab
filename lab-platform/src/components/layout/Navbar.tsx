'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Trophy, Newspaper, Users, Calendar, Archive, Gamepad2, Shield } from 'lucide-react'

const navigation = [
  { name: 'Inicio', href: '/', icon: Trophy },
  { name: 'Clubes', href: '/clubes', icon: Shield },
  { name: 'Fixture', href: '/fixture', icon: Calendar },
  { name: 'Noticias', href: '/noticias', icon: Newspaper },
  { name: 'Jugadores', href: '/jugadores', icon: Users },
  { name: 'Archivo', href: '/archivo', icon: Archive },
  { name: 'Trivias', href: '/trivias', icon: Gamepad2 },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Top bar gold accent */}
      <div className="h-1 bg-gradient-to-r from-lab-gold-dark via-lab-gold to-lab-gold-dark" />

      <nav className="bg-lab-navy/95 backdrop-blur-md border-b border-lab-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-navy text-xl font-bold group-hover:scale-110 transition-transform">
                L
              </div>
              <div className="hidden sm:block">
                <span className="font-display text-2xl tracking-wider text-lab-white">
                  LAB
                </span>
                <span className="hidden md:inline font-condensed text-xs text-lab-gold ml-2 tracking-widest uppercase">
                  Liga Argentina de Béisbol
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      px-3 py-2 rounded-md font-condensed text-sm font-medium tracking-wide uppercase transition-all
                      ${isActive
                        ? 'text-lab-gold bg-lab-surface-light'
                        : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                      }
                    `}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* La Liga link + Admin */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/la-liga"
                className="font-condensed text-sm font-semibold tracking-wider uppercase text-lab-gold hover:text-lab-gold-light transition-colors"
              >
                La Liga
              </Link>
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-md bg-lab-surface border border-lab-border font-condensed text-xs font-medium tracking-wider uppercase text-lab-muted hover:text-lab-white hover:border-lab-gold/50 transition-all"
              >
                Admin
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-md text-lab-gray hover:text-lab-white hover:bg-lab-surface transition-colors"
              aria-label="Menú"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-lab-border bg-lab-navy">
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide transition-all
                      ${isActive
                        ? 'text-lab-gold bg-lab-surface-light'
                        : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}
              <div className="border-t border-lab-border pt-2 mt-2">
                <Link
                  href="/la-liga"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide text-lab-gold hover:bg-lab-surface transition-all"
                >
                  <Trophy className="w-5 h-5" />
                  La Liga
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide text-lab-muted hover:text-lab-white hover:bg-lab-surface transition-all"
                >
                  <Shield className="w-5 h-5" />
                  Administración
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
