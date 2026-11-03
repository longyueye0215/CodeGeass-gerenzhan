/**
 * 验证：歌单卡 → 欢迎页（三行）→ 目录弹窗（四份）→ 歌单列表。
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
    errors.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 200))
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push('EXC ' + String(m.params.exceptionDetails.exception?.description || '').slice(0, 200))
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

  const cards = [...document.querySelectorAll('.music-go')]
  cards[1].click()
  await sleep(1800)

  const lines = [...document.querySelectorAll('.pl-welcome p')].map(p => p.textContent)
  document.querySelector('.doc-catalog').click()
  await sleep(400)
  const folders = [...document.querySelectorAll('.plc-row')].map(r => r.textContent.trim())
  document.querySelectorAll('.plc-row')[0].click()
  await sleep(2400)
  const rows = [...document.querySelectorAll('.pl-row')].slice(0, 6).map(r => ({
    song: r.querySelector('.pl-song')?.textContent,
    artist: r.querySelector('.pl-artist')?.textContent
  }))
  return {
    lines,
    folders,
    activeTitle: document.querySelector('.pl-title')?.textContent,
    count: document.querySelector('.pl-count')?.textContent,
    rowTotal: document.querySelectorAll('.pl-row').length,
    rows
  }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))

const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, sessionId)
writeFileSync(`${OUT}/playlist.jpg`, Buffer.from(shot.data, 'base64'))

const shot2 = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  document.querySelector('.pl-back')?.click()
  await sleep(500)
  document.querySelector('.doc-catalog').click()
  await sleep(400)
  return !!document.querySelector('.plc-panel')
})()`)
void shot2
const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, sessionId)
writeFileSync(`${OUT}/playlist-menu.jpg`, Buffer.from(s2.data, 'base64'))

console.log('errors:', errors.length, errors.slice(0, 3))
ws.close()
