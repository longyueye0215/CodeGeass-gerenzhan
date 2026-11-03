import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
}

/** 操作说明弹窗：仿参考图的三条说明 + 两条网址示例 */
export default function InstructionsModal({ open, onClose }: Props) {
  if (!open) return null

  // 弹窗挂在 body 上：HUD 容器带有动画 transform，会成为 fixed 子元素的包含块，
  // 直接放在里面会导致弹窗贴着页面底部而不是视口中央
  return createPortal(
    <div className="manual" role="dialog" aria-label="操作说明" onPointerDown={(e) => e.stopPropagation()}>
      <div className="manual-scrim" onClick={onClose} />

      <div className="manual-panel">
        <span className="manual-corner tl" aria-hidden="true" />
        <span className="manual-corner tr" aria-hidden="true" />
        <span className="manual-corner bl" aria-hidden="true" />
        <span className="manual-corner br" aria-hidden="true" />

        <button className="manual-close" type="button" onClick={onClose} aria-label="关闭">
          ×
        </button>

        <h2 className="manual-title">操作说明</h2>

        <div className="manual-grid">
          <section className="manual-item">
            <p className="manual-no">①</p>
            <div>
              <p className="manual-h">请使用操作系统进行查阅</p>
              <p className="manual-sub">Please use the operating system to search information</p>
            </div>
            <div className="manual-art manual-art-click">
              <svg viewBox="0 0 160 56" width="160" height="56" aria-hidden="true">
                <g fill="none" stroke="rgba(226, 240, 255, 0.8)" strokeWidth={1.1}>
                  <circle cx="46" cy="28" r="17" />
                  <circle cx="46" cy="28" r="7" />
                  <circle cx="46" cy="28" r="2.4" fill="rgba(226,240,255,0.9)" />
                  <path d="M18 28 H26" />
                  <path d="M66 28 H74" />
                </g>
                <path d="M68 32 l 13 13 l 3.6 -8 l 7 -2 z" fill="rgba(226,240,255,0.85)" />
                <text x="92" y="27" fill="rgba(226,240,255,0.8)" fontSize="9" letterSpacing="1.6">
                  CLICK
                </text>
              </svg>
            </div>
          </section>

          <section className="manual-item">
            <p className="manual-no">②</p>
            <div>
              <p className="manual-h">某些时刻，请上滑展示全貌</p>
              <p className="manual-sub">At certain moments, please swipe up to show the full view</p>
            </div>
            <div className="manual-art manual-art-swipe">
              <svg viewBox="0 0 210 56" width="210" height="56" aria-hidden="true">
                <g fill="rgba(226,240,255,0.7)" stroke="none">
                  <rect x="6" y="14" width="26" height="20" />
                  <rect x="36" y="18" width="20" height="16" />
                  <rect x="60" y="22" width="14" height="12" />
                </g>
                <path d="M72 30 l 9 -7 l 3.6 5.4 l 7 -4.5" fill="none" stroke="rgba(226,240,255,0.8)" strokeWidth={1.2} />
                <path d="M6 40 h 34" stroke="rgba(226,240,255,0.55)" strokeWidth={1.2} />
                <path d="M6 44 h 34" stroke="rgba(226,240,255,0.35)" strokeWidth={1} strokeDasharray="2 3" />
                <text x="96" y="24" fill="rgba(226,240,255,0.8)" fontSize="9" letterSpacing="1.6">
                  SWIPE
                </text>
                <text x="96" y="36" fill="rgba(226,240,255,0.8)" fontSize="9" letterSpacing="1.6">
                  UP
                </text>
              </svg>
            </div>
          </section>

          <section className="manual-item manual-item-wide">
            <p className="manual-no">③</p>
            <div>
              <p className="manual-h">正规查阅信息，请勿随意更改查询范围字符，以免误入</p>
              <p className="manual-sub">
                Please check the information formally and do not change the query range
                characters at will to avoid entering the wrong
              </p>
            </div>
          </section>
        </div>

        <div className="manual-grid-bg" aria-hidden="true" />
      </div>
    </div>,
    document.body
  )
}
