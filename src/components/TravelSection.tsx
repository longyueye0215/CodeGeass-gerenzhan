import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import TravelMap from './TravelMap'
import TravelGallery from './TravelGallery'
import VaultTransition from './VaultTransition'
import { TRAVEL_REGIONS, type TravelRegion } from '../data/travel'
import '../styles/travel.css'

/** 与分区切换 / 文档跳页同一套节奏：门在 56% 处裂开，1000ms 结束 */
const GATE_MS = 1000
const HATCH_AT = 0.56
const SWAP_AT = Math.round(GATE_MS * HATCH_AT)

type Props = {
  light: boolean
  onHome: () => void
}

export default function TravelSection({ light, onHome }: Props) {
  const [picked, setPicked] = useState<TravelRegion | null>(null)
  const [gateOn, setGateOn] = useState(false)
  const [hot, setHot] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  const busy = useRef(false)

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const openRegion = (region: TravelRegion) => {
    if (busy.current) return
    busy.current = true
    // 画廊先挂上：舱门还闭着的时候多莉隧道就已经跑起来，
    // 门一裂开就是进行中的画面，不会先露一帧静止图
    setPicked(region)
    setGateOn(true)
    timers.current.push(
      window.setTimeout(() => {
        setGateOn(false)
        busy.current = false
      }, GATE_MS)
    )
  }

  const closeRegion = () => {
    if (busy.current) return
    busy.current = true
    clearTimers()
    setGateOn(true)
    // 门开始裂开的瞬间撤掉画廊，门后露出来的正是地图
    timers.current.push(window.setTimeout(() => setPicked(null), SWAP_AT))
    timers.current.push(
      window.setTimeout(() => {
        setGateOn(false)
        busy.current = false
      }, GATE_MS)
    )
  }

  const totalPhotos = TRAVEL_REGIONS.reduce((n, r) => n + r.photos.length, 0)

  return (
    <section className="travel">
      <div className="tv-panel">
        <span className="doc-art-corner tl" aria-hidden="true" />
        <span className="doc-art-corner tr" aria-hidden="true" />
        <span className="doc-art-corner bl" aria-hidden="true" />
        <span className="doc-art-corner br" aria-hidden="true" />

        <div className="tv-bar">
          <span>旅行 · TRAVEL MAP</span>
          <span>
            {TRAVEL_REGIONS.length} 站 / {totalPhotos} 张
          </span>
        </div>

        <TravelMap
          regions={TRAVEL_REGIONS}
          light={light}
          onPick={openRegion}
          hot={hot}
          onHot={setHot}
          active={!picked}
        />

        <div className="tv-chips">
          {TRAVEL_REGIONS.map((r) => (
            <button
              key={r.slug}
              type="button"
              className="tv-chip"
              onPointerEnter={() => setHot(r.slug)}
              onPointerLeave={() => setHot(null)}
              onClick={() => openRegion(r)}
            >
              <i>{r.code}</i>
              {r.label}
              <em>{r.photos.length}</em>
            </button>
          ))}
        </div>
      </div>

      {createPortal(
        <>
          {picked && (
            <TravelGallery region={picked} light={light} onBack={closeRegion} onHome={onHome} />
          )}
          {gateOn && (
            <div className="tv-vault" aria-hidden="true">
              <VaultTransition duration={GATE_MS} hatchAt={HATCH_AT} />
            </div>
          )}
        </>,
        document.body
      )}
    </section>
  )
}
