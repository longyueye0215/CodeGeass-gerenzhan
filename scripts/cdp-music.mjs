/**
 * 打开音乐分区并截图，检查粒子卡。
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
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false
}, sessionId)
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 6000))

const res = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600)
  byText('button', '啟動').click()
  await sleep(1600)
  const nodes = [...document.querySelectorAll('.panel-node')]
  const music = nodes.find(n => (n.textContent||'').includes('音乐'))
  if (!music) return { err: 'no music node', n: nodes.length }
  music.click()
  await sleep(300)
  byText('.panel button', '登入').click()
  await sleep(4200)
  const cards = document.querySelectorAll('.music-card')
  const canvases = document.querySelectorAll('.music-art canvas')
  const hero = document.querySelector('.doc-hero')
  return {
    cards: cards.length,
    canvases: canvases.length,
    canvasSize: [...canvases].map(c => c.width + 'x' + c.height),
    heroText: hero ? hero.querySelector('.doc-para')?.textContent : null,
    titles: [...document.querySelectorAll('.music-title')].map(t => t.textContent),
    chapter: !!document.querySelector('.doc-chapter'),
    cardTops: [...cards].map(c => Math.round(c.getBoundingClientRect().top)),
    cardHeights: [...cards].map(c => Math.round(c.getBoundingClientRect().height))
  }
})()`)

console.log(JSON.stringify(res.result?.value ?? res, null, 1))

for (const i of [0, 1, 2]) {
  await ev(`(() => { const d = document.querySelector('.doc'); if (d) d.scrollTop = ${i * 430}; return 1 })()`)
  await new Promise((r) => setTimeout(r, 700))
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
  writeFileSync(`${OUT}/music-${i}.jpg`, Buffer.from(shot.data, 'base64'))
}

// 点第一张卡的「进入」，看空页面
const blank = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const btn = document.querySelector('.music-go')
  if (!btn) return { err: 'no-go' }
  btn.click()
  await sleep(600)
  return {
    blank: !!document.querySelector('.doc-blank'),
    body: !!document.querySelector('.doc-blank-body'),
    back: !!document.querySelector('.novel-back'),
    cards: document.querySelectorAll('.music-card').length
  }
})()`)
console.log('blank:', JSON.stringify(blank.result?.value))
const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 }, sessionId)
writeFileSync(`${OUT}/blank.jpg`, Buffer.from(shot2.data, 'base64'))
console.log('shots saved')
ws.close()
