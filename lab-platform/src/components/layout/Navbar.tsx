'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Menu, X, Trophy, Newspaper, Users, Calendar, Archive, Gamepad2, Shield,
  ChevronDown, BookOpen, Crown, FileText, LogIn, LogOut, LayoutDashboard,
} from 'lucide-react'
import ThemeToggle from './ThemeToggle'

const navigation = [
  { name: 'Inicio', href: '/', icon: Trophy },
  { name: 'Clubes', href: '/clubes', icon: Shield },
  { name: 'Fixture', href: '/fixture', icon: Calendar },
  { name: 'Noticias', href: '/noticias', icon: Newspaper },
  { name: 'Jugadores', href: '/jugadores', icon: Users },
  { name: 'Trivias', href: '/trivias', icon: Gamepad2 },
]

const laLigaLinks = [
  { name: 'Historia', href: '/la-liga/historia', icon: BookOpen },
  { name: 'Comisión Directiva', href: '/la-liga/autoridades', icon: Crown },
  { name: 'Reglamentos', href: '/la-liga/reglamentos', icon: FileText },
  { name: 'Línea de Tiempo', href: '/archivo', icon: Archive },
]

const ROL_LABELS: Record<string, string> = {
  admin_liga: 'Admin',
  editor_club: 'Editor',
  periodista: 'Redactor',
  fotografo: 'Fotografía',
  usuario: 'Usuario',
}

const ADMIN_ROLES = ['admin_liga', 'editor_club', 'periodista', 'fotografo']

interface UserState {
  email: string | null
  rol: string | null
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<UserState | null>(null)
  const pathname = usePathname()
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    async function loadUser(userId: string, email: string | null) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .single()
      setUser({ email, rol: perfil?.rol ?? null })
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadUser(user.id, user.email ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser(session.user.id, session.user.email ?? null)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  const isAdmin = user && ADMIN_ROLES.includes(user.rol ?? '')
  const userInitial = user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-gradient-to-r from-lab-gold-dark via-lab-gold to-lab-gold-dark" />

      <nav className="bg-lab-navy/95 backdrop-blur-md border-b border-lab-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-28 h-10 sm:w-32 sm:h-11 md:w-36 md:h-12 group-hover:scale-105 transition-transform">
                <Image
                  src="/logos/lab.svg"
                  alt="Liga Argentina de Béisbol"
                  fill
                  sizes="(min-width: 768px) 144px, 112px"
                  className="object-contain object-left"
                  priority
                />
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
                    className={`px-3 py-2 rounded-md font-condensed text-sm font-medium tracking-wide uppercase transition-all ${
                      isActive ? 'text-lab-gold bg-lab-surface-light' : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}

              {/* La Liga dropdown */}
              <div className="relative group">
                <button
                  className={`flex items-center gap-1 px-3 py-2 rounded-md font-condensed text-sm font-medium tracking-wide uppercase transition-all ${
                    pathname.startsWith('/la-liga') || pathname === '/archivo'
                      ? 'text-lab-gold bg-lab-surface-light'
                      : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                  }`}
                >
                  La Liga
                  <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                </button>
                <div className="absolute top-full left-0 w-full h-2" />
                <div className="absolute top-[calc(100%+4px)] left-0 hidden group-hover:block bg-lab-navy border border-lab-border rounded-md shadow-xl py-1 min-w-[180px] z-50">
                  <Link
                    href="/la-liga"
                    className={`flex items-center gap-2.5 px-4 py-2.5 font-condensed text-sm tracking-wide transition-colors ${
                      pathname === '/la-liga' ? 'text-lab-gold bg-lab-surface-light' : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                    }`}
                  >
                    <Trophy className="w-4 h-4" />
                    La Liga
                  </Link>
                  <div className="border-t border-lab-border/50 my-1" />
                  {laLigaLinks.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 px-4 py-2.5 font-condensed text-sm tracking-wide transition-colors ${
                          pathname === item.href ? 'text-lab-gold bg-lab-surface-light' : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right: theme + user */}
            <div className="hidden lg:flex items-center gap-2">
              <ThemeToggle />

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="w-8 h-8 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-accent-fg font-bold text-sm hover:scale-110 transition-transform"
                    aria-label="Menú de usuario"
                    aria-expanded={userMenuOpen}
                  >
                    {userInitial}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-lab-surface rounded-lg border border-lab-border shadow-xl z-50">
                      <div className="px-4 py-3 border-b border-lab-border">
                        <p className="font-condensed text-xs text-lab-muted tracking-wider truncate">{user.email}</p>
                        {user.rol && (
                          <p className="font-condensed text-xs text-lab-gold tracking-widest uppercase mt-0.5">
                            {ROL_LABELS[user.rol] ?? user.rol}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 font-condensed text-sm tracking-wide text-lab-gray hover:text-lab-white hover:bg-lab-surface-light transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Panel Admin
                        </Link>
                      )}
                      <form action="/auth/signout" method="POST">
                        <button
                          type="submit"
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 font-condensed text-sm tracking-wide text-lab-muted hover:text-red-400 hover:bg-lab-surface-light transition-colors rounded-b-lg"
                        >
                          <LogOut className="w-4 h-4" />
                          Cerrar sesión
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-condensed text-xs tracking-wider uppercase text-lab-muted hover:text-lab-white hover:bg-lab-surface transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Acceso
                </Link>
              )}
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
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide transition-all ${
                      isActive ? 'text-lab-gold bg-lab-surface-light' : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              })}

              {/* La Liga mobile */}
              <div className="border-t border-lab-border pt-2 mt-2">
                <p className="px-3 py-1.5 font-condensed text-xs font-semibold tracking-widest uppercase text-lab-gold/60">La Liga</p>
                <Link
                  href="/la-liga"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide transition-all ${
                    pathname === '/la-liga' ? 'text-lab-gold bg-lab-surface-light' : 'text-lab-gold hover:bg-lab-surface'
                  }`}
                >
                  <Trophy className="w-5 h-5" />
                  La Liga
                </Link>
                {laLigaLinks.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide transition-all ${
                        pathname === item.href ? 'text-lab-gold bg-lab-surface-light' : 'text-lab-gray hover:text-lab-white hover:bg-lab-surface'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>

              {/* User / access section */}
              <div className="border-t border-lab-border pt-2 mt-2 space-y-1">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-lab-gold flex items-center justify-center font-display text-lab-accent-fg font-bold text-xs flex-shrink-0">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-condensed text-xs text-lab-muted truncate">{user.email}</p>
                        {user.rol && (
                          <p className="font-condensed text-xs text-lab-gold tracking-widest uppercase">
                            {ROL_LABELS[user.rol] ?? user.rol}
                          </p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide text-lab-gray hover:text-lab-white hover:bg-lab-surface transition-all"
                      >
                        <LayoutDashboard className="w-5 h-5" />
                        Panel Admin
                      </Link>
                    )}
                    <form action="/auth/signout" method="POST">
                      <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide text-lab-muted hover:text-red-400 hover:bg-lab-surface transition-all"
                      >
                        <LogOut className="w-5 h-5" />
                        Cerrar sesión
                      </button>
                    </form>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md font-condensed text-base font-medium tracking-wide text-lab-muted hover:text-lab-white hover:bg-lab-surface transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    Acceso
                  </Link>
                )}

                <div className="flex items-center gap-3 px-3 py-2.5">
                  <ThemeToggle />
                  <span className="font-condensed text-sm text-lab-muted tracking-wide">Cambiar tema</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
