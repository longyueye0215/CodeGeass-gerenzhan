import { useRef, useState } from 'react'

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

export function usePan() {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const lastDrag = useRef(0)
  const start = useRef({ x: 0, y: 0, px: 0, py: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    setDragging(true)
    start.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.current.x
      const dy = ev.clientY - start.current.y
      if (Math.hypot(dx, dy) > 6) lastDrag.current = Date.now()
      // 底图放大到 1.12 后横向余量约 100px，纵向约 53px
      setPan({
        x: clamp(start.current.px + dx, -70, 70),
        y: clamp(start.current.py + dy, -46, 46)
      })
    }

    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerup', onUp)
  }

  return { pan, dragging, lastDrag, onPointerDown }
}
