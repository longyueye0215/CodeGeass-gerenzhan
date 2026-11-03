import { useEffect, useMemo, useRef, useState } from 'react'
import { CHINA_CENTROIDS, CHINA_SHAPES, MAP_H, MAP_W, SEA_INSET } from '../data/chinaGeo'
import type { TravelRegion } from '../data/travel'

type Props = {
  regions: TravelRegion[]
  light: boolean
  onPick: (region: TravelRegion, at?: { x: number; y: number }) => void
  hot: string | null
  onHot: (slug: string | null) => void
  /** 画廊打开时暂停绘制，省掉看不见的逐帧开销 */
  active?: boolean
}

type Built = {
  slug: string
  label: string
  count: number
  dots: Path2D
  outline: Path2D
  rings: number[][]
  cx: number
  cy: number
  grad: CanvasGradient | null
  radius: number
}

const LABEL_NUDGE: Record<string, [number, number]> = {
  shanghai: [34, -8],
  sichuan: [-26, 14],
  chongqing: [28, 12],
  shaanxi: [16, -22],
  guangdong: [28, -14],
  hongkong: [32, 24],
}

/** 沿折线等距取样，得到“粒子线” */
function sampleRing(
  ring: number[],
  spacing: number,
  sx: (x: number) => number,
  sy: (y: number) => number,
  out: number[]
) {
  let carry = 0
  for (let i = 0; i < ring.length - 2; i += 2) {
    const ax = sx(ring[i])
    const ay = sy(ring[i + 1])
    const bx = sx(ring[i + 2])
    const by = sy(ring[i + 3])
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy)
    if (len < 0.001) continue
    let t = carry
    while (t < len) {
      out.push(ax + (dx * t) / len, ay + (dy * t) / len)
      t += spacing
    }
    carry = t - len
  }
}

function inRings(rings: number[][], px: number, py: number) {
  let hit = false
  for (const poly of rings) {
    for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
      const xi = poly[i]
      const yi = poly[i + 1]
      const xj = poly[j]
      const yj = poly[j + 1]
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit
    }
  }
  return hit
}

export default function TravelMap({ regions, light, onPick, hot, onHot, active = true }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [labels, setLabels] = useState<
    { slug: string; label: string; x: number; y: number; count: number }[]
  >([])
  const [inset, setInset] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const builtRef = useRef<Built[]>([])
  const hotRef = useRef<string | null>(null)
  const activeRef = useRef(active)
  const palette = useRef({ accent: '#7fd4ff', gold: '#ffd166' })

  useEffect(() => {
    activeRef.current = active
  }, [active])

  const regionByGeo = useMemo(() => {
    const m = new Map<string, TravelRegion>()
    regions.forEach((r) => m.set(r.geo, r))
    return m
  }, [regions])

  useEffect(() => {
    hotRef.current = hot
  }, [hot])

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let off: HTMLCanvasElement | null = null
    let w = 0
    let h = 0

    const build = () => {
      const rect = wrap.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      w = rect.width
      h = rect.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const cs = getComputedStyle(canvas)
      const dotColor = cs.getPropertyValue('--tv-dot').trim() || 'rgba(126,176,235,.42)'
      palette.current = {
        accent: cs.getPropertyValue('--tv-accent').trim() || '#7fd4ff',
        gold: cs.getPropertyValue('--tv-gold').trim() || '#ffd166',
      }

      const pad = Math.min(w, h) * 0.05
      const scale = Math.min((w - pad * 2) / MAP_W, (h - pad * 2) / MAP_H)
      const ox = (w - MAP_W * scale) / 2
      const oy = (h - MAP_H * scale) / 2
      const sx = (x: number) => ox + x * scale
      const sy = (y: number) => oy + y * scale

      const base = document.createElement('canvas')
      base.width = canvas.width
      base.height = canvas.height
      const bctx = base.getContext('2d')
      if (!bctx) return
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const built: Built[] = []
      const basePath = new Path2D()

      for (const shape of CHINA_SHAPES) {
        const region = regionByGeo.get(shape.name)
        const isTarget = !!region
        const pts: number[] = []
        const rings: number[][] = []
        const spacing = isTarget ? 3.4 : 5.2
        const r = isTarget ? 1.55 : 1.05

        for (const ring of shape.rings) {
          if (ring.length < 4) continue
          sampleRing(ring, spacing, sx, sy, pts)
          const flat: number[] = []
          for (let i = 0; i < ring.length; i += 2) flat.push(sx(ring[i]), sy(ring[i + 1]))
          rings.push(flat)
        }

        const path = isTarget ? new Path2D() : basePath
        for (let i = 0; i < pts.length; i += 2) {
          path.rect(pts[i] - r, pts[i + 1] - r, r * 2, r * 2)
        }

        if (region) {
          const c = CHINA_CENTROIDS[shape.name] ?? [0, 0]
          const cx = sx(c[0])
          const cy = sy(c[1])
          const outline = new Path2D()
          for (const ring of rings) {
            outline.moveTo(ring[0], ring[1])
            for (let i = 2; i < ring.length; i += 2) outline.lineTo(ring[i], ring[i + 1])
            outline.closePath()
          }
          built.push({
            slug: region.slug,
            label: region.label,
            count: region.photos.length,
            dots: path,
            outline,
            rings,
            cx,
            cy,
            grad: null,
            radius: 0,
          })
        }
      }

      // 静态底图一次性画好，逐帧只重绘六个高亮省域
      bctx.fillStyle = dotColor
      bctx.fill(basePath)

      // 南海诸岛插图：九段线与南沙岛礁按官方地图惯例单列一框
      const seaPts: number[] = []
      for (const ring of SEA_INSET.rings) {
        if (ring.length < 4) continue
        sampleRing(ring, 3.6, sx, sy, seaPts)
      }
      const seaPath = new Path2D()
      for (let i = 0; i < seaPts.length; i += 2) {
        seaPath.rect(seaPts[i] - 0.9, seaPts[i + 1] - 0.9, 1.8, 1.8)
      }
      bctx.fill(seaPath)

      const ix = sx(SEA_INSET.x)
      const iy = sy(SEA_INSET.y)
      const iw = SEA_INSET.w * scale
      const ih = SEA_INSET.h * scale
      bctx.globalAlpha = 0.42
      bctx.strokeStyle = dotColor
      bctx.lineWidth = 1
      bctx.strokeRect(ix, iy, iw, ih)
      bctx.globalAlpha = 1
      setInset({ x: ix, y: iy, w: iw, h: ih })

      off = base
      builtRef.current = built

      setLabels(
        built.map((b) => {
          const n = LABEL_NUDGE[b.slug] ?? [0, 0]
          return {
            slug: b.slug,
            label: b.label,
            x: b.cx + n[0],
            y: b.cy + n[1],
            count: b.count,
          }
        })
      )
    }

    let lastFrame = 0
    const paint = (now: number) => {
      raf = requestAnimationFrame(paint)
      // 画廊打开或标签页不可见时直接跳过绘制
      if (!activeRef.current) return
      // 30fps 足够：粒子只做缓慢呼吸与流光
      if (now - lastFrame < 32) return
      lastFrame = now

      const { accent, gold } = palette.current
      const t = now / 1000

      ctx.clearRect(0, 0, w, h)

      if (off) {
        ctx.globalAlpha = 0.84 + Math.sin(t * 0.55) * 0.1
        ctx.drawImage(off, 0, 0, w, h)
        ctx.globalAlpha = 1
      }

      for (const b of builtRef.current) {
        const isHot = hotRef.current === b.slug

        if (!b.grad) {
          const r = Math.max(54, Math.min(w, h) * 0.12)
          const g = ctx.createRadialGradient(b.cx, b.cy, 0, b.cx, b.cy, r)
          g.addColorStop(0, accent)
          g.addColorStop(0.5, accent)
          g.addColorStop(1, 'rgba(0,0,0,0)')
          b.grad = g
          b.radius = r
        }

        ctx.globalAlpha = (isHot ? 0.24 : 0.13) + Math.sin(t * 1.1 + b.cx * 0.012) * 0.03
        ctx.fillStyle = b.grad
        ctx.fillRect(b.cx - b.radius, b.cy - b.radius, b.radius * 2, b.radius * 2)

        ctx.globalAlpha = isHot ? 1 : 0.88
        ctx.fillStyle = isHot ? gold : accent
        ctx.fill(b.dots)

        ctx.globalAlpha = isHot ? 0.8 : 0.42
        ctx.strokeStyle = isHot ? gold : accent
        ctx.lineWidth = isHot ? 1.5 : 1
        ctx.setLineDash([9, 16])
        ctx.lineDashOffset = -t * 46
        ctx.stroke(b.outline)
        ctx.setLineDash([])
      }

      ctx.globalAlpha = 1
    }

    build()
    raf = requestAnimationFrame(paint)

    const ro = new ResizeObserver(() => build())
    ro.observe(wrap)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [light, regionByGeo, regions])

  const pickAt = (clientX: number, clientY: number) => {
    const wrap = wrapRef.current
    if (!wrap) return null
    const rect = wrap.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    for (const b of builtRef.current) {
      if (inRings(b.rings, x, y)) return b.slug
    }
    return null
  }

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const slug = pickAt(e.clientX, e.clientY)
    if (slug !== hotRef.current) {
      hotRef.current = slug
      onHot(slug)
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const slug = pickAt(e.clientX, e.clientY)
    const region = slug ? regions.find((r) => r.slug === slug) : null
    if (region) onPick(region, { x: e.clientX, y: e.clientY })
  }

  return (
    <div className="tv-stage" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={`tv-canvas${hot ? ' is-hot' : ''}`}
        onPointerMove={handleMove}
        onPointerLeave={() => {
          if (hotRef.current) {
            hotRef.current = null
            onHot(null)
          }
        }}
        onClick={handleClick}
      />
      {inset && (
        <span
          className="tv-inset-tag"
          style={{
            left: inset.x + inset.w,
            top: inset.y - 13,
            transform: 'translateX(-100%)',
          }}
          aria-hidden="true"
        >
          南海诸岛
        </span>
      )}
      {labels.map((l) => (
        <button
          key={l.slug}
          type="button"
          className={`tv-label${hot === l.slug ? ' is-hot' : ''}`}
          style={{ left: l.x, top: l.y }}
          onPointerEnter={() => {
            hotRef.current = l.slug
            onHot(l.slug)
          }}
          onPointerLeave={() => {
            hotRef.current = null
            onHot(null)
          }}
          onClick={(e) => {
            const r = regions.find((x) => x.slug === l.slug)
            if (!r) return
            const rect = e.currentTarget.getBoundingClientRect()
            onPick(r, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
          }}
        >
          {l.label}
          <b>{l.count}</b>
        </button>
      ))}
    </div>
  )
}
