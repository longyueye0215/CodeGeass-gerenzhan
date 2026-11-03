import { lazy, Suspense, useEffect, useRef } from 'react'

const HexagonalVault = lazy(() => import('./HexagonalVault'))

// 提前把六边形分块取回来，免得过场第一帧还没画出来
void import('./HexagonalVault')

type Props = {
  /** 过渡总时长（ms），与 CSS 动画同步 */
  duration?: number
  /** 是否用「舱门开启」收尾：中缝由中间向两侧裂开，露出下一层 */
  hatch?: boolean
  /** 舱门开始打开的时机（占 duration 的比例） */
  hatchAt?: number
}

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 分区切换过渡：在网格上随机点几处亮起来。
 *
 * 组件只认指针，这里合成一串 pointermove：
 * 先在随机落点停留让该区域点亮，再快速窜到下一个随机点，
 * 于是每次过场都是不规则的、无方向的闪光，而非固定的一条对角线。
 *
 * 收尾交给着色器里的舱门：中缝向左右两侧裂开，
 * 门内的六边形被逐块裁掉，像机械闸门滑开露出下一层。
 */
export default function VaultTransition({ duration = 1000, hatch = true, hatchAt = 0.56 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const door = hatch && !prefersReduced
  const hatchStart = Math.round(duration * hatchAt)
  // 门在 92% 前就开到底，留一点余量给 canvas 初始化的误差
  const hatchDuration = Math.max(120, Math.round(duration * 0.36))

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const W = window.innerWidth
    const H = window.innerHeight

    // 每次挂载都重新取点，过场因此不会重复
    const count = 4 + Math.floor(Math.random() * 3)
    const pts = Array.from({ length: count }, () => ({
      x: W * (0.06 + Math.random() * 0.88),
      y: H * (0.08 + Math.random() * 0.84)
    }))

    const send = (x: number, y: number) => {
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: x,
          clientY: y,
          bubbles: true,
          pointerType: 'mouse'
        })
      )
    }

    // 先落在第一个点，避免第一帧从屏幕中心拉出长痕
    send(pts[0].x, pts[0].y)

    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      // rAF 的时间戳是「这一帧开始」的时刻，可能早于上面取的 performance.now()，
      // 不夹住会出现负进度 → seg=-1 → pts[-1] 取值崩溃。
      const p = Math.max(0, Math.min(1, (now - start) / duration))
      const seg = Math.max(0, Math.min(count - 1, Math.floor(p * count)))
      const local = p * count - seg
      const from = pts[seg]
      const to = pts[seg + 1] ?? pts[seg]

      // 前 45% 停住点亮，后 55% 迅速跳到下一点
      const k = local < 0.45 ? 0 : (local - 0.45) / 0.55
      const e = k * k * (3 - 2 * k)

      send(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [duration])

  return (
    <div
      ref={rootRef}
      className={`vault-gate${door ? ' hatch' : ''}`}
      aria-hidden="true"
      style={
        {
          '--gate-ms': `${duration}ms`,
          '--hatch-at': `${Math.round(hatchAt * 100)}%`
        } as React.CSSProperties
      }
    >
      <Suspense fallback={null}>
        <HexagonalVault
          backgroundColor="#04070d"
          colors={['#7FB2F0', '#EAF6FF']}
          cellSize={3.1}
          lineWidth={1.6}
          litWidth={3.2}
          lattice={1.9}
          glow={1.5}
          glowRadius={0.62}
          core={0.45}
          vignette={0.4}
          grain={0.5}
          trailLength={2.1}
          trailWidth={0.62}
          follow={0.9}
          flow={0.2}
          autoplay
          shimmer={0.6}
          speed={1}
          interactive
          clickPulses={false}
          hatchStart={door ? hatchStart : 0}
          hatchDuration={door ? hatchDuration : 0}
          hatchShift={0.38}
          bare
          dpr={1.5}
        />
      </Suspense>
    </div>
  )
}
