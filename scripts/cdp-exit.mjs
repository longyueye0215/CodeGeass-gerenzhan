/** 验证欢迎页左上角返回键 → 回到音乐分区 */
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
const out = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600)
  byText('button', '啟動').click()
  await sleep(1600)
  ;[...document.querySelectorAll('.panel-node')].find(n => (n.textContent||'').includes('音乐')).click()
  await sleep(300)
  byText('.panel button', '登入').click()
  await sleep(4200)
  ;[...document.querySelectorAll('.music-go')][1].click()
  await sleep(2000)
  await (async () => {})()
  const back = document.querySelector('.pl-back')
  const r = back ? back.getBoundingClientRect() : null
  const top = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null
  if (back) {
    back.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
  }
  const trace = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    trace.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.pl-welcome') ? '+wel' : '') + (document.querySelector('.music-card') ? '+music' : ''))
  }
  return {
    backRect: r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width) } : null,
    hit: top ? top.className : null,
    trace
  }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
const fs = await import('node:fs')
fs.writeFileSync('C:/Users/MR/WorkBuddy/个人站-react/.shots/exit.jpg', Buffer.from(shot.data, 'base64'))
ws.close()
