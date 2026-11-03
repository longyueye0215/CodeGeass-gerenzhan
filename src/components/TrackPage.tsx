import type { UkuleleTrack } from '../data/ukulele'

/** 曲目页：把该曲目的歌词图按幻灯片顺序铺开 */
export default function TrackPage({
  track,
  onBack
}: {
  track: UkuleleTrack
  onBack: () => void
}) {
  const pages = Array.from(
    { length: track.count },
    (_, i) => `/images/ukulele/${track.id}/${String(i + 1).padStart(2, '0')}.webp`
  )

  return (
    <article className="track-page">
      <div className="track-head">
        <button className="novel-back" type="button" onClick={onBack}>
          ◂ 返回
        </button>
        <div className="track-meta">
          <span className="track-kana" aria-hidden="true">
            {track.kana}
          </span>
          <h3 className="track-title">{track.title}</h3>
          <span className="track-count">{track.count} 页</span>
        </div>
      </div>

      <div className="track-pages">
        {pages.map((src, i) => (
          <figure className="track-shot" key={src}>
            <img src={src} alt={`${track.title} 第 ${i + 1} 页`} loading="lazy" />
            <figcaption>{String(i + 1).padStart(2, '0')}</figcaption>
          </figure>
        ))}
      </div>
    </article>
  )
}
