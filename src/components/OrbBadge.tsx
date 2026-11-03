type Props = { shape?: number; size?: number }

const TICKS = Array.from({ length: 12 }, (_, i) => i)
const RAYS = Array.from({ length: 8 }, (_, i) => i)

export default function OrbBadge({ shape = 0, size = 240 }: Props) {
  return (
    <svg
      className="orb-badge"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="#e9f5ff"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="100" cy="100" r="94" strokeWidth={1.1} strokeOpacity={0.7} />
        <circle
          cx="100"
          cy="100"
          r="85"
          strokeWidth={0.6}
          strokeOpacity={0.3}
          strokeDasharray="1 5"
        />

        {shape === 0 && (
          <g strokeWidth={1.9} strokeOpacity={0.92}>
            <path d="M64 84 C 78 76, 92 78, 100 87 C 108 78, 122 76, 136 84 L 136 124 C 122 116, 108 118, 100 127 C 92 118, 78 116, 64 124 Z" />
            <path d="M100 87 L 100 127" strokeOpacity={0.6} />
            <path d="M100 56 L 109 67 L 100 78 L 91 67 Z" strokeWidth={1.5} />
            <path
              d="M82 137 L 82 148 M 100 137 L 100 148 M 118 137 L 118 148"
              strokeWidth={1.4}
              strokeOpacity={0.7}
            />
            <path
              d="M52 100 L 64 100 M 136 100 L 148 100"
              strokeWidth={1.2}
              strokeOpacity={0.45}
            />
          </g>
        )}

        {shape === 1 && (
          <g strokeWidth={1.8} strokeOpacity={0.92}>
            <circle cx="86" cy="93" r="27" />
            <circle cx="115" cy="108" r="27" />
            <path
              d="M56 62 C 72 48, 90 49, 99 60"
              strokeWidth={1.3}
              strokeOpacity={0.55}
            />
            <path
              d="M144 139 C 128 153, 110 152, 101 141"
              strokeWidth={1.3}
              strokeOpacity={0.55}
            />
            <path
              d="M74 143 L 62 152 M 126 58 L 138 49"
              strokeWidth={1.2}
              strokeOpacity={0.4}
            />
          </g>
        )}

        {shape === 2 && (
          <g strokeWidth={1.6} strokeOpacity={0.9}>
            <circle cx="100" cy="100" r="30" />
            <ellipse cx="100" cy="100" rx="12" ry="30" strokeOpacity={0.7} />
            <path d="M70 100 L 130 100" strokeOpacity={0.7} />
            <path d="M74 84 Q 100 92 126 84" strokeOpacity={0.55} />
            <path d="M74 116 Q 100 108 126 116" strokeOpacity={0.55} />
            <g strokeWidth={1.4} strokeOpacity={0.72}>
              {RAYS.map((r) => (
                <line
                  key={r}
                  x1="100"
                  y1="52"
                  x2="100"
                  y2="62"
                  transform={`rotate(${r * 45} 100 100)`}
                />
              ))}
            </g>
          </g>
        )}

        {shape === 3 && (
          <g strokeWidth={1.5} strokeOpacity={0.9}>
            <path
              d="M100 64 L 134 88 L 124 130 L 84 137 L 66 102 Z"
              strokeOpacity={0.6}
            />
            <path d="M100 64 L 100 100 L 124 130" strokeOpacity={0.32} />
            <path d="M66 102 L 84 137" strokeOpacity={0.32} />
          </g>
        )}

        {shape === 4 && (
          <g strokeWidth={1.4} strokeOpacity={0.9}>
            <circle cx="100" cy="100" r="78" strokeWidth={0.9} strokeOpacity={0.45} />
            <circle
              cx="100"
              cy="100"
              r="64"
              strokeWidth={0.8}
              strokeOpacity={0.45}
              strokeDasharray="2 6"
            />
            <g strokeWidth={1.2}>
              {TICKS.map((t) => (
                <line
                  key={t}
                  x1="100"
                  y1="18"
                  x2="100"
                  y2={t % 3 === 0 ? 30 : 24}
                  transform={`rotate(${t * 30} 100 100)`}
                  strokeOpacity={t % 3 === 0 ? 0.62 : 0.26}
                />
              ))}
            </g>
            <circle cx="100" cy="100" r="34" strokeWidth={1.2} strokeOpacity={0.75} />
            <path
              d="M100 66 A 34 34 0 0 1 100 134 A 20 34 0 0 0 100 66 Z"
              fill="#e9f5ff"
              fillOpacity={0.16}
              stroke="none"
            />
            <line x1="100" y1="54" x2="100" y2="146" strokeWidth={0.8} strokeOpacity={0.35} />
            <line x1="54" y1="100" x2="146" y2="100" strokeWidth={0.8} strokeOpacity={0.35} />
            <circle cx="100" cy="100" r="4" fill="#e9f5ff" fillOpacity={0.9} stroke="none" />
          </g>
        )}

        <g fill="#e9f5ff">
          {shape === 0 && <circle cx="100" cy="67" r="2.4" />}

          {shape === 1 && <circle cx="100" cy="100" r="5" />}

          {shape === 3 && (
            <>
              <circle cx="100" cy="64" r="3.6" />
              <circle cx="134" cy="88" r="2.6" />
              <circle cx="124" cy="130" r="2.8" />
              <circle cx="84" cy="137" r="2.2" />
              <circle cx="66" cy="102" r="2.6" />
              <circle cx="100" cy="100" r="2" />
            </>
          )}

          {shape === 4 && (
            <>
              <circle cx="100" cy="34" r="2.6" />
              <circle cx="166" cy="100" r="2" />
              <circle cx="100" cy="166" r="2" />
              <circle cx="34" cy="100" r="2" />
            </>
          )}
        </g>
      </g>
    </svg>
  )
}
