type Props = {
  variant: 0 | 1 | 2
  size?: number
  /** 指针摆动周期（秒） */
  speed?: number
  delay?: number
}

/** 方框 + 四角括号 + 边缘点线，内部是带指针的仪表图形 */
export default function HudChip({ variant, size = 54, speed = 4.2, delay = 0 }: Props) {
  const s = size
  return (
    <span
      className="hudchip"
      style={{ width: s, height: s }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={s} height={s}>
        {/* 四角括号 */}
        <g stroke="rgba(226, 240, 255, 0.92)" strokeWidth={1.4} fill="none">
          <path d="M3 14 L3 3 L14 3" />
          <path d="M50 3 L61 3 L61 14" />
          <path d="M61 50 L61 61 L50 61" />
          <path d="M14 61 L3 61 L3 50" />
        </g>
        {/* 边缘点线 */}
        <g stroke="rgba(200, 226, 250, 0.45)" strokeWidth={1} strokeDasharray="1 3">
          <path d="M18 3 L46 3" />
          <path d="M61 18 L61 46" />
          <path d="M46 61 L18 61" />
          <path d="M3 46 L3 18" />
        </g>

        <g
          className="hudchip-glyph"
          style={{ animationDuration: `${speed}s`, animationDelay: `${delay}s` }}
        >
          {variant === 0 && (
            <>
              <rect
                x="24"
                y="24"
                width="16"
                height="16"
                fill="none"
                stroke="rgba(238, 247, 255, 0.95)"
                strokeWidth={1.2}
                transform="rotate(45 32 32)"
              />
              <line
                x1="14"
                y1="50"
                x2="50"
                y2="14"
                stroke="rgba(238, 247, 255, 0.85)"
                strokeWidth={1.2}
              />
              <circle cx="32" cy="32" r="1.8" fill="#ffffff" />
            </>
          )}

          {variant === 1 && (
            <>
              <g stroke="rgba(238, 247, 255, 0.9)" strokeWidth={1.3}>
                <line x1="32" y1="20" x2="32" y2="44" />
                <line x1="20" y1="32" x2="44" y2="32" />
                <line x1="24" y1="24" x2="18" y2="18" strokeDasharray="2 3" />
                <line x1="40" y1="24" x2="46" y2="18" strokeDasharray="2 3" />
                <line x1="24" y1="40" x2="18" y2="46" strokeDasharray="2 3" />
                <line x1="40" y1="40" x2="46" y2="46" strokeDasharray="2 3" />
              </g>
              <circle cx="22" cy="21" r="1.6" fill="#ffffff" />
            </>
          )}

          {variant === 2 && (
            <>
              <circle
                cx="32"
                cy="32"
                r="9"
                fill="none"
                stroke="rgba(238, 247, 255, 0.92)"
                strokeWidth={1.3}
              />
              <circle cx="32" cy="32" r="2.6" fill="rgba(238, 247, 255, 0.95)" />
              <g stroke="rgba(238, 247, 255, 0.6)" strokeWidth={1} strokeDasharray="2 3">
                <line x1="14" y1="32" x2="19" y2="32" />
                <line x1="45" y1="32" x2="50" y2="32" />
              </g>
            </>
          )}
        </g>
      </svg>
    </span>
  )
}
