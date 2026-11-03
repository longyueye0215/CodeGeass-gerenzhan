import { useEffect, useState } from 'react'
import type { SectionSlot } from '../data/sections'
import LoadingScreen from './LoadingScreen'
import VaultTransition from './VaultTransition'
import DocView from './DocView'

type Props = {
  slot: SectionSlot
  slots: SectionSlot[]
  onHome: () => void
  onPick: (id: string) => void
}

const LOADING_MS = 1200
const GATE_MS = 1000
/** 舱门起场：在加载页尾声压上来 */
const GATE_AT = LOADING_MS - 180
/** 文档提前挂载：此时它藏在「舱门 + 黑幕」后面，等门开时已经画好 */
const DOC_AT = GATE_AT + 160
/** 黑幕淡出（必须早于舱门开启，否则门开出来的是黑底） */
const FLOOR_OUT_AT = GATE_AT + 140
const FLOOR_OUT_MS = 340
/** 整段过场结束：舱门完全打开 */
const END_AT = GATE_AT + GATE_MS

/**
 * 两段过场：加载动画 → 舱门 → 文档。
 *
 * 整段过场始终压着一层不透明黑幕（transit-floor）兜底：
 * 加载页与舱门都只是叠在黑幕之上，所以它们的淡入淡出怎么错位都不会露出首页。
 * 舱门在 56% 处从中缝向两侧裂开，开出来的是已经画好的文档。
 */
export default function SectionView({ slot, slots, onHome, onPick }: Props) {
  const [doc, setDoc] = useState(false)
  const [gateOn, setGateOn] = useState(false)
  const [loadingOn, setLoadingOn] = useState(true)
  const [floorOn, setFloorOn] = useState(true)
  const [floorOut, setFloorOut] = useState(false)

  useEffect(() => {
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    // 舱门压上来，完全盖住加载页后再把加载页撤掉
    at(GATE_AT, () => setGateOn(true))
    at(GATE_AT + 140, () => setLoadingOn(false))

    // 文档与黑幕：先挂文档，再收黑幕，最后开门
    at(DOC_AT, () => setDoc(true))
    at(FLOOR_OUT_AT, () => setFloorOut(true))
    at(FLOOR_OUT_AT + FLOOR_OUT_MS, () => setFloorOn(false))

    at(END_AT, () => setGateOn(false))

    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

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
