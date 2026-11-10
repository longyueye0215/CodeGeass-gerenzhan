import { useEffect, useRef, useState } from 'react'
import type { SectionSlot } from '../data/sections'
import { ensureReady } from '../lib/prewarm'
import { isMobileMode } from '../hooks/useDeviceMode'
import LoadingScreen from './LoadingScreen'
import VaultTransition from './VaultTransition'
import DocView from './DocView'

type Props = {
  slot: SectionSlot
  slots: SectionSlot[]
  onHome: () => void
  onPick: (id: string) => void
}

/**
 * 预览套件会用 fast=1 直接深链到某个分区，此时不必再等完整启动仪式。
 * 正常访客的所有时间常量保持原样，视觉节奏不变。
 * 本模块只在进入分区时才被懒加载，此时 applyMode 早已执行，可安全读模式。
 */
const params = new URLSearchParams(window.location.search)
const FAST = params.get('fast') === '1'
const MOBILE = isMobileMode()

const LOADING_MS = FAST ? 320 : 1200
/** 竖屏把舱门节奏略收，正常访客的 2.2s 仪式感不变 */
const GATE_MS = FAST ? 520 : MOBILE ? 820 : 1000
/** 加载页最短展示时长；舱门只在这段时间过去、且资源就绪后才起 */
const GATE_AT = FAST ? 260 : LOADING_MS - 180
/** 文档提前挂载：此时它藏在「舱门 + 黑幕」后面，等门开时已经画好 */
const DOC_AT = GATE_AT + (FAST ? 80 : 160)
/** 黑幕淡出（必须早于舱门开启，否则门开出来的是黑底） */
const FLOOR_OUT_AT = GATE_AT + (FAST ? 70 : 140)
const FLOOR_OUT_MS = FAST ? 220 : MOBILE ? 260 : 340

/**
 * 两段过场：加载动画 → 舱门 → 文档。
 *
 * 与旧版唯一的差别是加了「就绪门禁」：
 * 以前舱门按固定 1020ms 起场，文档 1180ms 才挂载，门裂开时图片刚开始下载；
 * 现在 ensureReady(slot.id) 会等该分区首屏图片全部 Image.decode() 完成、
 * 分区 chunk 也就绪，才启动过场。首屏空闲期已提前预热，
 * 因此正常访客仍是原来的 2.2s 节奏，只是门一开内容就已经全画好了。
 * 弱网时会多等一会儿加载页，但 12s 兜底，绝不锁死。
 */
export default function SectionView({ slot, slots, onHome, onPick }: Props) {
  const [doc, setDoc] = useState(false)
  const [gateOn, setGateOn] = useState(false)
  const [loadingOn, setLoadingOn] = useState(true)
  const [floorOn, setFloorOn] = useState(true)
  const [floorOut, setFloorOut] = useState(false)
  const [ready, setReady] = useState(false)
  const [minElapsed, setMinElapsed] = useState(false)
  const started = useRef(false)

  // 资源门禁 + 加载页最短时长
  useEffect(() => {
    let alive = true
    void ensureReady(slot.id).then(() => {
      if (alive) setReady(true)
    })
    const t = window.setTimeout(() => setMinElapsed(true), GATE_AT)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [slot.id])

  // 两个条件都满足才放行；过场内部时序与旧版完全一致
  useEffect(() => {
    if (!ready || !minElapsed || started.current) return
    started.current = true

    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    at(0, () => setGateOn(true))
    at(140, () => setLoadingOn(false))
    at(DOC_AT - GATE_AT, () => setDoc(true))
    at(FLOOR_OUT_AT - GATE_AT, () => setFloorOut(true))
    at(FLOOR_OUT_AT - GATE_AT + FLOOR_OUT_MS, () => setFloorOn(false))
    at(GATE_MS, () => setGateOn(false))

    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [ready, minElapsed])

  return (
    <>
      {floorOn ? <div className={`transit-floor${floorOut ? ' out' : ''}`} aria-hidden="true" /> : null}
      {loadingOn ? <LoadingScreen /> : null}
      {doc ? (
        <DocView slot={slot} slots={slots} onHome={onHome} onPick={onPick} />
      ) : null}
      {gateOn ? <VaultTransition duration={GATE_MS} /> : null}
    </>
  )
}
