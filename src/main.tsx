import ReactDOM from 'react-dom/client'
import App from './App'
import { applyMode, detectMode } from './hooks/useDeviceMode'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'
import './styles/hud.css'
import './styles/panel.css'
import './styles/doc.css'
import './styles/mobile.css'

applyMode(detectMode())

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
