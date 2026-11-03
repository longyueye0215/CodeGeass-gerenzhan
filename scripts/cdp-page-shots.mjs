/**
 * 对一个静态页面按时间连拍（用于观察放慢后的舱门）。
 */
import { writeFileSync, mkdirSync } from 'node:fs'

const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2]
const OUT = process.argv[3] || 'C:/Users/MR/WorkBuddy/个人站-react/.shots'
const COUNT = Number(process.argv[4] || 8)
const GAP = Number(process.argv[5] || 1200)
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
  width: 1280,
  height: 800,
  deviceScaleFactor: 1,
  mobile: false
}, sessionId)
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 5000))

const shots = []
for (let i = 0; i < COUNT; i++) {
  const t = await ev('Math.round(performance.now())')
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 }, sessionId)
  const file = `${OUT}/g-${String(i).padStart(2, '0')}.jpg`
  writeFileSync(file, Buffer.from(shot.data, 'base64'))
  shots.push({ i, ms: Number(t.result.value), file })
  await new Promise((r) => setTimeout(r, GAP))
}
console.log(JSON.stringify(shots.map((s) => `${s.i}@${s.ms}ms`)))
ws.close()
