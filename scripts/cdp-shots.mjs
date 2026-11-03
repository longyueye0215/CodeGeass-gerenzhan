/**
 * 过场关键帧截图：在「进入分区」过场的若干时间点抓图，
 * 用来肉眼复核有没有首页透出来的帧。
 */
import { writeFileSync } from 'node:fs'

const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'http://127.0.0.1:4400/'
const OUT = process.argv[3] || 'C:/Users/MR/WorkBuddy/个人站-react/.frames'
const SHOTS = [0, 120, 500, 860, 960, 1040, 1400, 2060, 2160, 2900, 3300]

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
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 6000))

// 打开控制台
await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  await sleep(2500)
  const launch = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('啟動'))
  launch.click()
  await sleep(1500)
  return !!document.querySelector('.panel.on')
})()`)

// 点击登入，同时记录零点
await ev(`(async () => {
  const enter = [...document.querySelectorAll('.panel button')].find(b => (b.textContent||'').includes('登入'))
  window.__t0 = performance.now()
  enter.click()
  return true
})()`)

let prev = 0
for (const ms of SHOTS) {
  await new Promise((r) => setTimeout(r, ms - prev))
  prev = ms
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  const file = `${OUT}/shot-${String(ms).padStart(4, '0')}.png`
  writeFileSync(file, Buffer.from(data, 'base64'))
  console.log('saved', file)
}
ws.close()
