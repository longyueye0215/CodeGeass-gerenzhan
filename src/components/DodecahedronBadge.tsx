import { useEffect, useRef } from 'react'

const PHI = (1 + Math.sqrt(5)) / 2
const TAU = Math.PI * 2

type V3 = [number, number, number]

/** 正十二面体：8 个立方体角点 + 12 个黄金比角点，边长 = 2/φ 的顶点对连线 */
function buildGeometry() {
  const verts: V3[] = []
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) verts.push([x, y, z])

  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      verts.push([0, a / PHI, b * PHI])
      verts.push([a / PHI, b * PHI, 0])
      verts.push([a * PHI, 0, b / PHI])
    }

  const edge = 2 / PHI
  const edges: [number, number][] = []
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      const dx = verts[i][0] - verts[j][0]
      const dy = verts[i][1] - verts[j][1]
      const dz = verts[i][2] - verts[j][2]
      if (Math.abs(Math.hypot(dx, dy, dz) - edge) < 1e-6) edges.push([i, j])
    }
  }

  return { verts, edges }
}

const { verts, edges } = buildGeometry()
const NORM = Math.max(...verts.map((v) => Math.hypot(v[0], v[1], v[2])))

type Props = {
  /** 内部立体希腊字母 */
  letter: string
  size?: number
  active?: boolean
  /** 每秒旋转弧度 */
  speed?: number
  className?: string
}

export default function DodecahedronBadge({
  letter,
  size = 96,
  active = false,
  speed = 0.34,
  className
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(size * dpr)
    canvas.height = Math.round(size * dpr)

    const cx = canvas.width / 2
    const cy = canvas.height / 2
    const radius = canvas.width * 0.38
    const focal = radius * 2.6
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 立体字母缓存：一次性画出挤出侧面 + 正面渐变，逐帧只 drawImage
    const letterCanvas = document.createElement('canvas')
    const fs = canvas.width * 0.36
    const pad = fs * 0.9
    letterCanvas.width = Math.ceil(fs * 1.8)
    letterCanvas.height = Math.ceil(fs * 1.9)
    {
      const lc = letterCanvas.getContext('2d')!
      const lx = letterCanvas.width / 2
      const ly = letterCanvas.height / 2
      lc.font = `500 ${fs}px "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "MS Mincho", "Songti SC", serif`
      lc.textAlign = 'center'
      lc.textBaseline = 'middle'

      // 挤出：沿光照反方向堆叠，越深越暗
      const depth = Math.max(3, Math.round(fs * 0.09))
      for (let i = depth; i >= 1; i--) {
        const t = i / depth
        lc.fillStyle = `rgba(${18 + 26 * (1 - t)}, ${40 + 42 * (1 - t)}, ${
          74 + 58 * (1 - t)
        }, ${0.5 + 0.35 * (1 - t)})`
        lc.fillText(letter, lx + i * 0.5, ly + i * 0.5)
      }

      // 正面
      const grad = lc.createLinearGradient(lx, ly - fs * 0.5, lx, ly + fs * 0.5)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.42, '#e2efff')
      grad.addColorStop(0.72, '#9fc4ea')
      grad.addColorStop(1, '#5d87b8')
      lc.shadowColor = 'rgba(150, 205, 255, 0.85)'
      lc.shadowBlur = fs * 0.22
      lc.fillStyle = grad
      lc.fillText(letter, lx, ly)
      lc.shadowBlur = 0
      // 高光面
      lc.globalCompositeOperation = 'source-atop'
      const hi = lc.createLinearGradient(lx, ly - fs * 0.45, lx + fs * 0.28, ly + fs * 0.1)
      hi.addColorStop(0, 'rgba(255,255,255,0.55)')
      hi.addColorStop(0.6, 'rgba(255,255,255,0)')
      lc.fillStyle = hi
      lc.fillRect(0, 0, letterCanvas.width, letterCanvas.height)
      lc.globalCompositeOperation = 'source-over'
    }

    let raf = 0
    const start = performance.now()

    const draw = (now: number) => {
      const t = reduced ? 0.6 : (now - start) / 1000
      const spin = t * speed
      const tiltX = -0.42
      const tiltZ = 0.18

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const boost = activeRef.current ? 1 : 0.72

      // 背光底雾
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.18)
      halo.addColorStop(0, `rgba(120, 178, 235, ${0.14 * boost})`)
      halo.addColorStop(0.62, `rgba(80, 130, 200, ${0.05 * boost})`)
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.18, 0, TAU)
      ctx.fill()

      const project = (v: V3) => {
        // 先绕 Y 自转，再绕 X 微倾
        const cosY = Math.cos(spin)
        const sinY = Math.sin(spin)
        const x1 = v[0] * cosY + v[2] * sinY
        const z1 = -v[0] * sinY + v[2] * cosY
        const y1 = v[1]

        const cosX = Math.cos(tiltX)
        const sinX = Math.sin(tiltX)
        const y2 = y1 * cosX - z1 * sinX
        const z2 = y1 * sinX + z1 * cosX

        const cosZ = Math.cos(tiltZ)
        const sinZ = Math.sin(tiltZ)
        const x3 = x1 * cosZ - y2 * sinZ
        const y3 = x1 * sinZ + y2 * cosZ

        const s = focal / (focal - z2 * radius * 0.55)
        return {
          x: cx + (x3 / NORM) * radius * s,
          y: cy - (y3 / NORM) * radius * s,
          z: z2,
          s
        }
      }

      const points = verts.map(project)
      const drawn = edges
        .map(([a, b]) => ({
          a: points[a],
          b: points[b],
          z: (points[a].z + points[b].z) / 2
        }))
        .sort((p, q) => p.z - q.z)

      const strokeEdges = (list: typeof drawn) => {
        for (const e of list) {
          const front = (e.z + 1) / 2 // 0 后 -> 1 前
          const alpha = (0.07 + 0.42 * front) * boost
          ctx.strokeStyle = `rgba(${168 + 70 * front}, ${206 + 44 * front}, 255, ${alpha})`
          ctx.lineWidth = (0.6 + 0.7 * front) * dpr
          ctx.beginPath()
          ctx.moveTo(e.a.x, e.a.y)
          ctx.lineTo(e.b.x, e.b.y)
          ctx.stroke()
        }
      }

      const back = drawn.filter((e) => e.z < 0)
      const front = drawn.filter((e) => e.z >= 0)

      strokeEdges(back)

      // 立体字母：浮在笼内，始终正对观众
      const letterScale = 1 + (activeRef.current ? 0.03 : 0) + Math.sin(t * 1.1) * 0.008
      const w = letterCanvas.width * letterScale
      const h = letterCanvas.height * letterScale
      ctx.globalAlpha = 0.94
      ctx.drawImage(letterCanvas, cx - w / 2, cy - h / 2, w, h)
      ctx.globalAlpha = 1

      strokeEdges(front)

      // 前景顶点亮点
      for (const p of points) {
        const front2 = (p.z + 1) / 2
        if (front2 < 0.55) continue
        ctx.fillStyle = `rgba(235, 246, 255, ${0.55 * front2 * boost})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.15 * dpr * p.s, 0, TAU)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [size, letter, speed])

  return (
    <canvas
      ref={canvasRef}
      className={['dodeca', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
