import { lazy, Suspense, useState } from 'react'
import type { MetricSlot } from '../data/sections'
import type { AstralShellProps } from './AstralShell'

// 陀螺仪光环 / 启动球是 R3F 渲染的。首屏不该为此把 three + r3f 拉进
// index.html 的 modulepreload；启动仪式盖住全屏，按需加载不会露出空档。
const AstralShell = lazy(() => import('./AstralShell'))

function LazyShell(props: AstralShellProps) {
  return (
    <Suspense fallback={null}>
      <AstralShell {...props} />
    </Suspense>
  )
}
import HudChip from './HudChip'
import InstructionsModal from './InstructionsModal'
import { useClock } from '../hooks/useClock'

type Props = {
  metrics: MetricSlot[]
  brand: string
  onConsole: () => void
}

const LINKS = [
  {
    id: 'bilibili',
    label: 'bilibili',
    href: 'https://b23.tv/MlxpGKj',
    icon: '/icons/bilibili.svg'
  },
  {
    id: 'xhs',
    label: '小红书',
    href: 'https://xhslink.cn/o/8hpmaBOjA1w',
    icon: '/icons/xiaohongshu.svg'
  },
  {
    id: 'douyin',
    label: '抖音',
    href: 'https://v.douyin.com/KVe73EhuKEo/',
    icon: '/icons/tiktok.svg'
  }
]

export default function BottomHud({ metrics, brand, onConsole }: Props) {
  const [manual, setManual] = useState(false)
  // 时钟放在这里：每秒只重渲染本组件，不再拖着整个 App 树一起更新
  const { dateText, timeText } = useClock()

  return (
    <div className="hud">
      {/* 底部导航线 */}
      <nav className="hud-nav" aria-hidden="true">
        <span className="hud-nav-side left">
          <svg viewBox="0 0 600 30" preserveAspectRatio="none">
            <defs>
              <linearGradient id="navFadeL" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(206,228,248,0.18)" />
                <stop offset="0.3" stopColor="rgba(206,228,248,0.6)" />
                <stop offset="1" stopColor="rgba(206,228,248,0.6)" />
              </linearGradient>
            </defs>
            <path
              d="M0 19 H318 L332 10 H384 L398 19 H600"
              fill="none"
              stroke="url(#navFadeL)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M2 19 H36"
              stroke="rgba(232,244,255,0.92)"
              strokeWidth={3.4}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </span>
        <span className="hud-nav-side right">
          <svg viewBox="0 0 600 30" preserveAspectRatio="none">
            <defs>
              <linearGradient id="navFadeR" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(206,228,248,0.18)" />
                <stop offset="0.3" stopColor="rgba(206,228,248,0.6)" />
                <stop offset="1" stopColor="rgba(206,228,248,0.6)" />
              </linearGradient>
            </defs>
            <path
              d="M0 19 H318 L332 10 H384 L398 19 H600"
              fill="none"
              stroke="url(#navFadeR)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M2 19 H36"
              stroke="rgba(232,244,255,0.92)"
              strokeWidth={3.4}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </span>
        <span className="hud-nav-ring" />
        <span className="hud-nav-label">CONSOLE</span>
      </nav>

      {/* 左：陀螺仪光环 + 指标 + 三个仪表块 */}
      <div className="hud-station hud-station-left">
        <div className="hud-top">
          <div className="hud-orbit">
            <LazyShell
              backgroundColor="transparent"
              colors={['#DCEBFF', '#FFFFFF']}
              nodes={760}
              connections={3}
              reach={0.24}
              clustering={0.82}
              chords={0.22}
              radius={0.42}
              lineOpacity={0.62}
              nodeSize={0.95}
              depthFade={0.6}
              spin={0.6}
              tilt={14}
              interactive
              hoverRadius={0.26}
              hoverBoost={0.8}
              clickPulse={false}
              dpr={1.5}
            />
          </div>
          <div className="hud-metrics">
            {metrics.map((m) => (
              <div key={m.id} className="hud-row">
                <span className="hud-lbl">{m.label}</span>
                <span className="hud-track">
                  <i style={{ width: `${m.value}%` }} />
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-chips">
          <HudChip variant={0} speed={2.9} />
          <HudChip variant={1} speed={3.4} delay={-1.2} />
          <HudChip variant={2} speed={2.6} delay={-2.1} />
        </div>
      </div>

      {/* 左中：时间 / 日期 / 站点名 */}
      <div className="hud-clock">
        <span className="hud-clock-date">
          <i className="hud-dot" />
          <span className="hud-clock-brand">{brand}</span>
          {dateText}
        </span>
        <span className="hud-clock-time">{timeText}</span>
      </div>

      {/* 中间：启动球 */}
      <button
        className="hud-unit hud-console"
        type="button"
        aria-label="CONSOLE"
        onClick={onConsole}
      >
        <span className="hud-ball">
          <LazyShell
            backgroundColor="transparent"
            colors={['#8FB8E8', '#EAF6FF']}
            nodes={1200}
            connections={3}
            reach={0.22}
            clustering={0.8}
            chords={0.25}
            radius={0.44}
            originY={0.5}
            lineOpacity={0.5}
            nodeSize={0.85}
            depthFade={0.72}
            spin={0.8}
            tilt={16}
            interactive
            hoverRadius={0.24}
            hoverBoost={0.9}
            clickPulse
            pulseSpeed={1.1}
            dpr={1.6}
          />
        </span>
        <span className="hud-console-launch" aria-hidden="true">-啟動-</span>
      </button>

      {/* 右中：题句 + 外部链接图标 */}
      <div className="hud-social-wrap">
        <p className="hud-social-line">朦胧春月夜，美景世无双。</p>
        <div className="hud-social">
          {LINKS.map((l) => (
            <a
              key={l.id}
              className="hud-social-item"
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={l.label}
            >
              <img src={l.icon} alt="" width={18} height={18} />
              <span>{l.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* 右：说明 + 三个仪表块 */}
      <div className="hud-station hud-station-right">
        <button className="hud-help" type="button" onClick={() => setManual(true)}>
          <span className="hud-help-text">
            <span className="hud-help-title">需要帮助？</span>
            <span className="hud-help-dots" aria-hidden="true" />
            <span className="hud-help-sub">查看操作说明</span>
          </span>
        </button>

        <div className="hud-chips">
          <HudChip variant={2} speed={2.7} />
          <HudChip variant={1} speed={3.2} delay={-0.9} />
          <HudChip variant={0} speed={2.5} delay={-1.8} />
        </div>
      </div>

      <InstructionsModal open={manual} onClose={() => setManual(false)} />
    </div>
  )
}
