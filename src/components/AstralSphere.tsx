import { useEffect, useRef } from 'react'

type P3 = { x: number; y: number; z: number }

type Props = { size?: number }

export default function AstralSphere({ size = 240 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef(0)
  const angleRef = useRef(0)
  const ptsRef = useRef<P3[]>([])
  const edgesRef = useRef<Array<[number, number]>>([])

  useEffect(() => {
    const n = 260
    const ga = Math.PI * (3 - Math.sqrt(5))
    const pts: P3[] = []
    for (let i = 0; i < n; i += 1) {
      const y = 1 - (i / (n - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = ga * i
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r })
    }
    ptsRef.current = pts

    const LIM2 = 0.3 * 0.3
    const edges: Array<[number, number]> = []
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const dx = pts[i].x - pts[j].x
        const dy = pts[i].y - pts[j].y
        const dz = pts[i].z - pts[j].z
        if (dx * dx + dy * dy + dz * dz < LIM2) edges.push([i, j])
      }
    }
    edgesRef.current = edges
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = size
      const h = size

      if (canvas.width !== Math.floor(w * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const R = w * 0.4
      const cos = Math.cos(angleRef.current)
      const sin = Math.sin(angleRef.current)

      const proj: Array<{ x: number; y: number; d: number }> = []

      for (const p of ptsRef.current) {
        const x = p.x * cos - p.z * sin
        const z = p.x * sin + p.z * cos
        const persp = 1 / (2.05 - z * 0.72)
        proj.push({
          x: cx + x * R * persp * 1.35,
          y: cy + p.y * R * persp * 1.35,
          d: (z + 1) / 2
        })
      }

      ctx.lineWidth = 0.55
      for (const [a, b] of edgesRef.current) {
        const pa = proj[a]
        const pb = proj[b]
        const depth = (pa.d + pb.d) / 2
        const alpha = 0.02 + depth * depth * 0.24
        ctx.strokeStyle = `rgba(168, 214, 255, ${alpha})`
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.stroke()
      }

      for (const p of proj) {
        const alpha = 0.12 + p.d * 0.88
        const r = 0.5 + p.d * 1.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(235, 247, 255, ${alpha})`
        ctx.fill()
      }

      angleRef.current += 0.0032
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className="astral"
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    />
  )
}
