import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { metricSlots, sectionSlots, siteMeta } from './data/sections'
import { usePan } from './hooks/usePan'
import Backdrop from './components/Backdrop'
import StarField from './components/StarField'
import CockpitFrame from './components/CockpitFrame'
import HorizonDial from './components/HorizonDial'
import EdgeDial from './components/EdgeDial'
import BottomHud from './components/BottomHud'
import IntroSplash from './components/IntroSplash'
import VaultTransition from './components/VaultTransition'
import { useDeviceMode } from './hooks/useDeviceMode'
import { registerChunkLoader, startPrewarm } from './lib/prewarm'
import {
  initialSectionFromUrl,
  skipIntroFromUrl,
  setSiteMode,
  setSiteSection,
  useSiteCommands
} from './lib/siteBus'
import MobileApp from './mobile/MobileApp'

// 分区页与控制台都依赖 three.js（约 600KB），首屏用不到：
// 拆成异步 chunk，由预热引擎在首屏空闲期提前下载 + 解码图片。
const SectionView = lazy(() => import('./components/SectionView'))
const ConsolePanel = lazy(() => import('./components/ConsolePanel'))

/** 点击「-啟動-」后字符雨的时长（ms） */
const BOOT_MS = 1000

function DesktopApp() {
  const { pan, dragging, lastDrag, onPointerDown } = usePan()
  const [view, setView] = useState<string | null>(initialSectionFromUrl)
  const [menuOpen, setMenuOpen] = useState(false)
  const [booting, setBooting] = useState(false)
  const [introDone, setIntroDone] = useState(skipIntroFromUrl)
  const [homeGate, setHomeGate] = useState(false)
  const [homeKey, setHomeKey] = useState(0)
  const bootTimer = useRef<number | null>(null)

  useSiteCommands(setView)

  useEffect(() => setSiteSection(view), [view])

  useEffect(
    () => () => {
      if (bootTimer.current) window.clearTimeout(bootTimer.current)
    },
    []
  )

  const activeSlot = sectionSlots.find((s) => s.id === view) ?? null

  const requestView = (id: string) => {
    setMenuOpen(false)
    if (view === id) return
    setView(id)
  }

  /**
   * 在星座上按下鼠标时不启动拖拽。
   * 否则「按下=开始拖拽」会吞掉后面的 click，
   * 星座和底图拖拽就互相打架了。
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement | null
    if (t && t.closest('.constel')) return
    onPointerDown(e)
  }

  /**
   * 返回首页也走一段舱门过场。
   * 560ms（舱门开始裂开的那一刻）就把当前分区撤掉，
   * 于是门往两侧打开时，露出来的正是已经画好的首页，
   * 不再需要额外的黑场缓入。
   */
  const goHome = () => {
    if (homeGate) return
    setHomeGate(true)
    window.setTimeout(() => setView(null), 560)
    window.setTimeout(() => setHomeGate(false), 1000)
  }

  /** 关闭控制台也走同一段舱门过场：先让面板在门后收好，再开门露出首页 */
  const closePanel = () => {
    if (homeGate) return
    setHomeGate(true)
    window.setTimeout(() => {
      setMenuOpen(false)
      setView(null)
      setHomeKey((k) => k + 1)
    }, 120)
    window.setTimeout(() => setHomeGate(false), 1000)
  }

  /** 先放 2s 字符雨，结束后再打开控制台 */
  const openConsole = () => {
    if (booting) return
    setBooting(true)
    // 面板在门后先挂好：门一开就是分区选择界面，不会先漏出一帧首页
    window.setTimeout(() => setMenuOpen(true), 120)
    bootTimer.current = window.setTimeout(() => {
      bootTimer.current = null
      setBooting(false)
    }, BOOT_MS)
  }

  return (
    <div
      className={`stage${dragging ? ' grabbing' : ''}`}
      onPointerDown={handlePointerDown}
    >
      <Backdrop pan={pan} />
      <HorizonDial pan={pan} />
      <EdgeDial pan={pan} side="left" />
      <EdgeDial pan={pan} side="right" />
      <StarField />
      <CockpitFrame />

      {view && activeSlot ? (
        <Suspense fallback={null}>
          <SectionView
            key={activeSlot.id}
            slot={activeSlot}
            slots={sectionSlots}
            onHome={goHome}
            onPick={requestView}
          />
        </Suspense>
      ) : (
        <BottomHud
          metrics={metricSlots}
          brand={siteMeta.brand}
          onConsole={openConsole}
        />
      )}

      {booting ? <VaultTransition duration={BOOT_MS} /> : null}
      {homeGate ? <VaultTransition duration={1000} /> : null}

      {introDone ? null : (
        <IntroSplash
          brand={siteMeta.intro}
          english="GRAND-STARRS-RAY"
          onDone={() => setIntroDone(true)}
        />
      )}

      <Suspense fallback={null}>
        <ConsolePanel
          open={menuOpen}
          slots={sectionSlots}
          brand={siteMeta.brand}
          active={view}
          onPick={requestView}
          onClose={closePanel}
        />
      </Suspense>
    </div>
  )
}

/** 手机端与 PC 端是两套独立界面，这里只做分流 + 全站预热 */
export default function App() {
  const mode = useDeviceMode()

  useEffect(() => {
    setSiteMode(mode)
  }, [mode])

  useEffect(() => {
    // 分区 chunk 只在这里注册一次，预热引擎负责挑时机执行
    registerChunkLoader(() =>
      Promise.all([
        import('./components/SectionView'),
        import('./components/ConsolePanel')
      ])
    )
    startPrewarm()
  }, [])

  return mode === 'mobile' ? <MobileApp /> : <DesktopApp />
}
