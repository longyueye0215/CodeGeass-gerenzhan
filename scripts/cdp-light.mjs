import { writeFileSync, mkdirSync } from 'node:fs'
const PORT = 9333
mkdirSync('C:/Users/MR/WorkBuddy/个人站-react/.shots', { recursive: true })
const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result) } }
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const ev = (e) => send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, sessionId)
await send('Page.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId)
await ev(`location.href = "http://127.0.0.1:4400/"`)
await new Promise((r) => setTimeout(r, 6000))
await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600); byText('button','啟動').click(); await sleep(2200)
  ;[...document.querySelectorAll('.panel-node')].find(n=>(n.textContent||'').includes('游戏')).click(); await sleep(400)
  byText('.panel button','登入').click(); await sleep(5000)
  document.querySelector('.doc-bright').click(); await sleep(2500)
  return 1
})()`)
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
writeFileSync('C:/Users/MR/WorkBuddy/个人站-react/.shots/light.jpg', Buffer.from(shot.data, 'base64'))
console.log('ok')
ws.close()
