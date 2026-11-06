'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const LIVE_REFRESH_INTERVAL_MS = 30_000

/**
 * Keeps a live score current without the visitor reloading: while there is a game in progress the page
 * is refreshed every 30 seconds. It stops when the tab is hidden and refreshes once as soon as the
 * visitor comes back, so a forgotten tab never keeps asking the server for data.
 */
export default function LiveRefresh({ active, intervalMs = LIVE_REFRESH_INTERVAL_MS }: { active: boolean; intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (timer === null) timer = setInterval(() => router.refresh(), intervalMs)
    }
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active, intervalMs, router])

  return null
}
