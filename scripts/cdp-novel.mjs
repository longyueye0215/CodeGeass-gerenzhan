/** 验证小说分区：目录 → 短篇、短篇 → 返回 是否都走门 */
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
  ;[...document.querySelectorAll('.panel-node')].find(n => (n.textContent||'').includes('小说')).click()
  await sleep(300)
  byText('.panel button', '登入').click()
  await sleep(4200)
  document.querySelector('.doc-catalog').click()
  await sleep(500)
  const doc = document.querySelector('.ncat-doc')
  if (!doc) return { err: 'no story row' }
  doc.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
  const t1 = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    t1.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.novel-page') ? '+story' : document.querySelector('.doc-hero') ? '+landing' : ''))
  }
  const back = document.querySelector('.novel-back')
  back.click()
  const t2 = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    t2.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.novel-page') ? '+story' : document.querySelector('.doc-hero') ? '+landing' : ''))
  }
  return { t1, t2 }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))
ws.close()
