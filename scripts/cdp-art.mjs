/** 诊断粒子画作是否还能吃到鼠标移动 */
const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const ver = await (await fetch(`${HTTP}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
  }
}
const send = (method, params = {}, sessionId) =>
  new Promise((res, rej) => {
    const mid = ++id
    pending.set(mid, { res, rej })
    ws.send(JSON.stringify({ id: mid, method, params, sessionId }))
  })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const ev = (expression) =>
  send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
await send('Page.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId)
await ev(`location.href = "http://127.0.0.1:4400/"`)
await new Promise((r) => setTimeout(r, 6000))

const base = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600)
  byText('button', '啟動').click()
  await sleep(2000)
  ;[...document.querySelectorAll('.panel-node')].find(n => (n.textContent||'').includes('音乐')).click()
  await sleep(300)
  byText('.panel button', '登入').click()
  await sleep(4500)
  ;[...document.querySelectorAll('.music-go')][1].click()
  await sleep(2500)

  const art = document.querySelector('.pl-art')
  const r = art.getBoundingClientRect()
  const cx = Math.round(r.left + r.width / 2)
  const cy = Math.round(r.top + r.height / 2)
  const top = document.elementFromPoint(cx, cy)
  const stack = document.elementsFromPoint(cx, cy).slice(0, 4).map(e => e.tagName + '.' + (e.className||'').toString().slice(0,30))
  const canvas = art.querySelector('canvas')
  window.__hits = 0
  canvas && canvas.addEventListener('pointermove', () => { window.__hits++ }, { passive: true })
  return {
    cx, cy,
    topEl: top ? top.tagName + '.' + (top.className||'').toString().slice(0,40) : null,
    stack,
    canvasPE: canvas ? getComputedStyle(canvas).pointerEvents : null,
    wrapperPE: getComputedStyle(canvas.parentElement).pointerEvents,
    artPE: getComputedStyle(art).pointerEvents,
    canvasSize: canvas ? canvas.width + 'x' + canvas.height : null
  }
})()`)
console.log(JSON.stringify(base.result?.value ?? base, null, 1))
const info = base.result?.value
if (info && info.cx) {
  for (let i = 0; i < 12; i++) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved', x: info.cx - 60 + i * 12, y: info.cy, button: 'none', pointerType: 'mouse'
    }, sessionId)
    await new Promise((r) => setTimeout(r, 40))
  }
  const hits = await ev('window.__hits')
  console.log('canvas 收到的 pointermove 次数:', hits.result?.value)
}
const fs = await import('node:fs')
fs.mkdirSync('C:/Users/MR/WorkBuddy/个人站-react/.shots', { recursive: true })
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
fs.writeFileSync('C:/Users/MR/WorkBuddy/个人站-react/.shots/art.jpg', Buffer.from(shot.data, 'base64'))
ws.close()
