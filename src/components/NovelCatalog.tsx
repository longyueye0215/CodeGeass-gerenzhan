import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { NOVEL_CATEGORIES } from '../data/novels'
import { NOVEL_CATEGORY_META } from '../data/novelMeta'
import '../styles/novel-catalog.css'

type Props = {
  open: boolean
  onClose: () => void
  onOpenStory: (id: string) => void
}

/**
 * 行级按压激活：
 * - 鼠标：pointerdown 按下立即触发（不等 click 合成，杜绝“点了没反应”）
 * - 触摸/笔：抬手且位移 < 8px、未被滚动取消时触发
 * - 键盘：Enter / Space 合成的 click（detail === 0）触发
 * 重复激活均为幂等操作，无需去抖。
 */
function pressHandlers(action: () => void) {
  let downX = 0
  let downY = 0
  let moved = false
  let canceled = false
  return {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0) return // 仅左键
      canceled = false
      moved = false
      downX = e.clientX
      downY = e.clientY
      if (e.pointerType === 'mouse') action()
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' && Math.hypot(e.clientX - downX, e.clientY - downY) > 8) {
        moved = true
      }
    },
    onPointerCancel: () => {
      canceled = true
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' && !moved && !canceled) action()
    },
    onClick: (e: ReactMouseEvent<HTMLElement>) => {
      if (e.detail === 0) action()
    }
  }
}

function FolderIcon() {
  return (
    <svg className="ncat-icon-folder" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path d="M1.5 3h4.2l1.4 1.8h7.4V13.4h-13z" fill="currentColor" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg className="ncat-icon-doc" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
      <path d="M3 1h6.5L13 4.5V15H3z" fill="currentColor" />
      <path d="M9.5 1v3.5H13" fill="#10141f" />
    </svg>
  )
}

function ArrowIcon() {
  return <i className="ncat-arrow" aria-hidden="true" />
}

/**
 * 小说目录弹窗：左侧大类预览 + 右侧文件夹手风琴（同时只展开一个）。
 * 背景遮罩不可点击（与站内交互约定一致），通过 × / Esc 关闭。
 */
export default function NovelCatalog({ open, onClose, onOpenStory }: Props) {
  const [activeCat, setActiveCat] = useState(NOVEL_CATEGORIES[0]?.id ?? '')
  const foldersRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // 切换大类后，把新展开的文件夹“钉”在列表可视区顶部：
  // 点谁谁到顶，其文档就在正下方——布局结果每次都完全确定，
  // 其余文件夹的位移不再造成“点在原位置却落空”的问题
  useEffect(() => {
    if (!open || !activeCat) return
    const container = foldersRef.current
    const el = container?.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`)
    if (container && el) {
      const cRect = container.getBoundingClientRect()
      const fRect = el.getBoundingClientRect()
      container.scrollTop += fRect.top - cRect.top
    }
  }, [open, activeCat])

  if (!open) return null

  const active = NOVEL_CATEGORIES.find((c) => c.id === activeCat) ?? NOVEL_CATEGORIES[0]

  return (
    <div
      className="ncat"
      role="dialog"
      aria-label="小说目录"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="ncat-scrim" aria-hidden="true" />

      <div className="ncat-panel">
        <header className="ncat-top">
          <span className="ncat-crumb">
            <i className="ncat-crumb-box" aria-hidden="true" />
            [星月集]::catalog()
          </span>
          <span className="ncat-path">c:\lunarnight\novels</span>
          <button className="ncat-close" type="button" onClick={onClose} aria-label="关闭目录">
            ✕
          </button>
        </header>

        <div className="ncat-body">
          <aside className="ncat-preview">
            <p className="ncat-preview-tag">[{active?.label}]</p>
            <div className="ncat-preview-img">
              <img
                src={NOVEL_CATEGORY_META[active?.label ?? '']?.image ?? '/images/sections/novel.jpg'}
                alt={active?.label}
              />
            </div>
            <p className="ncat-preview-desc">{NOVEL_CATEGORY_META[active?.label ?? '']?.desc ?? ''}</p>
            <p className="ncat-preview-meta">收录短篇 · {active?.stories.length ?? 0} 篇</p>
            <button
              className="ncat-preview-btn"
              type="button"
              {...pressHandlers(() => {
                const first = active?.stories[0]
                if (first) onOpenStory(first.id)
              })}
            >
              EXPLORE
            </button>
          </aside>

          <div className="ncat-folders" ref={foldersRef}>
            {NOVEL_CATEGORIES.map((cat) => {
              const isActive = cat.id === active?.id
              return (
                <div
                  key={cat.id}
                  className="ncat-group"
                  style={{ '--cat-color': NOVEL_CATEGORY_META[cat.label]?.color } as CSSProperties}
                >
                  <button
                    type="button"
                    className={`ncat-folder${isActive ? ' open' : ''}`}
                    data-cat={cat.id}
                    {...pressHandlers(() => setActiveCat(cat.id))}
                  >
                    <span className="ncat-bar">
                      <FolderIcon />
                      <span>{cat.label}</span>
                      <ArrowIcon />
                    </span>
                  </button>

                  {isActive && (
                    <div className="ncat-docs">
                      {cat.stories.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          className="ncat-doc"
                          {...pressHandlers(() => onOpenStory(st.id))}
                        >
                          <span className="ncat-bar">
                            <DocIcon />
                            <span>{st.title}</span>
                            <ArrowIcon />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
