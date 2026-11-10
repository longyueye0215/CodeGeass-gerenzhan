import ParticleImage from './ParticleImage'
import { isMobileMode } from '../hooks/useDeviceMode'

type Props = {
  image: string
  kicker: string
  title: string
  note: string
  barLeft: string
  barRight: string
  onOpen: () => void
}

/**
 * 音乐分区的展示卡：左侧是粒子重构的动态插画，右侧是标题与跳转按钮。
 * 版式对齐档案区的「图 + 简介面板」，两张卡之间留一个背景网格方块的距离。
 */
export default function MusicCard({
  image,
  kicker,
  title,
  note,
  barLeft,
  barRight,
  onOpen
}: Props) {
  const mobile = isMobileMode()

  return (
    <article className="music-card">
      <div className="music-art">
        <ParticleImage
          imageUrl={image}
          particleCount={mobile ? 110000 : 160000}
          particleSize={mobile ? 1.8 : 2}
          particleOpacity={0.92}
          speed={mobile ? 0.6 : 0.85}
          noiseScale={0.0006}
          noiseStrength={0.05}
          damping={0.95}
          lifespan={mobile ? 160 : 240}
          showImage={false}
          backgroundColor="#04070d"
          cursorInteraction={!mobile}
          cursorRadius={110}
          dpr={mobile ? 1 : 1.6}
        />
        <span className="doc-art-corner tl" aria-hidden="true" />
        <span className="doc-art-corner tr" aria-hidden="true" />
        <span className="doc-art-corner bl" aria-hidden="true" />
        <span className="doc-art-corner br" aria-hidden="true" />
        <span className="doc-art-bar" aria-hidden="true">
          <i>{barLeft}</i>
          <i>{barRight}</i>
        </span>
      </div>

      <div className="music-info">
        <p className="music-kicker">{kicker}</p>
        <h3 className="music-title">{title}</h3>
        <p className="music-note">{note}</p>
        <button className="music-go" type="button" onClick={onOpen}>
          <span>进入</span>
          <i className="music-go-dot" />
        </button>
      </div>
    </article>
  )
}
