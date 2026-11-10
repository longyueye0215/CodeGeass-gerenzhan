import ReactDOM from 'react-dom/client'
import App from './App'
import { applyMode, detectMode } from './hooks/useDeviceMode'
import { initPreviewBridge } from './lib/previewBridge'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/hud.css'
import './styles/panel.css'
import './styles/doc.css'
import './styles/mobile.css'

applyMode(detectMode())
// 只在被 /preview/ 外壳嵌入时激活，普通访客零开销
initPreviewBridge()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)

// 生产环境注册离线缓存层。?nosw=1 可一键绕过，用于排查缓存问题。
if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  !new URLSearchParams(window.location.search).has('nosw')
) {
  window.addEventListener(
    'load',
    () => {
      void navigator.serviceWorker.register(`/sw.js?v=${__BUILD_ID__}`).catch(() => {})
    },
    { once: true }
  )
}
