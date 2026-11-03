import { useEffect, useMemo, useRef, useState } from 'react'
import DollyGallery from './DollyGallery'
import ContourTide from './ContourTide'
import { SEGMENT_CAP, type TravelRegion } from '../data/travel'

type Props = {
  region: TravelRegion
  light: boolean
  onBack: () => void
  onHome: () => void
}

/** 单张照片在画廊中停留的大致时长，用来推算每段播放时间 */
const PER_PHOTO_MS = 1400

export default function TravelGallery({ region, light, onBack, onHome }: Props) {
  // 手机端整屏更窄：图幅与粒子参数单独给一套，避免图溢出屏幕
  const [compact] = useState(() => window.innerWidth < 620)
  const segments = useMemo(() => {
    const out: string[][] = []
    for (let i = 0; i < region.photos.length; i += SEGMENT_CAP) {
      out.push(region.photos.slice(i, i + SEGMENT_CAP))
    }
    return out.length ? out : [[]]
  }, [region])

  const [seg, setSeg] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [fading, setFading] = useState(false)
  const segRef = useRef(0)
  const viewRef = useRef<HTMLDivElement>(null)

  // 模态层：滚轮一律不再传给背后的文档（页眉/页脚区域同样拦住）
  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    const block = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', block, { passive: false })
    return () => el.removeEventListener('wheel', block)
  }, [])

  // 切换地区时回到第一段
  useEffect(() => {
    segRef.current = 0
    setSeg(0)
    setPrev(null)
    setFading(false)
  }, [region.slug])

  const go = (next: number) => {
    if (next === segRef.current) return
    const old = segRef.current
    segRef.current = next
    setSeg(next)
    setPrev(old)
    // 旧段先以不透明度 1 叠在新段之上，下一帧再淡出 —— 否则浏览器不会跑过渡，等于硬切
    setFading(false)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFading(true))
    })
    window.setTimeout(() => {
      setPrev((p) => (p === old ? null : p))
    }, 1450)
  }

  // 每段播完自动续接下一段，走到末尾回到第一段 —— 循环播放
  useEffect(() => {
    if (segments.length <= 1) return
    const ms = Math.max(16000, segments[seg].length * PER_PHOTO_MS)
    const id = window.setTimeout(() => {
      go((segRef.current + 1) % segments.length)
    }, ms)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seg, segments])

  const images = segments[seg].map((src, i) => ({ src, alt: `${region.label} ${i + 1}` }))

  return (
    <div
      ref={viewRef}
      className={`tg-view${light ? ' is-light' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${region.label} 影像`}
    >
      {/* 潮汐背景：替代纯黑底，照片浮在浪线之上 */}
      <div className="tg-tide" aria-hidden="true">
        <ContourTide
          colors={light ? ['#7b8fa3', '#0d4460'] : ['#16303f', '#a8e2ff']}
          backgroundColor={light ? '#f7f5f0' : '#000000'}
          density={compact ? 0.44 : 0.72}
          particleSize={compact ? 1.6 : light ? 1.4 : 1.2}
          waveHeight={1.35}
          choppiness={0.8}
          horizon={0.19}
          glow={compact ? 0.34 : light ? 0.38 : 0.42}
          foam={0.9}
          speed={0.5}
          parallax={0.5}
          interactive={false}
          clickRipples={false}
          dpr={compact ? 1 : 1.25}
        />
      </div>

      {/* 当前段在下层 */}
      <div className="tg-layer" key={seg}>
        <DollyGallery
          images={images}
          itemWidth={compact ? Math.min(250, Math.round(window.innerWidth * 0.64)) : 360}
          aspectRatio={4 / 5}
          spacing={420}
          spread={0.45}
          scatter={0.12}
          revealRange={2.2}
          passRange={0.8}
          grayscale={0}
          autoScroll={300}
          dragSpeed={1.8}
          pulse={0.05}
          tilt={5}
          backgroundColor="transparent"
        />
      </div>

      {/* 上一段压在最上层淡出，露出下面已经在跑的新段 */}
      {prev !== null && (
        <div className={`tg-layer is-top${fading ? ' is-out' : ''}`}>
          <DollyGallery
            images={segments[prev].map((src, i) => ({ src, alt: `${region.label} ${i + 1}` }))}
            itemWidth={compact ? Math.min(250, Math.round(window.innerWidth * 0.64)) : 360}
            aspectRatio={4 / 5}
            spacing={420}
            spread={0.45}
            scatter={0.12}
            revealRange={2.2}
            passRange={0.8}
            grayscale={0}
            autoScroll={300}
            dragSpeed={1.8}
            pulse={0.05}
            tilt={5}
            backgroundColor="transparent"
          />
        </div>
      )}

      {/* 黑场缓入用的遮罩：盖住照片层，但不挡页眉页脚 */}
      <div className="tg-veil" aria-hidden="true" />

      <header className="tg-head">
        <button className="tg-exit" type="button" onClick={onBack} aria-label="返回旅行地图">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14.5 5 L8 12 L14.5 19"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          返回
        </button>

        <div className="tg-id">
          <span className="tg-kicker">
            {region.code} · {region.en}
          </span>
          <h2 className="tg-name">{region.label}</h2>
          <p className="tg-sub">{region.photos.length} 张影像</p>
        </div>

        <button className="tg-exit" type="button" onClick={onHome} aria-label="返回主页">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M3.4 11.1 L12 3.9 L20.6 11.1"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="square"
            />
            <path
              d="M6.2 9.9 V19.9 H17.8 V9.9"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            />
            <path d="M10.1 19.9 V14.7 H13.9 V19.9" fill="none" stroke="currentColor" strokeWidth={1.3} />
          </svg>
          主页
        </button>
      </header>

      <footer className="tg-foot">
        <div className="tg-spots">
          <b>足迹 · SPOTS</b>
          {region.spots.join(' · ')}
        </div>
      </footer>
    </div>
  )
}
