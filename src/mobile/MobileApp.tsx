import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { sectionSlots } from '../data/sections'
import { HERO, ROLE, TYPE } from '../data/sectionMedia'
import {
  initialSectionFromUrl,
  onSiteCommand,
  setSiteSection,
  useSiteCommands
} from '../lib/siteBus'
import StarField from '../components/StarField'
import VaultTransition from '../components/VaultTransition'
import { useClock } from '../hooks/useClock'
import MobileLaunch, { SITE_LINKS } from './MobileLaunch'
import '../styles/mobile.css'

// 与 PC 端一致：分区页含 three.js，由预热引擎在首屏空闲期提前下载
const SectionView = lazy(() => import('../components/SectionView'))

/** 与 SectionView 的手机端舱门节奏保持一致 */
const GATE_MS = 820

const params = new URLSearchParams(window.location.search)
/**
 * 默认一定显示启动开屏：点球体才进分区选择。
 * fast=1 只缩短过场时长，不再顺带跳过开屏；只有显式 ?skipLaunch=1
 * 或分区深链 ?section=slot-X 才直达内容（供工作台逐屏验收）。
 */
const SKIP_LAUNCH = params.has('skipLaunch') || initialSectionFromUrl() !== null

type Screen = 'launch' | 'select'

/**
 * 手机端三层结构（对齐 PC）：
 *   启动界面 launch  →（点击启动球）→ 分区选择 select → 分区内容 section
 * 从分区返回首页一律回到 launch，而不是回到分区选择界面。
 */
export default function MobileApp() {
  const [view, setView] = useState<string | null>(initialSectionFromUrl)
  const [screen, setScreen] = useState<Screen>(SKIP_LAUNCH ? 'select' : 'launch')
  const [gate, setGate] = useState(false)
  const timers = useRef<number[]>([])
  const { dateText, timeText } = useClock()

  useSiteCommands(setView)

  // 预览套件的「首页」命令同样回到启动界面
  useEffect(
    () =>
      onSiteCommand((cmd) => {
        if (cmd.home) setScreen('launch')
      }),
    []
  )

  useEffect(() => setSiteSection(view), [view])

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

  /** 返回首页 = 回启动界面（不是分区选择界面），与 PC 关闭控制台回月球首页同构 */
  const goHome = () => {
    if (gate) return
    setGate(true)
    timers.current.push(
      window.setTimeout(() => {
        setView(null)
        setScreen('launch')
      }, 140)
    )
    timers.current.push(window.setTimeout(() => setGate(false), GATE_MS))
  }

  /** 点击启动球：舱门裂开那一刻换成分区选择界面 */
  const launch = () => {
    if (gate) return
    setGate(true)
    timers.current.push(window.setTimeout(() => setScreen('select'), 140))
    timers.current.push(window.setTimeout(() => setGate(false), GATE_MS))
  }

  return (
    <div className="m-shell">
      <div className="m-veil" aria-hidden="true" />
      {/* 启动界面自带星空底图，不必再叠一层 WebGL 星光 */}
      {screen === 'launch' && !activeSlot ? null : <StarField />}

      {activeSlot ? (
        <Suspense fallback={null}>
          <SectionView
            key={activeSlot.id}
            slot={activeSlot}
            slots={sectionSlots}
            onHome={goHome}
            onPick={enter}
          />
        </Suspense>
      ) : screen === 'launch' ? (
        <MobileLaunch onLaunch={launch} />
      ) : (
        <div className="m-home">
          <header className="m-head">
            <button className="m-back" type="button" onClick={goHome} aria-label="返回启动台">
              ◂
            </button>
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
              <p className="m-sub">群星观测站</p>
            </div>
          </header>

          <nav className="m-list" aria-label="分区列表">
            {sectionSlots.map((s, i) => (
              <button key={s.id} className="m-card" type="button" onClick={() => enter(s.id)}>
                {/* 与 PC 档案图同源同款：白底线稿 + 标签条 + 四角取景框 + 扫描线 */}
                <span className="m-card-art">
                  {HERO[i] ? (
                    <img
                      className={`m-card-art-img${i === 1 ? ' art-right' : ''}${
                        i === 5 ? ' art-lower' : ''
                      }`}
                      src={HERO[i] as string}
                      alt=""
                      decoding="async"
                    />
                  ) : null}
                  <span className="m-card-art-bar" aria-hidden="true">
                    <i>档案</i>
                    <i>0{i + 1}</i>
                  </span>
                  <span className="m-art-corner tl" aria-hidden="true" />
                  <span className="m-art-corner tr" aria-hidden="true" />
                  <span className="m-art-corner bl" aria-hidden="true" />
                  <span className="m-art-corner br" aria-hidden="true" />
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
              {SITE_LINKS.map((l) => (
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
    </div>
  )
}
