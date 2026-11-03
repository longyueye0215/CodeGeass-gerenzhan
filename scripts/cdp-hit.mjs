/**
 * 诊断：歌单页左上角「◂ 返回」为什么点不到（elementFromPoint 看谁盖在上面）。
 */
const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'http://127.0.0.1:4400/'

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
await ev(`location.href = ${JSON.stringify(URL_)}`)
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
  await sleep(1800)
  document.querySelector('.doc-catalog').click()
  await sleep(400)
  document.querySelectorAll('.plc-row')[0].click()
  await sleep(700)

  const back = document.querySelector('.pl-back')
  const r = back.getBoundingClientRect()
  const cx = Math.round(r.left + r.width / 2)
  const cy = Math.round(r.top + r.height / 2)
  const top = document.elementFromPoint(cx, cy)
  const stack = document.elementsFromPoint(cx, cy).slice(0, 5).map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 40))
  const cs = getComputedStyle(back)
  return {
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    point: [cx, cy],
    topEl: top ? top.tagName + '.' + (top.className || '').toString().slice(0, 40) : null,
    stack,
    backStyle: { pe: cs.pointerEvents, z: cs.zIndex, pos: cs.position },
    isBackTop: top === back
  }
})()`)
const info = out.result?.value
console.log(JSON.stringify(info, null, 1))

// 用真实的鼠标事件点一下「返回」
const [cx, cy] = info.point
for (const type of ['mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', {
    type,
    x: cx,
    y: cy,
    button: 'left',
    clickCount: 1,
    pointerType: 'mouse'
  }, sessionId)
  await new Promise((r) => setTimeout(r, 60))
}
await new Promise((r) => setTimeout(r, 500))
const after = await ev(`({
  welcome: !!document.querySelector('.pl-welcome'),
  list: !!document.querySelector('.pl-list')
})`)
console.log('点击后:', JSON.stringify(after.result?.value))
ws.close()
