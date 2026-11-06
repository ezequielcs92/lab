'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackedPath } from '@/lib/page-views'

/**
 * Reports each page a visitor opens, once per browser tab and day, so a refresh or a back-and-forth
 * does not inflate the count and the database receives very few writes.
 */
export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const path = trackedPath(pathname)
    if (!path) return
    const key = `lab-view:${new Date().toISOString().slice(0, 10)}:${path}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // Storage blocked: count anyway.
    }
    const payload = JSON.stringify({ path })
    try {
      if (!navigator.sendBeacon?.('/api/track', new Blob([payload], { type: 'application/json' }))) {
        void fetch('/api/track', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, keepalive: true })
      }
    } catch {
      // The counter is best effort.
    }
  }, [pathname])

  return null
}
