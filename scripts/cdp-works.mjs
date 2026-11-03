/**
 * 打开「空耳露娜的作品集」→ 立方体墙 → 点一颗 → 歌词页，并截图。
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'http://127.0.0.1:4400/'
const OUT = process.argv[3] || 'C:/Users/MR/WorkBuddy/个人站-react/.shots'
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
    errors.push((m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 300))
  }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push('EXC ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 600))
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
await send(
  'Emulation.setDeviceMetricsOverride',
  { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false },
  sessionId
)
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
  const go = document.querySelector('.music-go')
  if (!go) return { err: 'no music card' }
  go.click()
  const trace = []
  for (let i = 0; i < 14; i++) {
    await sleep(90)
    trace.push(Math.round((i + 1) * 90) + 'ms:' + (document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.works-grid') ? '+wall' : ''))
  }
  await sleep(600)

  const cells = [...document.querySelectorAll('.work-cell')]
  const canvases = [...document.querySelectorAll('.work-cube-canvas')]
  return {
    cells: cells.length,
    canvases: canvases.length,
    canvasSize: canvases.slice(0, 3).map(c => c.width + 'x' + c.height),
    kana: cells.slice(0, 5).map(c => c.querySelector('.work-kana')?.textContent),
    titles: cells.slice(0, 5).map(c => c.querySelector('.work-title')?.textContent),
    titleColors: cells.slice(0, 3).map(c => getComputedStyle(c.querySelector('.work-title')).color),
    gridCols: getComputedStyle(document.querySelector('.works-grid')).gridTemplateColumns,
    firstTitleLong: cells.map(c => c.querySelector('.work-title')?.textContent).filter(t => t && t.length > 8),
    trace
  }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))

const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, sessionId)
writeFileSync(`${OUT}/works.jpg`, Buffer.from(shot.data, 'base64'))

// 点第一颗立方体
const out2 = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const cell = document.querySelector('.work-cell')
  cell.click()
  const trace = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    trace.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.works-grid') ? '+wall' : document.querySelector('.track-page') ? '+track' : ''))
  }
  await sleep(600)
  const imgs = [...document.querySelectorAll('.track-shot img')]
  return {
    track: !!document.querySelector('.track-page'),
    kana: document.querySelector('.track-kana')?.textContent,
    title: document.querySelector('.track-title')?.textContent,
    count: document.querySelector('.track-count')?.textContent,
    imgs: imgs.length,
    firstSrc: imgs[0]?.getAttribute('src'),
    firstLoaded: imgs[0]?.complete && imgs[0]?.naturalWidth > 0,
    naturalW: imgs[0]?.naturalWidth,
    trace
  }
})()`)
console.log(JSON.stringify(out2.result?.value ?? out2, null, 1))

const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 }, sessionId)
writeFileSync(`${OUT}/track.jpg`, Buffer.from(shot2.data, 'base64'))

// 曲目页 → 墙面
const out3 = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  document.querySelector('.track-page .novel-back').click()
  const trace = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    trace.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.works-grid') ? '+wall' : document.querySelector('.track-page') ? '+track' : ''))
  }
  return { trace }
})()`)
console.log('曲目→墙面:', JSON.stringify(out3.result?.value))

// 墙面 → 音乐分区
const out4 = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  document.querySelector('.works-page .novel-back').click()
  const trace = []
  for (let i = 0; i < 12; i++) {
    await sleep(90)
    trace.push((document.querySelector('.doc-gate') ? 'gate' : '-') + (document.querySelector('.works-grid') ? '+wall' : '') + (document.querySelector('.music-card') ? '+music' : ''))
  }
  return { trace }
})()`)
console.log('墙面→音乐:', JSON.stringify(out4.result?.value))

console.log('errors:', errors.length, errors.slice(0, 3))
ws.close()
