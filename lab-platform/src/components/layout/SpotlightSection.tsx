'use client'

import { useRef, useEffect } from 'react'

const BALL_SIZE = 48   // px — tamaño de la pelota principal
const TRAIL_LEN = 20   // puntos de estela

export default function SpotlightSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const trailRef   = useRef<{ x: number; y: number }[]>([])
  const activeRef  = useRef(false)
  const rafRef     = useRef<number>(0)
  const imgRef     = useRef<HTMLImageElement | null>(null)
  const drawRef    = useRef<() => void>(() => {})

  // Preload image once
  useEffect(() => {
    const img = new Image()
    img.src = '/baseball.png'
    imgRef.current = img
  }, [])

  drawRef.current = () => {
    const canvas = canvasRef.current
    if (!canvas) { rafRef.current = requestAnimationFrame(drawRef.current); return }
    const ctx = canvas.getContext('2d')
    if (!ctx) { rafRef.current = requestAnimationFrame(drawRef.current); return }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const trail = trailRef.current
    const img   = imgRef.current

    if (activeRef.current && trail.length > 0 && img?.complete) {
      const len = trail.length

      // Trail — ghost images fading + shrinking toward the back
      for (let i = 0; i < len - 1; i++) {
        const progress = (i + 1) / len   // 0 = oldest, ~1 = newest
        const { x, y } = trail[i]
        const size  = BALL_SIZE * (0.20 + progress * 0.60)
        const alpha = progress * 0.30

        // Soft glow behind each ghost
        const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.6)
        glow.addColorStop(0, `rgba(90,171,223,${alpha * 0.5})`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, size * 1.6, 0, Math.PI * 2)
        ctx.fill()

        // Ghost image
        ctx.globalAlpha = alpha
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
        ctx.globalAlpha = 1
      }

      // Atmospheric halo behind main ball
      const cur = trail[len - 1]
      const halo = ctx.createRadialGradient(cur.x, cur.y, 0, cur.x, cur.y, 300)
      halo.addColorStop(0,   'rgba(255,248,210,0.16)')
      halo.addColorStop(0.3, 'rgba(90,171,223,0.09)')
      halo.addColorStop(1,   'transparent')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cur.x, cur.y, 300, 0, Math.PI * 2)
      ctx.fill()

      // Main ball — full size, centered on cursor
      ctx.drawImage(img, cur.x - BALL_SIZE / 2, cur.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE)
    }

    rafRef.current = requestAnimationFrame(drawRef.current)
  }

  useEffect(() => {
    rafRef.current = requestAnimationFrame(drawRef.current)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current
      const section = sectionRef.current
      if (!canvas || !section) return
      canvas.width  = section.offsetWidth
      canvas.height = section.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (sectionRef.current) ro.observe(sectionRef.current)
    return () => ro.disconnect()
  }, [])

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = sectionRef.current!.getBoundingClientRect()
    trailRef.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift()
    activeRef.current = true
  }

  function onMouseLeave() {
    activeRef.current = false
    trailRef.current  = []
  }

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        style={{ zIndex: 50 }}
        aria-hidden="true"
      />
    </section>
  )
}
