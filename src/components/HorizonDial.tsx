import { useEffect, useRef, useState } from 'react'

/** 只在中间三分之一宽度内展开，曲率中心远在下方 */
const W = 560
const CX = W / 2
const R = 2600
const CY = 26 + R

type Tick = { x1: number; y1: number; x2: number; y2: number; w: number; o: number }

function buildTicks(): Tick[] {
  const out: Tick[] = []
  const span = 0.1045
  for (let i = -15; i <= 15; i++) {
    const a = (i / 15) * span
    const major = i % 5 === 0
    const len = major ? 16 : 8
    out.push({
      x1: CX + Math.sin(a) * R,
      y1: CY - Math.cos(a) * R,
      x2: CX + Math.sin(a) * (R + len),
      y2: CY - Math.cos(a) * (R + len),
      w: major ? 1.3 : 0.8,
      o: major ? 0.7 : 0.42
    })
  }
  return out
}

const TICKS = buildTicks()

function buildSteps() {
  let d = ''
  const step = 0.0068
  let i = 0
  for (let a = -0.1; a <= 0.1; a += step, i++) {
    const lift = Math.sin(i * 0.7) > 0.55 ? 8 : Math.sin(i * 0.7) < -0.55 ? -6 : 0
    const rr = R - 40 - lift
    const x = CX + Math.sin(a) * rr
    const y = CY - Math.cos(a) * rr
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
  }
  return d
}

const STEPS = buildSteps()

type Props = {
  pan: { x: number; y: number }
}

/** 顶部陀螺仪刻度表：随背景拖动左右倾斜 */
export default function HorizonDial({ pan }: Props) {
  const [angle, setAngle] = useState(0)
  const current = useRef(0)
  const target = useRef(0)

  useEffect(() => {
    target.current = pan.x * 0.115
  }, [pan.x])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const next = current.current + (target.current - current.current) * 0.12
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
    <div className="horizon" aria-hidden="true">
      <svg className="horizon-svg" viewBox={`0 0 ${W} 150`} preserveAspectRatio="none">
        <g transform={`rotate(${angle.toFixed(3)} ${CX} ${CY})`}>
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="rgba(206, 232, 255, 0.36)"
            strokeWidth={1}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R - 40}
            fill="none"
            stroke="rgba(206, 232, 255, 0.18)"
            strokeWidth={0.8}
          />
          <path d={STEPS} fill="none" stroke="rgba(230, 243, 255, 0.5)" strokeWidth={1.1} />
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
