import { useEffect, useState } from 'react'
import CipherReveal from './CipherReveal'

type Props = {
  brand: string
  english: string
  onDone: () => void
}

/**
 * 载入首屏：纯黑底 + 诏文式解密动画。
 * 主标题完全显形后短暂停顿，再淡出交给开屏首页。
 */
export default function IntroSplash({ brand, english, onDone }: Props) {
  const [typed, setTyped] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!typed) return
    const hold = window.setTimeout(() => setLeaving(true), 520)
    const finish = window.setTimeout(onDone, 520 + 480)
    return () => {
      window.clearTimeout(hold)
      window.clearTimeout(finish)
    }
  }, [typed, onDone])

  return (
    <div className={`intro${leaving ? ' out' : ''}`} aria-hidden="true">
      <div className="intro-core">
        <CipherReveal
          as="div"
          className="intro-brand"
          text={brand}
          fontSize="clamp(1.5rem, 3.4vw, 2.9rem)"
          fontWeight={400}
          letterSpacing="0.14em"
          align="center"
          color="#eaf3ff"
          scrambleColor="#7fd4ff"
          scrambleOpacity={0.55}
          charset="auto"
          trigger="mount"
          order="center"
          from="blank"
          duration={1.5}
          scramble={0.5}
          rate={16}
          hover="none"
          onComplete={() => setTyped(true)}
        />
        <span className={`intro-en${typed ? ' on' : ''}`}>{english}</span>
      </div>
    </div>
  )
}
