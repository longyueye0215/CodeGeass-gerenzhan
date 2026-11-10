import { useMemo } from 'react'
import AstralShell from './AstralShell'
import { isMobileMode } from '../hooks/useDeviceMode'

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(20261029)

/** 竖屏把二进制矩阵的 DOM 节点从 736 降到 220 */
function makeMatrix(rows: number, cols: number) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (rand() > 0.5 ? '1' : '0'))
  )
}

export default function LoadingScreen() {
  const mobile = isMobileMode()
  const matrix = useMemo(() => makeMatrix(mobile ? 10 : 16, mobile ? 22 : 46), [mobile])
  const coils = useMemo(
    () => Array.from({ length: mobile ? 12 : 18 }, (_, i) => i),
    [mobile]
  )

  return (
    <div className="loading" aria-live="polite">
      <div className="loading-matrix" aria-hidden="true">
        {matrix.map((row, ri) => (
          <p key={ri}>
            {row.map((b, ci) => (
              <span key={ci}>{b}</span>
            ))}
          </p>
        ))}
      </div>

      <div className="loading-core">
        <AstralShell
          className="loading-disc"
          backgroundColor="transparent"
          colors={['#DCEBFF', '#FFFFFF']}
          nodes={mobile ? 520 : 820}
          connections={mobile ? 2 : 3}
          reach={0.24}
          clustering={0.82}
          chords={0.22}
          radius={0.42}
          lineOpacity={0.72}
          nodeSize={1}
          depthFade={0.55}
          spin={1.5}
          tilt={12}
          interactive={false}
          clickPulse={false}
          dpr={mobile ? 1 : 1.5}
        />

        <p className="loading-name">GRAND-STARRS-RAY</p>

        <div className="loading-bar">
          <div className="loading-coil" aria-hidden="true">
            {coils.map((c) => (
              <i key={c} style={{ animationDelay: `${c * (mobile ? 0.06 : 0.08)}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
