/**
 * 预览桥（站点侧运行时）
 * ────────────────────────────────────────────────────────────
 * 只在「被 /preview/ 外壳以 iframe 嵌入」时激活，普通访客零开销。
 * 协议（双向，均校验 origin 与 source）：
 *   外壳 → 站点：navigate / theme / reload / clear-cache / ping
 *   站点 → 外壳：ready / state（路由、主题、预热进度、chunk 状态）
 */
import { getWarmState, subscribeWarm } from './prewarm'
import { emitSiteCommand, siteState, SITE_STATE_EVENT } from './siteBus'

const FROM_HOST = 'lunar-preview'
const FROM_SITE = 'lunar-site'

interface HostMessage {
  source: string
  type: 'navigate' | 'theme' | 'reload' | 'clear-cache' | 'ping'
  payload?: { section?: string | null; theme?: 'light' | 'dark' }
}

async function clearCaches() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    // 不注销 Service Worker：只清内容，下一帧就会重新填充
  } catch {
    /* 忽略权限错误 */
  }
}

export function initPreviewBridge() {
  if (window.parent === window) return // 顶层访问不启用
  const origin = window.location.origin
  const send = (type: 'ready' | 'state', payload?: unknown) => {
    window.parent.postMessage({ source: FROM_SITE, type, payload }, origin)
  }

  const report = () => {
    send('state', {
      ...siteState,
      prewarm: getWarmState(),
      href: window.location.href,
      timestamp: Math.round(performance.now())
    })
  }

  window.addEventListener('message', (e: MessageEvent<HostMessage>) => {
    if (e.origin !== origin || !e.data || e.data.source !== FROM_HOST) return
    const d = e.data
    switch (d.type) {
      case 'navigate':
        emitSiteCommand({
          section: d.payload?.section ?? null,
          home: !d.payload?.section
        })
        break
      case 'theme':
        if (d.payload?.theme) emitSiteCommand({ theme: d.payload.theme })
        break
      case 'reload':
        window.location.reload()
        break
      case 'clear-cache':
        void clearCaches().then(() => window.location.reload())
        break
      case 'ping':
        report()
        break
    }
  })

  const off = subscribeWarm(report)
  window.addEventListener(SITE_STATE_EVENT, report)
  window.addEventListener('load', report)
  window.addEventListener('beforeunload', off)

  send('ready')
  report()
}
