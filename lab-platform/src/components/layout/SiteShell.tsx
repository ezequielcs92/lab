'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login')

  return (
    <>
      {!isAdmin && <Navbar />}
      <main className={`flex-1 ${!isAdmin ? 'pt-[calc(4rem+4px)]' : ''}`}>{children}</main>
      {!isAdmin && <Footer />}
    </>
  )
}
