import { useEffect, useState } from 'react'

export function useClock() {
  const [dateText, setDateText] = useState('----/--/--')
  const [timeText, setTimeText] = useState('--:--:--')

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0')

    const tick = () => {
      const d = new Date()
      setDateText(
        `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
      )
      setTimeText(
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      )
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return { dateText, timeText }
}
