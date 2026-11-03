import { useEffect } from 'react'
import { CONSTELLATIONS } from '../data/constellations'
import type { SectionSlot } from '../data/sections'

type Props = {
  slots: SectionSlot[]
  pan: { x: number; y: number }
  onPick: (id: string) => void
}

/** 六个星座的中心位置与尺寸（百分比 / px） */
const LAYOUT: { x: number; y: number; size: number; dx?: number; bx?: number }[] = [
  { x: 12, y: 21, size: 126 },
  { x: 86, y: 20, size: 126 },
  { x: 18, y: 72, size: 118 },
  { x: 85, y: 62, size: 118 },
  { x: 27, y: 16, size: 112 },
  { x: 86, y: 41, size: 112 },
  { x: 24, y: 42, size: 110 },
  { x: 68, y: 71, size: 110 }
]

/**
 * 分区入口：星座。
 * 用 SVG 直接画，图元与按钮是同一个盒子，
 * 不会出现位图那种「图在一处、热区在另一处」的偏移。
 */
export default function PlanetHotspots({ slots, pan, onPick }: Props) {
  /**
   * 兜底命中：不再依赖按钮的 DOM 命中区域。
   * 点击时用「点击坐标」和「星座中心坐标」直接算距离，
   * 落在半径内就跳转 —— 无论浏览器如何渲染合成层，都不会错位。
   */
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      // 点在其它可交互元素上时让给它
      if (t && t.closest('a, .hud, .panel, .doc, .manual')) return

      const W = window.innerWidth
      const H = window.innerHeight
      let hit: string | null = null
      let best = Infinity

      slots.forEach((slot, i) => {
        const box = LAYOUT[i % LAYOUT.length]
        const cx = (box.x / 100) * W + pan.x + (box.bx ?? 0)
        const cy = (box.y / 100) * H + pan.y
        const d = Math.hypot(e.clientX - cx, e.clientY - cy)
        // 命中半径取按钮边长的一半，略微放大一点容错
        if (d < box.size * 0.62 && d < best) {
          best = d
          hit = slot.id
        }
      })

      if (hit) onPick(hit)
    }

    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [slots, pan, onPick])

  return (
    <div className="planets">
      {slots.map((slot, i) => {
        const c = CONSTELLATIONS[i % CONSTELLATIONS.length]
        const box = LAYOUT[i % LAYOUT.length]

        // 取星点包围盒 + 边距做 viewBox，图形才会正好填满按钮，
        // 否则星点只占方框一角，看起来"按钮在图形右边"
        const xs = c.stars.map((v) => v[0])
        const ys = c.stars.map((v) => v[1])
        const pad = 9
        const vb = [
          Math.min(...xs) - pad,
          Math.min(...ys) - pad,
          Math.max(...xs) - Math.min(...xs) + pad * 2,
          Math.max(...ys) - Math.min(...ys) + pad * 2
        ].join(' ')

        return (
          <button
            key={slot.id}
            type="button"
            className="constel"
            aria-label={slot.label}
            onClick={() => {
              onPick(slot.id)
            }}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.size}px`,
              height: `${box.size}px`,
              transform: `translate(calc(-50% + ${pan.x + (box.bx ?? 0)}px), calc(-50% + ${pan.y}px))`
            }}
          >
            <svg viewBox={vb} className="constel-svg" style={{ transform: `translateX(${box.dx ?? 0}px)` }}>
              {/* 透明底：整个方框都可点 */}
              <rect x="-50" y="-50" width="200" height="200" fill="transparent" />

              <g className="constel-lines">
                {c.edges.map(([a, b], k) => (
                  <line
                    key={k}
                    x1={c.stars[a][0]}
                    y1={c.stars[a][1]}
                    x2={c.stars[b][0]}
                    y2={c.stars[b][1]}
                  />
                ))}
              </g>

              <g className="constel-stars">
                {c.stars.map(([x, y, b], k) => (
                  <circle key={k} cx={x} cy={y} r={0.9 + b * 1.9} opacity={0.5 + b * 0.5} />
                ))}
              </g>
            </svg>

            <span className="constel-name">{slot.label}</span>
          </button>
        )
      })}
    </div>
  )
}
