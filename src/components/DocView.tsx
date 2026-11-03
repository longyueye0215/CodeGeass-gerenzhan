import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { SectionSlot } from '../data/sections'
import OrbBadge from './OrbBadge'
import { HERO, ROLE, WORLD, TYPE } from '../data/sectionMedia'
import ResumeBlock from './ResumeBlock'
import NovelCatalog from './NovelCatalog'
import MusicCard from './MusicCard'
import WorksGallery from './WorksGallery'
import TrackPage from './TrackPage'
import PlaylistPage from './PlaylistPage'
import { PLAYLISTS } from '../data/playlists'
import ParticleImage from './ParticleImage'
import ConcaveCarousel from './ConcaveCarousel'
import TerminalRain from './TerminalRain'
import ContactSheet from './ContactSheet'
import AnimeRank from './AnimeRank'
import TravelSection from './TravelSection'
import { ANIME_SHOTS } from '../data/animeShots'
import '../styles/glyph-ember.css'
import { GAME_ICONS } from '../data/games'
import { UKULELE_TRACKS } from '../data/ukulele'
import VaultTransition from './VaultTransition'
import { NOVEL_AFTERWORD, NOVEL_CATEGORIES, getNovelStory } from '../data/novels'
import { NOVEL_CATEGORY_META } from '../data/novelMeta'
import { introFor } from '../data/sectionIntro'

type Props = {
  slot: SectionSlot
  slots: SectionSlot[]
  onHome: () => void
  onPick: (id: string) => void
}

const NOVEL_SLOT_ID = 'slot-2'

/** 游戏分区开场：照片墙条目 */
const ANIME_ITEMS = ANIME_SHOTS.map((s) => ({ src: s.src, alt: '动漫截图' }))

/** 每轮开场随机抽一批，保证每次进入看到的都不一样 */
const INTRO_BATCH = 100

function sampleShots<T>(pool: T[], n: number): T[] {
  const out = pool.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out.slice(0, Math.min(n, out.length))
}

/** 游戏分区图标墙的条目 */
const GAME_ITEMS = GAME_ICONS.map((g) => ({ src: g.src, alt: g.name, title: g.name }))

/** 诗行 / 日期等短行不做首行缩进 */
const isShortLine = (p: string) => p.length <= 18

/**
 * 网格光晕：把指针位置写进 CSS 变量，由 .doc-mesh::after 的径向遮罩
 * 只显示光标附近的亮线，不触发 React 重渲染。
 */
function useMeshLight() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let raf = 0
    let px = 0
    let py = 0

    const apply = () => {
      el.style.setProperty('--mx', `${px}px`)
      el.style.setProperty('--my', `${py}px`)
      raf = 0
    }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      px = e.clientX - r.left
      py = e.clientY - r.top
      el.style.setProperty('--ml', '1')
      if (!raf) raf = requestAnimationFrame(apply)
    }

    const onLeave = () => el.style.setProperty('--ml', '0')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return ref
}

export default function DocView({ slot, slots, onHome, onPick }: Props) {
  const meshRef = useMeshLight()
  const docRef = useRef<HTMLDivElement>(null)
  const [light, setLight] = useState(false)
  const [storyId, setStoryId] = useState<string | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [mediaPage, setMediaPage] = useState<string | null>(null)
  const [trackId, setTrackId] = useState<string | null>(null)
  const [plActive, setPlActive] = useState<string | null>(null)
  const [plOpen, setPlOpen] = useState(false)
  const [gateOn, setGateOn] = useState(false)
  const [introOn, setIntroOn] = useState(false)
  const [introOut, setIntroOut] = useState(false)
  const [blackOn, setBlackOn] = useState(false)
  const gateTimers = useRef<number[]>([])
  const gateBusy = useRef(false)
  const index = slots.findIndex((s) => s.id === slot.id) + 1
  const introItems = useMemo(
    () => (index === 5 ? sampleShots(ANIME_ITEMS, INTRO_BATCH) : []),
    [index]
  )
  const isNovel = slot.id === NOVEL_SLOT_ID
  const story = storyId ? getNovelStory(storyId) : undefined
  const track = trackId ? UKULELE_TRACKS.find((t) => t.id === trackId) : undefined
  const catMeta = story ? NOVEL_CATEGORY_META[story.category] : undefined
  const catGroup = story
    ? NOVEL_CATEGORIES.find((c) => c.id === story.category)
    : undefined
  const storyNo =
    story && catGroup ? catGroup.stories.findIndex((s) => s.id === story.id) + 1 : 0

  // 切换分区时退出小说阅读态 / 子页面
  useEffect(() => {
    setStoryId(null)
    setMediaPage(null)
    setTrackId(null)
  }, [slot.id])

  const scrollTop = () => docRef.current?.scrollTo({ top: 0 })

  const openStory = (id: string) => {
    setStoryId(id)
    scrollTop()
  }

  const closeStory = () => {
    setStoryId(null)
    scrollTop()
  }

  // 文档内的跳页统一走一段开舱门：门开始裂开的瞬间换页，看起来是门后换场
  useEffect(() => {
    return () => gateTimers.current.forEach((t) => window.clearTimeout(t))
  }, [])

  // 追番分区：舱门 → 黑场缓入缓出 → 照片墙从黑暗中涌出（已加速，总时长 ≤5s）
  useEffect(() => {
    if (index !== 5) return
    setIntroOn(true)
    setBlackOn(true) // 门一开就在门后立刻沉入黑场，约 450ms 即纯黑，避免交接时照片墙抢先露脸
    const timers = [
      window.setTimeout(() => setBlackOn(false), 450), // 黑场已稳，缓出使照片墙浮现
      window.setTimeout(() => setIntroOut(true), 3600),
      window.setTimeout(() => setIntroOn(false), 4300)
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [index])

  const through = (swap: () => void) => {
    if (gateBusy.current) return
    gateBusy.current = true
    setGateOn(true)
    gateTimers.current.push(window.setTimeout(swap, 560))
    gateTimers.current.push(
      window.setTimeout(() => {
        setGateOn(false)
        gateBusy.current = false
      }, 1000)
    )
  }

  return (
    <div ref={docRef} className={`doc${light ? ' light' : ''}${index === 4 ? ' rain' : ''}`}>
      <div className="doc-mesh" aria-hidden="true" ref={meshRef} />

      {introOn && index === 5 ? (
        <div className={`game-intro${introOut ? ' out' : ''}`}>
          <ContactSheet
            items={introItems}
            count={100}
            speed={0.22}
            rush={0.78}
            blankArea={0.18}
            size={0.14}
            sizeVariance={0.35}
            radius={6}
            border={0.02}
            edgeFade={0.6}
            shadow={0.5}
            captions={false}
            draggable={false}
            wheel={false}
            backgroundColor={light ? '#faf9f6' : '#04070d'}
          />
        </div>
      ) : null}

      {index === 5 ? (
        <div className={`intro-black${blackOn ? ' on' : ''}`} aria-hidden="true" />
      ) : null}

      {index === 4 ? (
        <div className="game-rain" aria-hidden="true">
          <TerminalRain
            colors={light ? ['#a9702a', '#e3b96a'] : ['#3DFF8A', '#E8FFF0']}
            backgroundColor={light ? '#faf9f6' : '#04070d'}
            density={0.32}
            speed={0.65}
            trail={0.9}
            glow={light ? 0.1 : 0.2}
            intensity={light ? 0.8 : 0.95}
            angle={0}
            interactive={false}
          />
        </div>
      ) : null}

      <header className="doc-top">
        <div className="doc-brand">
          <span className="doc-brand-orb">
            <img
              className="doc-brand-logo"
              src={light ? '/images/logo-light.png' : '/images/logo-dark.png'}
              alt="胧月夜"
            />
          </span>
          <span className="doc-brand-text">
            <span className="doc-b1">胧月夜</span>
            <span className="doc-b2">群星观测站</span>
          </span>
        </div>

        <button className="doc-menu" type="button" onClick={onHome} aria-label="返回首页">
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
            <path
              d="M3.2 11.2 L12 3.6 L20.8 11.2"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="square"
            />
            <path
              d="M6.1 9.9 V20 H17.9 V9.9"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
            />
            <path
              d="M10.1 20 V14.6 H13.9 V20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
            />
          </svg>
        </button>
      </header>

      <main className="doc-sheet">
        <p className="doc-title">&gt;&gt; TITLE: {slot.label}</p>

        {isNovel && story ? (
          <article className="novel-page">
            <button
              className="novel-back"
              type="button"
              onClick={() =>
                through(() => {
                  closeStory()
                })
              }
            >
              ◂ 返回
            </button>

            <div className="doc-hero novel-hero">
              <div className="doc-art novel-cover">
                <img
                  className="novel-cover-img"
                  src={catMeta?.image}
                  alt={story.category}
                />
                <span className="doc-art-corner tl" aria-hidden="true" />
                <span className="doc-art-corner tr" aria-hidden="true" />
                <span className="doc-art-corner bl" aria-hidden="true" />
                <span className="doc-art-corner br" aria-hidden="true" />
                <span className="doc-art-bar" aria-hidden="true">
                  <i>星月集 · NOVEL</i>
                  <i>{story.category}</i>
                </span>
              </div>

              <aside
                className="novel-cover-card"
                style={{ '--cat-color': catMeta?.color } as CSSProperties}
              >
                <p className="novel-cover-kicker">&gt;&gt; 星月集 · 短篇档案</p>
                <p className="novel-cover-tag">[{story.category}]</p>
                <h3 className="novel-cover-title">《{story.title}》</h3>
                <p className="novel-cover-desc">{catMeta?.desc}</p>
                <div className="novel-cover-meta">
                  <p className="doc-mrow">
                    <span className="doc-k">&gt;&gt; 收录短篇</span>
                    <span className="doc-dots" />
                    <span className="doc-v">{catGroup?.stories.length ?? 0} 篇</span>
                  </p>
                  <p className="doc-mrow">
                    <span className="doc-k">&gt;&gt; 本篇序号</span>
                    <span className="doc-dots" />
                    <span className="doc-v">第 {storyNo} 篇</span>
                  </p>
                </div>
              </aside>
            </div>

            <div className="novel-body">
              {story.paragraphs.map((p, i) => (
                <p key={i} className={isShortLine(p) ? 'novel-line' : undefined}>
                  {p}
                </p>
              ))}
            </div>
          </article>
        ) : mediaPage === 'works' ? (
          track ? (
            <TrackPage
              track={track}
              onBack={() =>
                through(() => {
                  setTrackId(null)
                  scrollTop()
                })
              }
            />
          ) : (
            <WorksGallery
              onOpen={(id) =>
                through(() => {
                  setTrackId(id)
                  scrollTop()
                })
              }
              onBack={() =>
                through(() => {
                  setMediaPage(null)
                  scrollTop()
                })
              }
            />
          )
        ) : mediaPage === 'playlist' ? (
          <PlaylistPage
            active={plActive}
            onBack={() =>
              through(() => {
                setPlActive(null)
                scrollTop()
              })
            }
            onExit={() =>
              through(() => {
                setPlActive(null)
                setMediaPage(null)
                scrollTop()
              })
            }
          />
        ) : mediaPage ? (
          <article className="doc-blank">
            <button
              className="novel-back"
              type="button"
              onClick={() =>
                through(() => {
                  setMediaPage(null)
                  scrollTop()
                })
              }
            >
              ◂ 返回
            </button>
            <div className="doc-blank-body" aria-hidden="true" />
          </article>
        ) : (
          <>
            <div className="doc-hero">
              <div className="doc-art">
                <span className="doc-art-glow" />
                <span className="doc-art-grid" />
                {HERO[index - 1] ? (
                  <img
                    className={`doc-art-img${index === 2 ? ' art-right' : ''}${
                      index === 6 ? ' art-lower' : ''
                    }`}
                    src={HERO[index - 1]!}
                    alt={slot.label}
                  />
                ) : (
                  <span className="doc-art-figure">
                    <OrbBadge shape={index - 1} size={150} />
                  </span>
                )}
                <span className="doc-art-corner tl" aria-hidden="true" />
                <span className="doc-art-corner tr" aria-hidden="true" />
                <span className="doc-art-corner bl" aria-hidden="true" />
                <span className="doc-art-corner br" aria-hidden="true" />
                <span className="doc-art-bar" aria-hidden="true">
                  <i>档案 · ARCHIVE</i>
                  <i>SECTOR {index}</i>
                </span>
              </div>

              <div className="doc-brief">
                <p className="doc-para">{introFor(slot.id, slot.label)}</p>

                <div className="doc-meta">
                  <p className="doc-mrow">
                    <span className="doc-k">&gt;&gt; 世界</span>
                    <span className="doc-dots" />
                    <span className="doc-v">{WORLD[index - 1] ?? '——'}</span>
                  </p>
                  <p className="doc-mrow">
                    <span className="doc-k">&gt;&gt; 类型</span>
                    <span className="doc-dots" />
                    <span className="doc-v">{TYPE[index - 1] ?? '——'}</span>
                  </p>
                  <p className="doc-mrow">
                    <span className="doc-k">&gt;&gt; 扮演角色</span>
                    <span className="doc-dots" />
                    <span className="doc-v">{ROLE[index - 1] ?? '——'}</span>
                  </p>
                </div>

                <span className="doc-arrow" aria-hidden="true" />
              </div>
            </div>

            {index === 1 && <ResumeBlock />}

            {isNovel && (
              <>
                <div className="novel-landing">
                  <h3 className="novel-aw-title">{NOVEL_AFTERWORD.title}</h3>
                  {NOVEL_AFTERWORD.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className={`novel-para${isShortLine(p) ? ' novel-line' : ''}`}
                    >
                      {p}
                    </p>
                  ))}
                  <p className="novel-sign">{NOVEL_AFTERWORD.signature}</p>
                </div>
              </>
            )}

            {!isNovel && index === 3 && (
              <div className="music-stack">
                <MusicCard
                  image="/images/music/aria.jpg"
                  kicker=">> SIDE A · 空耳露娜"
                  title="空耳露娜的作品集"
                  note="空耳教学图片版·收录共计37首"
                  barLeft="空耳 · SORA"
                  barRight="SIDE A"
                  onOpen={() =>
                    through(() => {
                      setMediaPage('works')
                      scrollTop()
                    })
                  }
                />
                <MusicCard
                  image="/images/music/miku.jpg"
                  kicker=">> SIDE B · 歌单"
                  title="胧月夜の歌单"
                  note="粤语歌单+日语歌单+中文歌单+外语歌单"
                  barLeft="歌单 · PLAYLIST"
                  barRight="SIDE B"
                  onOpen={() =>
                    through(() => {
                      setMediaPage('playlist')
                      scrollTop()
                    })
                  }
                />
              </div>
            )}

            {!isNovel && index === 4 && (
              <div className="game-wall">
                <ConcaveCarousel
                  items={GAME_ITEMS}
                  aspect={1.08}
                  size={0.3}
                  curvature={0.34}
                  distance={4.4}
                  gap={20}
                  radius={18}
                  reflection={0.07}
                  dim={0.42}
                  autoplay="drift"
                  speed={0.1}
                  interval={4}
                  captions
                  controls
                  draggable
                  wheel={false}
                  backgroundColor="transparent"
                />
              </div>
            )}

            {!isNovel && index !== 1 && index !== 3 && index !== 4 && index !== 5 && index !== 6 && (
              <>
                <h2 className="doc-chapter">
                  <span className="doc-ch-mark" />
                  <span className="doc-ch-no">{index}</span>
                  <span className="doc-ch-text">{slot.label}</span>
                </h2>

                <p className="doc-body">黯淡的星尘缓慢推向帕维纳的天际线，最终沉入域中消失不见。</p>
              </>
            )}

            {!isNovel && index === 5 && <AnimeRank />}

            {!isNovel && index === 6 && <TravelSection light={light} onHome={onHome} />}
          </>
        )}
      </main>

      <aside className="doc-side">
        {slots.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`doc-side-item${s.id === slot.id ? ' on' : ''}`}
            onClick={() => onPick(s.id)}
          >
            {s.label}
          </button>
        ))}
      </aside>

      {isNovel && (
        <button
          className="doc-catalog"
          type="button"
          onClick={() => setCatalogOpen(true)}
          aria-label="打开小说目录"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M1.5 3h4.2l1.4 1.8h7.4V13.4h-13z" fill="none" stroke="currentColor" strokeWidth={1.3} />
          </svg>
          <span>目录</span>
        </button>
      )}

      {mediaPage === 'playlist' && !plActive && (
        <div className="pl-welcome">
          <div className="pl-art">
            <ParticleImage
              imageUrl="/images/music/welcome.jpg"
              particleCount={460000}
              particleSize={2.2}
              particleOpacity={0.95}
              speed={0.55}
              noiseScale={0.0005}
              noiseStrength={0.018}
              damping={0.96}
              lifespan={300}
              showImage={false}
              backgroundColor="#04070d"
              cursorInteraction
              cursorRadius={120}
              dpr={1.6}
            />
            <span className="pl-art-frame" aria-hidden="true" />
          </div>

          <div className="pl-lines">
            <p>欢迎来到胧月夜の歌单！</p>
            <p>天天都要开开心心的噢！</p>
            <p>- 点击左下角目录浏览歌单 -</p>
          </div>
        </div>
      )}

      {mediaPage === 'playlist' && (
        <button
          className="doc-catalog"
          type="button"
          onClick={() => setPlOpen(true)}
          aria-label="打开歌单目录"
        >
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M1.5 3h4.2l1.4 1.8h7.4V13.4h-13z" fill="none" stroke="currentColor" strokeWidth={1.3} />
          </svg>
          <span>目录</span>
        </button>
      )}

      {plOpen && mediaPage === 'playlist' ? (
        <div className="plc" role="dialog" aria-label="歌单目录">
          <div className="plc-panel">
            <div className="plc-top">
              <span>歌单目录</span>
              <button className="plc-close" type="button" onClick={() => setPlOpen(false)} aria-label="关闭">
                ×
              </button>
            </div>
            <div className="plc-body">
              {PLAYLISTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`plc-row${p.id === plActive ? ' on' : ''}`}
                  onClick={() => {
                    setPlOpen(false)
                    through(() => {
                      setPlActive(p.id)
                      scrollTop()
                    })
                  }}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path d="M1.5 3h4.2l1.4 1.8h7.4V13.4h-13z" fill="currentColor" />
                  </svg>
                  <span className="plc-label">{p.label}</span>
                  <span className="plc-n">{p.items.length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {gateOn ? (
        <div className="doc-gate" aria-hidden="true">
          <VaultTransition duration={1000} />
        </div>
      ) : null}

      <NovelCatalog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onOpenStory={(id) => {
          setCatalogOpen(false)
          through(() => {
            openStory(id)
          })
        }}
      />

      <button
        className="doc-bright"
        type="button"
        aria-label={light ? '切换到暗色' : '切换到亮色'}
        aria-pressed={light}
        onClick={() => setLight((v) => !v)}
      >
        {light ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth={1.5} />
            <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4" />
              <path d="M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7" />
            </g>
          </svg>
        )}
      </button>

    </div>
  )
}
