import { useEffect, useRef } from 'react'

type Star = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  base: number
  phase: number
  speed: number
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const starsRef = useRef<Star[]>([])
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      sizeRef.current = { w, h, dpr }

      const count = Math.min(150, Math.max(60, Math.floor((w * h) / 13000)))
      starsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.9 + Math.random() * 2.1,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        base: 0.28 + Math.random() * 0.72,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0013 + Math.random() * 0.0028
      }))
    }

    const draw = (t: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { w, h, dpr } = sizeRef.current

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      for (const s of starsRef.current) {
        s.x += s.vx
        s.y += s.vy

        if (s.x < -6) s.x = w + 6
        else if (s.x > w + 6) s.x = -6
        if (s.y < -6) s.y = h + 6
        else if (s.y > h + 6) s.y = -6

        const wave = 0.5 + 0.5 * Math.sin(s.phase + t * s.speed)
        const a = s.base * (0.1 + 0.9 * wave)

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, a))})`
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particles" aria-hidden="true" />
}
