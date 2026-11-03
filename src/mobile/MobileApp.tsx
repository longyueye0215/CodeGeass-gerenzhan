import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { sectionSlots, siteMeta } from '../data/sections'
import { HERO, ROLE, TYPE } from '../data/sectionMedia'
import StarField from '../components/StarField'
import IntroSplash from '../components/IntroSplash'
import VaultTransition from '../components/VaultTransition'
import { useClock } from '../hooks/useClock'
import '../styles/mobile.css'

// 与 PC 端一致：分区页含 three.js，首屏不下载，进分区时才加载
const SectionView = lazy(() => import('../components/SectionView'))


const LINKS = [
  { label: 'bilibili', href: 'https://b23.tv/MlxpGKj' },
  { label: '小红书', href: 'https://xhslink.cn/o/8hpmaBOjA1w' },
  { label: '抖音', href: 'https://v.douyin.com/KVe73EhuKEo/' }
]

const GATE_MS = 1000

/**
 * 手机端独立界面。
 * 与 PC 端不共用壳层：首页是纵向卡片列表 + 底部信息条，
 * 分区页复用同一套「加载页 → 六边形舱门 → 文档」过场与内容组件，
 * 只是把右侧竖排导航换成底部横排选择器。
 */
export default function MobileApp() {
  const [view, setView] = useState<string | null>(null)
  const [gate, setGate] = useState(false)
  const [introDone, setIntroDone] = useState(false)
  const timers = useRef<number[]>([])
  const { dateText, timeText } = useClock()

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    []
  )

  const activeSlot = view ? sectionSlots.find((s) => s.id === view) ?? null : null

  const enter = (id: string) => {
    if (id === view) return
    setView(id)
    // 切换分区时先把导航压到舱门下面，等门开完再滑回来
    setGate(false)
  }

  const goHome = () => {
    if (gate) return
    setGate(true)
    timers.current.push(window.setTimeout(() => setView(null), 140))
    timers.current.push(window.setTimeout(() => setGate(false), GATE_MS))
  }

  return (
    <div className="m-shell">
      <div className="m-veil" aria-hidden="true" />
      <StarField />

      {activeSlot ? (
        <Suspense fallback={null}>
          <Suspense fallback={null}>
          <SectionView key={activeSlot.id} slot={activeSlot} slots={sectionSlots} onHome={goHome} onPick={enter} />
        </Suspense>
        </Suspense>
      ) : (
        <div className="m-home">
          <header className="m-head">
            <img
              className="m-logo"
              src="/images/logo-dark.png"
              alt="胧月夜"
              width={56}
              height={56}
            />
            <div className="m-head-copy">
              <p className="m-kicker">GRAND-STARRS-RAY</p>
              <h1 className="m-brand">胧月夜</h1>
              <p className="m-sub">群星观测站 · 六个分区</p>
            </div>
          </header>

          <nav className="m-list" aria-label="分区列表">
            {sectionSlots.map((s, i) => (
              <button key={s.id} className="m-card" type="button" onClick={() => enter(s.id)}>
                <span className="m-card-art">
                  {HERO[i] ? <img src={HERO[i] as string} alt="" loading="lazy" /> : null}
                </span>
                <span className="m-card-copy">
                  <span className="m-card-no">SECTOR 0{i + 1}</span>
                  <span className="m-card-label">{s.label}</span>
                  <span className="m-card-role">
                    {ROLE[i]} · {TYPE[i]}
                  </span>
                </span>
                <span className="m-card-arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </nav>

          <footer className="m-foot">
            <div className="m-clock">
              <span className="m-clock-date">{dateText}</span>
              <b className="m-clock-time">{timeText}</b>
            </div>
            <div className="m-links">
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </footer>
        </div>
      )}

      {activeSlot ? (
        <nav className="m-tabs" aria-label="切换分区">
          <button type="button" className="m-tab m-tab-home" onClick={goHome}>
            <i>⌂</i>
            <span>首页</span>
          </button>
          {sectionSlots.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`m-tab${s.id === view ? ' on' : ''}`}
              onClick={() => enter(s.id)}
              aria-current={s.id === view ? 'page' : undefined}
            >
              <i>{i + 1}</i>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      ) : null}

      {gate ? <VaultTransition duration={GATE_MS} /> : null}

      {introDone ? null : (
        <IntroSplash
          brand={siteMeta.intro}
          english="GRAND-STARRS-RAY"
          onDone={() => setIntroDone(true)}
        />
      )}
    </div>
  )
}
