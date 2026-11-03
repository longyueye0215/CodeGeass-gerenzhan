import { PLAYLISTS } from '../data/playlists'
import '../styles/playlist.css'

type Props = {
  /** 当前选中的歌单 id；null 时显示欢迎页 */
  active: string | null
  /** 歌单列表 → 欢迎页 */
  onBack: () => void
  /** 欢迎页 → 音乐分区 */
  onExit: () => void
}

/** 胧月夜の歌单：欢迎页 / 歌单列表（目录按钮由 DocView 统一放在左下角） */
export default function PlaylistPage({ active, onBack, onExit }: Props) {
  const list = active ? PLAYLISTS.find((p) => p.id === active) ?? null : null
  const back = list ? onBack : onExit

  return (
    <article className="pl-page">
      <div className="pl-head">
        <button
          className="pl-back"
          type="button"
          onPointerDown={(e) => {
            if (e.button === 0) back()
          }}
          onClick={(e) => {
            if (e.detail === 0) back()
          }}
        >
          ◂ 返回
        </button>
        {list ? (
          <>
            <h3 className="pl-title">{list.label}</h3>
            <span className="pl-count">{list.items.length} 首</span>
          </>
        ) : null}
      </div>

      {!list ? null : (
      <ol className="pl-list">
        {list.items.map((it, i) => (
          <li className="pl-row" key={`${it.t}-${i}`}>
            <span className="pl-no">{String(i + 1).padStart(2, '0')}</span>
            <span className="pl-song">{it.t}</span>
            <span className="pl-dots" aria-hidden="true" />
            <span className="pl-artist">{it.a}</span>
          </li>
        ))}
      </ol>
      )}
    </article>
  )
}
