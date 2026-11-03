export default function CockpitFrame() {
  return (
    <div className="cockpit" aria-hidden="true">
      <svg
        className="cockpit-svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <g
          fill="none"
          stroke="#ffffff"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d="M22 700 L 22 852" strokeWidth={2.4} strokeOpacity={0.34} />
          <path d="M34 700 L 34 852" strokeWidth={1.2} strokeOpacity={0.2} />

          <path d="M956 10 L 956 30" strokeWidth={3} strokeOpacity={0.55} />
          <path d="M1048 10 L 1048 24" strokeWidth={1.6} strokeOpacity={0.32} />
        </g>
      </svg>

      <span className="cockpit-drag left">DRAG</span>
      <span className="cockpit-drag right">DRAG</span>
    </div>
  )
}
