import { useEffect, useRef } from 'react'
import { UKULELE_TRACKS, type UkuleleTrack } from '../data/ukulele'

/* ---------- 线框立方体：一块 canvas 一颗，共用一个 rAF ---------- */

const VERTICES: [number, number, number][] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1]
]

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7]
]

type CubeUnit = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  seed: number
  hover: boolean
  size: number
}

const units = new Set<CubeUnit>()
let raf = 0
let clock = 0

function paint(u: CubeUnit) {
  const { ctx, canvas } = u
  const dpr = window.devicePixelRatio || 1
  const css = u.size
  const px = Math.round(css * dpr)
  if (canvas.width !== px || canvas.height !== px) {
    canvas.width = px
    canvas.height = px
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, px, px)
  ctx.scale(dpr, dpr)

  const cx = css / 2
  const cy = css / 2
  const reach = css * (u.hover ? 0.385 : 0.35)
  const yaw = clock * 0.4 + u.seed * 6.283
  // 俯仰收窄，保证始终处在能看清立方体结构的 3/4 视角
  const pitch = 0.55 + Math.sin(clock * 0.26 + u.seed * 6.283) * 0.2

  const sy = Math.sin(yaw)
  const cyw = Math.cos(yaw)
  const sp = Math.sin(pitch)
  const cp = Math.cos(pitch)

  const pts: { x: number; y: number; z: number }[] = []
  for (const [vx, vy, vz] of VERTICES) {
    const rx = vx * cyw + vz * sy
    const rz = -vx * sy + vz * cyw
    const ry = vy * cp - rz * sp
    const rz2 = vy * sp + rz * cp
    // 正交投影：小尺寸下比透视更干净，立方体结构一眼可辨
    const k = 1
    pts.push({ x: cx + rx * k * reach, y: cy + ry * k * reach, z: rz2 })
  }

  const front: [number, number][] = []
  const back: [number, number][] = []
  for (const [a, b] of EDGES) {
    const z = (pts[a].z + pts[b].z) / 2
    ;(z >= 0 ? front : back).push([a, b])
  }

  const stroke = (list: [number, number][], near: boolean) => {
    if (!list.length) return
    ctx.globalCompositeOperation = 'lighter'
    const rgb = near ? '234,246,255' : '112,150,220'
    const passes: [number, number][] = near
      ? [
          [5.2, 0.1],
          [2.6, 0.3],
          [1.1, 0.92]
        ]
      : [
          [3.6, 0.09],
          [1.8, 0.26],
          [1.05, 0.62]
        ]
    for (const [w, alpha] of passes) {
      ctx.beginPath()
      for (const [a, b] of list) {
        ctx.moveTo(pts[a].x, pts[a].y)
        ctx.lineTo(pts[b].x, pts[b].y)
      }
      ctx.lineWidth = w
      ctx.strokeStyle = `rgba(${rgb},${alpha})`
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  stroke(back, false)
  stroke(front, true)

  // 顶点光点
  ctx.globalCompositeOperation = 'lighter'
  for (const p of pts) {
    const near = p.z >= 0
    ctx.beginPath()
    ctx.arc(p.x, p.y, near ? 1.9 : 1.2, 0, Math.PI * 2)
    ctx.fillStyle = near ? 'rgba(240,250,255,0.9)' : 'rgba(140,175,235,0.45)'
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}

function loop() {
  clock += 1 / 60
  units.forEach(paint)
  raf = requestAnimationFrame(loop)
}

function attach(u: CubeUnit) {
  units.add(u)
  if (!raf) raf = requestAnimationFrame(loop)
}

function detach(u: CubeUnit) {
  units.delete(u)
  if (!units.size && raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

/* ---------- 单颗立方体 ---------- */

function Cube({
  track,
  onOpen
}: {
  track: UkuleleTrack
  onOpen: (id: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const unitRef = useRef<CubeUnit | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const unit: CubeUnit = {
      canvas,
      ctx,
      seed: (Number(track.id.slice(1)) % 17) / 17,
      hover: false,
      size: canvas.clientWidth || 112
    }
    unitRef.current = unit
    attach(unit)

    const watch = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) unit.size = w
    })
    watch.observe(canvas)

    return () => {
      watch.disconnect()
      detach(unit)
      unitRef.current = null
    }
  }, [track.id])

  return (
    <button
      className="work-cell"
      type="button"
      onClick={() => onOpen(track.id)}
      onPointerEnter={() => {
        const u = unitRef.current
        if (u) u.hover = true
      }}
      onPointerLeave={() => {
        const u = unitRef.current
        if (u) u.hover = false
      }}
      onFocus={() => {
        const u = unitRef.current
        if (u) u.hover = true
      }}
      onBlur={() => {
        const u = unitRef.current
        if (u) u.hover = false
      }}
      aria-label={`${track.title}，${track.count} 页歌词`}
    >
      <span className="work-cube">
        <canvas ref={canvasRef} className="work-cube-canvas" aria-hidden="true" />
        <span className="work-kana" aria-hidden="true">
          {track.kana}
        </span>
      </span>
      <span className="work-title">{track.title}</span>
    </button>
  )
}

/* ---------- 作品集墙面 ---------- */

export default function WorksGallery({
  onOpen,
  onBack
}: {
  onOpen: (id: string) => void
  onBack: () => void
}) {
  return (
    <article className="works-page">
      <div className="works-head">
        <button className="novel-back" type="button" onClick={onBack}>
          ◂ 返回
        </button>
        <p className="works-summary">
          空耳教学图片版 · 共 {UKULELE_TRACKS.length} 首 · 点击立方体查看歌词
        </p>
      </div>

      <div className="works-grid">
        {UKULELE_TRACKS.map((t) => (
          <Cube key={t.id} track={t} onOpen={onOpen} />
        ))}
      </div>
    </article>
  )
}
