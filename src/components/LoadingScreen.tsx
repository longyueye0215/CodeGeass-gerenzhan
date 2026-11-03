import AstralShell from './AstralShell'

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
const ROWS = 16
const COLS = 46

const MATRIX = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => (rand() > 0.5 ? '1' : '0'))
)

const COILS = Array.from({ length: 18 }, (_, i) => i)

export default function LoadingScreen() {
  return (
    <div className="loading" aria-live="polite">
      <div className="loading-matrix" aria-hidden="true">
        {MATRIX.map((row, ri) => (
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
          nodes={820}
          connections={3}
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
          dpr={1.5}
        />

        <p className="loading-name">GRAND-STARRS-RAY</p>

        <div className="loading-bar">
          <div className="loading-coil" aria-hidden="true">
            {COILS.map((c) => (
              <i key={c} style={{ animationDelay: `${c * 0.08}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
