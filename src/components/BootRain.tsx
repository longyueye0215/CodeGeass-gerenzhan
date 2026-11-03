import TerminalRain from './TerminalRain'

type Props = {
  /** 与 CSS 动画时长保持一致 */
  duration?: number
}

/** 点击「-啟動-」后、控制台打开前的字符雨启动动画 */
export default function BootRain({ duration = 2000 }: Props) {
  return (
    <div
      className="boot-rain"
      aria-hidden="true"
      style={{ '--boot-ms': `${duration}ms` } as React.CSSProperties}
    >
      <TerminalRain
        colors={['#8FC7F0', '#FFFFFF']}
        backgroundColor="#04070d"
        glyphs="01"
        angle={0}
        density={0.52}
        speed={1.15}
        trail={18}
        variance={0.45}
        glow={0.26}
        intensity={1}
        interactive={false}
        clickBurst={false}
        quality={0.9}
      />
    </div>
  )
}
