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
  const isDarkLockedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/proximamente')

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
    if (isDarkLockedRoute || theme === 'dark') {
      html.classList.remove('light')
    } else {
      html.classList.add('light')
    }
  }, [theme, isDarkLockedRoute])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('lab-theme', next) } catch {}
  }

  return (
    <ThemeContext.Provider value={{ theme: isDarkLockedRoute ? 'dark' : theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}
