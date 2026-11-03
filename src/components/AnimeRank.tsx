import { animeCovers } from '../data/animeCovers'
import { DEFAULT_LUNAR_RANK } from '../data/lunarRank'
import '../styles/anime-rank.css'

/** 已锁定：表格只做展示，不接受任何拖动，数据固定取代码里的定稿 */
type TierKey = 'S' | 'A' | 'B' | 'C' | 'D'

/** 档位配色：沿用个人站青/金主色，从青到金再到苔绿，读起来仍是层级表但不突兀 */
const TIER_META: Record<TierKey, { color: string; text: string }> = {
  S: { color: '#8fe1ff', text: '#06121f' },
  A: { color: '#5fb6d6', text: '#06121f' },
  B: { color: '#ffd166', text: '#2a1d00' },
  C: { color: '#e8b35e', text: '#2a1a00' },
  D: { color: '#8fb98f', text: '#0c1a0c' },
}
const ORDER: TierKey[] = ['S', 'A', 'B', 'C', 'D']
const TOTAL = animeCovers.length

/** 去重并补齐缺失封面，确保 164 部都在表里 */
function normalize(input: Record<TierKey, number[]>): Record<TierKey, number[]> {
  const seen = new Set<number>()
  const out: Record<TierKey, number[]> = { S: [], A: [], B: [], C: [], D: [] }
  for (const k of ORDER) {
    out[k] = input[k].filter((id) => {
      if (!Number.isInteger(id) || id < 0 || id >= TOTAL) return false
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }
  const missing = animeCovers.map((_, i) => i).filter((id) => !seen.has(id))
  missing.forEach((id, i) => out[ORDER[i % ORDER.length]].push(id))
  return out
}

const RANK = normalize(DEFAULT_LUNAR_RANK)

export default function AnimeRank() {
  return (
    <section className="anime-rank" onPointerDown={(e) => e.stopPropagation()}>
      <div className="ar-frame">
        <span className="doc-art-corner tl" />
        <span className="doc-art-corner tr" />
        <span className="doc-art-corner bl" />
        <span className="doc-art-corner br" />
        <div className="ar-bar">
          <span className="ar-bar-l">追番 · RANKING</span>
          <span className="ar-bar-r">TIER LIST</span>
        </div>
        <h2 className="ar-title">【胧月夜の动漫评分表】</h2>

        <div className="ar-tiers">
          {ORDER.map((k) => (
            <div className="ar-tier" key={k}>
              <div
                className="ar-tier-label"
                style={{ background: TIER_META[k].color, color: TIER_META[k].text }}
              >
                {k}
              </div>
              <div className="ar-tier-zone">
                {RANK[k].length === 0 ? (
                  <span className="ar-zone-hint">——</span>
                ) : (
                  RANK[k].map((id) => {
                    const c = animeCovers[id]
                    return (
                      <div
                        key={id}
                        className="ar-cover ar-chip"
                        data-name={c.name}
                        title={c.name}
                      >
                        <img src={c.src} alt={c.name} loading="lazy" draggable={false} />
                        <span className="ar-tip">{c.name}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
