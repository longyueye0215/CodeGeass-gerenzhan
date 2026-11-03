/**
 * 用 CDP screencast 连续抓帧（带真实时间戳），
 * 检查「舱门开启」过程里画面到底长什么样。
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
const frames = []
ws.onmessage = async (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
    return
  }
  if (m.method === 'Page.screencastFrame') {
    frames.push({ t: m.params.metadata.timestamp * 1000, data: m.params.data })
    send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {})
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

// 打开控制台面板
await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  await sleep(2600)
  ;[...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('啟動')).click()
  await sleep(1500)
  return !!document.querySelector('.panel.on')
})()`)

await send(
  'Page.startScreencast',
  { format: 'jpeg', quality: 72, maxWidth: 900, maxHeight: 600, everyNthFrame: 1 },
  sessionId
)

// 点登入，同时记录零点的墙钟
await ev(`(() => {
  const enter = [...document.querySelectorAll('.panel button')].find(b => (b.textContent||'').includes('登入'))
  window.__clickEpoch = Date.now()
  enter.click()
  return true
})()`)

await new Promise((r) => setTimeout(r, 4200))
await send('Page.stopScreencast', {}, sessionId)

const zero = await ev('window.__clickEpoch')
const t0 = Number(zero.result.value)
const picked = []
const wanted = [0, 200, 450, 600, 700, 800, 900, 960, 1000, 1100, 1500, 2050, 2150,
  2300, 2500, 2620, 2700, 2800, 2900, 2980, 3050, 3300]
for (const w of wanted) {
  let best = null
  for (const f of frames) {
    const rel = f.t - t0
    if (rel < 0) continue
    if (!best || Math.abs(rel - w) < Math.abs(best.t - t0 - w)) best = f
  }
  if (best) {
    const rel = Math.round(best.t - t0)
    const file = `${OUT}/f-${String(w).padStart(4, '0')}.jpg`
    writeFileSync(file, Buffer.from(best.data, 'base64'))
    picked.push({ want: w, actual: rel, file })
  }
}
console.log('frames total:', frames.length)
console.log(JSON.stringify(picked, null, 1))
ws.close()
