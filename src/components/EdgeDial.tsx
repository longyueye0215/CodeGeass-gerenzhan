import { useEffect, useRef, useState } from 'react'

const H = 620
const BULGE = 62          // 弧顶离屏幕边缘的距离
const R = 1400
const CX = BULGE - R      // 圆心在画面左侧很远处
const CY = H / 2

type Tick = { x1: number; y1: number; x2: number; y2: number; w: number; o: number }

function buildTicks(): Tick[] {
  const out: Tick[] = []
  const span = 0.2
  for (let i = -17; i <= 17; i++) {
    const a = (i / 17) * span
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const major = i % 6 === 0
    const mid = i % 3 === 0
    const len = major ? 24 : mid ? 14 : 7
    out.push({
      x1: CX + cos * R,
      y1: CY + sin * R,
      x2: CX + cos * (R - len),
      y2: CY + sin * (R - len),
      w: major ? 1.3 : 0.8,
      o: major ? 0.6 : mid ? 0.4 : 0.24
    })
  }
  return out
}

const TICKS = buildTicks()

type Props = {
  pan: { x: number; y: number }
  side: 'left' | 'right'
}

/** 屏幕两侧的竖向陀螺仪刻度表 */
export default function EdgeDial({ pan, side }: Props) {
  const [angle, setAngle] = useState(0)
  const current = useRef(0)
  const target = useRef(0)

  useEffect(() => {
    target.current = pan.x * 0.075
  }, [pan.x])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const next = current.current + (target.current - current.current) * 0.11
      if (Math.abs(next - current.current) > 0.001) {
        current.current = next
        setAngle(next)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={`edgedial edgedial-${side}`} aria-hidden="true">
      <svg viewBox={`0 0 120 ${H}`} className="edgedial-svg">
        <g transform={`rotate(${angle.toFixed(3)} ${CX} ${CY})`}>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(200, 228, 254, 0.2)"
            strokeWidth={1}
          />
          {TICKS.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={`rgba(214, 234, 255, ${t.o})`}
              strokeWidth={t.w}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
