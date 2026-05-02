'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login')

  // Read stored preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lab-theme') as Theme | null
      if (stored === 'light' || stored === 'dark') setTheme(stored)
    } catch {}
  }, [])

  // Apply class to <html> — admin always dark
  useEffect(() => {
    const html = document.documentElement
    if (isAdmin || theme === 'dark') {
      html.classList.remove('light')
    } else {
      html.classList.add('light')
    }
  }, [theme, isAdmin])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('lab-theme', next) } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme: isAdmin ? 'dark' : theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
