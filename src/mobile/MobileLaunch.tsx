import { lazy, Suspense } from 'react'
import type { AstralShellProps } from '../components/AstralShell'
import { siteMeta } from '../data/sections'

/**
 * 启动球用 R3F 渲染：保持与 PC 首页 BottomHud 一致的「懒加载」策略，
 * 不让 three / r3f 进入 index.html 的 modulepreload。
 */
const AstralShell = lazy(() => import('../components/AstralShell'))

function LazyBall(props: AstralShellProps) {
  return (
    <Suspense fallback={null}>
      <AstralShell {...props} />
    </Suspense>
  )
}

export const SITE_LINKS = [
  { label: 'bilibili', href: 'https://b23.tv/MlxpGKj' },
  { label: '小红书', href: 'https://xhslink.cn/o/8hpmaBOjA1w' },
  { label: '抖音', href: 'https://v.douyin.com/KVe73EhuKEo/' }
]

type Props = {
  onLaunch: () => void
}

/**
 * 手机端启动界面：对齐 PC 首页的视觉（月球星空底图 + 网格启动球 + 底部 HUD），
 * 但按竖屏重排为「品牌 / 月球+启动球 / 时钟外链」三层。
 * 点击启动球才放行到分区选择界面 —— 与 PC 点击「-啟動-」进控制台同构。
 */
export default function MobileLaunch({ onLaunch }: Props) {
  return (
    <div className="ml-root">
      {/* 与 PC Backdrop 同一张素材：星空、月球、蓝色光环、刻度、山脊都在图里 */}
      <div className="ml-photo" aria-hidden="true" />
      <div className="ml-veil" aria-hidden="true" />

      <span className="ml-corner tl" aria-hidden="true" />
      <span className="ml-corner tr" aria-hidden="true" />
      <span className="ml-corner bl" aria-hidden="true" />
      <span className="ml-corner br" aria-hidden="true" />

      <header className="ml-head">
        <p className="ml-en">GRAND-STARRS-RAY</p>
        <h1 className="ml-brand">{siteMeta.brand}</h1>
        <p className="ml-sub">群星观测站</p>
      </header>

      <div className="ml-stage">
        <span className="ml-orbit" aria-hidden="true" />
        <button
          className="ml-ball"
          type="button"
          onClick={onLaunch}
          aria-label="启动，进入分区选择"
        >
          <LazyBall
            className="ml-ball-shell"
            backgroundColor="transparent"
            colors={['#8FB8E8', '#EAF6FF']}
            nodes={520}
            connections={2}
            reach={0.22}
            clustering={0.8}
            chords={0.25}
            radius={0.44}
            lineOpacity={0.62}
            nodeSize={0.95}
            depthFade={0.66}
            spin={0.8}
            tilt={16}
            interactive={false}
            clickPulse={false}
            dpr={1}
          />
          <span className="ml-ball-core" aria-hidden="true" />
          <span className="ml-launch-label" aria-hidden="true">- 啟動 -</span>
        </button>
        <p className="ml-hint">点击启动球 · 进入星域</p>
      </div>

      <footer className="ml-foot">
        <p className="ml-verse">朦胧春月夜，美景世无双。</p>
      </footer>
    </div>
  )
}
