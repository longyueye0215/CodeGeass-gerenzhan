import { useEffect, useState } from 'react'
import type { SectionSlot } from '../data/sections'
import DodecahedronBadge from './DodecahedronBadge'
import GlitterWarp from './GlitterWarp'
import { HERO, ROLE, WORLD, TYPE } from '../data/sectionMedia'
import { introFor } from '../data/sectionIntro'

/** 六个分区对应的假名（与十二面体一一绑定） */
const KANA = ['ア', 'イ', 'ウ', 'エ', 'オ', 'ワ']

type Props = {
  open: boolean
  slots: SectionSlot[]
  brand: string
  active?: string | null
  onPick: (id: string) => void
  onClose: () => void
}

export default function ConsolePanel({
  open,
  slots,
  brand,
  active,
  onPick,
  onClose
}: Props) {
  // 选中态持久化：悬停/聚焦某个组件即选中它，移开鼠标不再回退到第一个
  const [selected, setSelected] = useState<string>(() => active ?? slots[0]?.id ?? '')

  useEffect(() => {
    if (open) setSelected(active ?? slots[0]?.id ?? '')
  }, [open])

  const focusId = selected
  const focusIndex = Math.max(
    0,
    slots.findIndex((s) => s.id === focusId)
  )
  const focus = slots[focusIndex] ?? slots[0]
  const kana = KANA[focusIndex % KANA.length]
  const cover =
    HERO[focusIndex] ?? `/images/planet-clean/planet-${(focusIndex % 5) + 1}.png`
  // 小说（黑摩可拿）主体偏右，右对齐裁切让整只入镜
  const artRight = focusIndex === 1

  return (
    <div
      className={`panel${open ? ' on' : ''}`}
      role="dialog"
      aria-label="分区控制台"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="panel-warp" aria-hidden="true">
        <GlitterWarp
          speed={1.1}
          density={15}
          brightness={1.1}
          starSize={0.1}
          focalDepth={0.05}
          turbulence={0.35}
          color="#cfe4ff"
          paused={!open}
        />
      </div>

      <div className="panel-scrim" aria-hidden="true" />

      <header className="panel-top">
        <p className="panel-crumb">
          <span className="panel-crumb-root">{brand}</span>
          <i>/</i>
          <span>RECORDS</span>
          <i>/</i>
          <span className="panel-crumb-cur">{focus?.label ?? '未选择'}</span>
        </p>

        <button className="panel-close" type="button" onClick={onClose}>
          <span className="panel-close-mark" />
          <span>返回</span>
        </button>
      </header>

      <div className="panel-body">
        <section className="panel-preview">
          <div className="panel-frame">
            <span className="panel-frame-grid" aria-hidden="true" />
            <span className="panel-frame-corner tl" aria-hidden="true" />
            <span className="panel-frame-corner tr" aria-hidden="true" />
            <span className="panel-frame-corner bl" aria-hidden="true" />
            <span className="panel-frame-corner br" aria-hidden="true" />
            <img className={`panel-frame-img${artRight ? ' art-right' : ''}`} src={cover} alt="" />
            <span className="panel-frame-tag">{kana}</span>
            <span className="panel-frame-bar" aria-hidden="true">
              <i>档案 · ARCHIVE</i>
              <i>SECTOR {focus?.index}</i>
            </span>
          </div>

          <div className="panel-copy">
            <p className="panel-copy-kicker">&gt;&gt; SECTION {focus?.index}</p>
            <h2 className="panel-copy-title">{focus?.label}</h2>
            <p className="panel-copy-text">
              {focus ? introFor(focus.id, focus.label) : ''}
            </p>

            <dl className="panel-meta">
              <div>
                <dt>世界</dt>
                <dd>{WORLD[focusIndex] ?? '——'}</dd>
              </div>
              <div>
                <dt>类型</dt>
                <dd>{TYPE[focusIndex] ?? '——'}</dd>
              </div>
              <div>
                <dt>扮演角色</dt>
                <dd>{ROLE[focusIndex] ?? '——'}</dd>
              </div>
            </dl>

            <button
              className="panel-access"
              type="button"
              onClick={() => focus && onPick(focus.id)}
            >
              <span>登入</span>
              <i className="panel-access-dot" />
            </button>
          </div>
        </section>

        <nav className="panel-nav" aria-label="分区列表">
          <span className="panel-nav-edge top" aria-hidden="true" />

          <div className="panel-nav-scroll">
            {slots.map((s, i) => {
              const on = s.id === focusId
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`panel-node${on ? ' act' : ''}`}
                  style={{ animationDelay: `${(0.06 + i * 0.07).toFixed(2)}s` }}
                  onMouseEnter={() => setSelected(s.id)}
                  onFocus={() => setSelected(s.id)}
                  onClick={() => setSelected(s.id)}
                >
                  <DodecahedronBadge
                    letter={KANA[i % KANA.length]}
                    size={on ? 88 : 74}
                    active={on}
                  />
                  <span className="panel-node-meta">
                    <span className="panel-node-label">{s.label}</span>
                    <span className="panel-node-no">0{i + 1}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <span className="panel-nav-edge bottom" aria-hidden="true" />

          <span className="panel-nav-hint">选择世界 / SELECT</span>
          <span className="panel-nav-tip">鼠标向上或向下滑动</span>
        </nav>
      </div>
    </div>
  )
}
