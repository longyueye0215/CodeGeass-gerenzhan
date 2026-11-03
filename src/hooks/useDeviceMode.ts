import { useEffect, useState } from 'react'

export type DeviceMode = 'mobile' | 'desktop'

/** 手机/平板 UA；桌面浏览器缩窄窗口不会被误判 */
const MOBILE_UA = /Android|iPhone|iPod|iPad|Mobile|HarmonyOS|MiuiBrowser|MicroMessenger|Phone/i

/** 窄屏 + 无 hover + 粗指针，兜住把 UA 伪装成桌面的手机 */
export function detectMode(): DeviceMode {
  if (typeof window === 'undefined') return 'desktop'
  // 调试用：PC 上访问 ?mode=mobile 可直接看手机版（正常访问不受影响）
  const forced = new URLSearchParams(window.location.search).get('mode')
  if (forced === 'mobile' || forced === 'desktop') return forced
  const ua = navigator.userAgent || ''
  if (MOBILE_UA.test(ua)) return 'mobile'
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const noHover = window.matchMedia?.('(hover: none)').matches ?? false
  return coarse && noHover && window.innerWidth <= 834 ? 'mobile' : 'desktop'
}

export function applyMode(mode: DeviceMode) {
  const el = document.documentElement
  el.dataset.mode = mode
  el.classList.toggle('is-mobile', mode === 'mobile')
}

/**
 * 手机端与 PC 端是两套独立界面：这里只在「跨过判定阈值」时才切换，
 * 避免手机地址栏收放导致布局反复重挂。
 */
export function useDeviceMode(): DeviceMode {
  const [mode, setMode] = useState<DeviceMode>(detectMode)

  useEffect(() => {
    applyMode(mode)
    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const next = detectMode()
        if (next !== mode) setMode(next)
      })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [mode])

  return mode
}
