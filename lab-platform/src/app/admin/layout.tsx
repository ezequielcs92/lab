import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { RolUsuario } from '@/lib/database.types'
import {
  LayoutDashboard,
  Shield,
  Users,
  Newspaper,
  Swords,
  Archive,
  HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react'

/*
 * Intent: Baseball club administrators & league officials managing data
 * between practices, games, and board meetings. Dense, utilitarian —
 * like a digital dugout clipboard. Bebas Neue headlines for authority,
 * Barlow Condensed for data-dense labels.
 *
 * Depth: Borders-only (clean, technical tool aesthetic)
 * Surfaces: lab-dark base → lab-navy sidebar → lab-surface cards (whisper elevation)
 * Spacing: 4px base, multiples of 4
 */

interface AdminLayoutProps {
  children: React.ReactNode
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin_liga', 'editor_club', 'periodista'] },
  { href: '/admin/clubes', label: 'Clubes', icon: Shield, roles: ['admin_liga'] },
  { href: '/admin/jugadores', label: 'Jugadores', icon: Users, roles: ['admin_liga', 'editor_club'] },
  { href: '/admin/partidos', label: 'Partidos', icon: Swords, roles: ['admin_liga'] },
  { href: '/admin/noticias', label: 'Noticias', icon: Newspaper, roles: ['admin_liga', 'editor_club', 'periodista'] },
  { href: '/admin/archivo', label: 'Archivo', icon: Archive, roles: ['admin_liga'] },
  { href: '/admin/trivias', label: 'Trivias', icon: HelpCircle, roles: ['admin_liga'] },
] as const

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*, clubes(nombre, slug)')
    .eq('id', user.id)
    .single()

  const rol: RolUsuario = perfil?.rol ?? 'usuario'

  if (rol === 'usuario') redirect('/')

  const visibleNav = NAV_ITEMS.filter((item) =>
    (item.roles as readonly string[]).includes(rol)
  )

  const clubNombre = (perfil as any)?.clubes?.nombre

  return (
    <div className="min-h-screen flex">
      {/* Sidebar — same hue family as main, border separation (Interface Design: no color fragmentation) */}
      <aside className="w-60 flex-shrink-0 bg-lab-navy border-r border-lab-border flex flex-col">
        {/* Identity block */}
        <div className="p-5 border-b border-lab-border">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-lab-gold flex items-center justify-center font-display text-lab-navy text-lg leading-none">
              L
            </div>
            <div>
              <span className="font-display text-lg tracking-widest text-lab-white leading-none">LAB</span>
              <span className="block font-condensed text-[10px] tracking-[0.2em] text-lab-muted uppercase leading-tight">
                Panel Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => (
            <AdminNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        {/* User context — who's logged in, what role (Interface Design: navigation context) */}
        <div className="border-t border-lab-border p-4">
          <div className="mb-3">
            <p className="font-condensed text-xs text-lab-white font-semibold tracking-wide truncate">
              {perfil?.nombre ?? user.email}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                rol === 'admin_liga' ? 'bg-lab-gold' : rol === 'editor_club' ? 'bg-emerald-400' : 'bg-sky-400'
              }`} />
              <span className="font-condensed text-[10px] tracking-[0.15em] text-lab-muted uppercase">
                {rol === 'admin_liga' ? 'Admin Liga' : rol === 'editor_club' ? 'Editor Club' : 'Periodista'}
              </span>
            </div>
            {clubNombre && (
              <p className="font-condensed text-[10px] text-lab-muted mt-0.5 truncate">
                {clubNombre}
              </p>
            )}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 font-condensed text-xs text-lab-muted hover:text-lab-red-light tracking-wider transition-colors w-full"
            >
              <LogOut className="w-3.5 h-3.5" />
              CERRAR SESIÓN
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 bg-lab-dark overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}

function AdminNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2.5 px-3 py-2 rounded-md text-lab-gray hover:text-lab-white hover:bg-lab-surface transition-colors"
    >
      <Icon className="w-4 h-4 text-lab-muted group-hover:text-lab-gold transition-colors flex-shrink-0" />
      <span className="font-condensed text-sm tracking-wide">{label}</span>
      <ChevronRight className="w-3 h-3 text-lab-border group-hover:text-lab-muted ml-auto transition-colors opacity-0 group-hover:opacity-100" />
    </Link>
  )
}
