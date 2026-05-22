'use client'

import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChromeHidden =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/proximamente')

  return (
    <>
      {!isChromeHidden && <Navbar />}
      <main className={`flex-1 ${!isChromeHidden ? 'pt-[calc(4rem+4px)]' : ''}`}>{children}</main>
      {!isChromeHidden && <Footer />}
    </>
  )
}
