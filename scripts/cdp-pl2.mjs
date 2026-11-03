/**
 * 歌单页细节验证：欢迎页居中/字号、目录按钮位置、进出转场是否有门。
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'http://127.0.0.1:4400/'
const OUT = 'C:/Users/MR/WorkBuddy/个人站-react/.shots'
mkdirSync(OUT, { recursive: true })

const ver = await (await fetch(`${HTTP}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
const errors = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
    return
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 160))
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
await send('Runtime.enable', {}, sessionId)
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

  const w = document.querySelector('.pl-welcome')
  const wr = w.getBoundingClientRect()
  const lines = [...w.querySelectorAll('p')].map(p => ({
    text: p.textContent,
    size: getComputedStyle(p).fontSize,
    top: Math.round(p.getBoundingClientRect().top)
  }))
  const btn = document.querySelector('.doc-catalog')
  const br = btn.getBoundingClientRect()

  // 选一份歌单，看有没有门
  btn.click()
  await sleep(350)
  document.querySelectorAll('.plc-row')[2].click()
  const trace = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    trace.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.pl-list') ? '+list' : document.querySelector('.pl-welcome') ? '+wel' : ''))
  }
  // 返回
  document.querySelector('.pl-back').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
  const trace2 = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    trace2.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.pl-list') ? '+list' : document.querySelector('.pl-welcome') ? '+wel' : ''))
  }

  return {
    welcomeCenterY: Math.round(wr.top + wr.height / 2),
    viewportCenterY: Math.round(window.innerHeight / 2),
    lines,
    catalogBtn: { left: Math.round(br.left), bottom: Math.round(window.innerHeight - br.bottom), w: Math.round(br.width), h: Math.round(br.height) },
    trace,
    trace2
  }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))

const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
writeFileSync(`${OUT}/pl2.jpg`, Buffer.from(shot.data, 'base64'))
console.log('errors:', errors.length, errors.slice(0, 2))
ws.close()
