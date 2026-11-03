/** 打开游戏分区，看图标墙 */
import { writeFileSync, mkdirSync } from 'node:fs'
const PORT = 9333, HTTP = `http://127.0.0.1:${PORT}`
mkdirSync('C:/Users/MR/WorkBuddy/个人站-react/.shots', { recursive: true })
const ver = await (await fetch(`${HTTP}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pending = new Map(); const errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); return }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push((m.params.args||[]).map(a=>String(a.value??a.description??'')).join(' ').slice(0,160))
}
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const ev = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId)
await ev(`location.href = "http://127.0.0.1:4400/"`)
await new Promise((r) => setTimeout(r, 6000))
const out = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600)
  byText('button', '啟動').click()
  await sleep(2200)
  ;[...document.querySelectorAll('.panel-node')].find(n => (n.textContent||'').includes('游戏')).click()
  await sleep(400)
  byText('.panel button', '登入').click()
  await sleep(5000)
  const wall = document.querySelector('.game-wall')
  const cv = document.querySelector('.cc-root canvas')
  return {
    wall: wall ? { h: Math.round(wall.getBoundingClientRect().height), w: Math.round(wall.getBoundingClientRect().width) } : null,
    canvas: cv ? cv.width + 'x' + cv.height : null,
    chapter: !!document.querySelector('.doc-chapter'),
    body: !!document.querySelector('.doc-body')
  }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
writeFileSync('C:/Users/MR/WorkBuddy/个人站-react/.shots/games1.jpg', Buffer.from(shot.data, 'base64'))
await ev(`(() => { const d = document.querySelector('.doc'); if (d) d.scrollTop = 420; return 1 })()`)
await new Promise((r) => setTimeout(r, 1200))
const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
writeFileSync('C:/Users/MR/WorkBuddy/个人站-react/.shots/games2.jpg', Buffer.from(shot2.data, 'base64'))
console.log('errors:', errors.length, errors.slice(0,2))
ws.close()
