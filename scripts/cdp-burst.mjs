/**
 * 连拍：每张截图前记录页面当前时间，用真实时间给帧打标签。
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
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 6000))

await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  await sleep(2600)
  ;[...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('啟動')).click()
  await sleep(1500)
  return !!document.querySelector('.panel.on')
})()`)

await ev(`(() => {
  const enter = [...document.querySelectorAll('.panel button')].find(b => (b.textContent||'').includes('登入'))
  enter.click()
  window.__t0 = performance.now()
  return true
})()`)

const shots = []
for (let i = 0; i < 40; i++) {
  const t = await ev('Math.round(performance.now() - window.__t0)')
  const rel = Number(t.result.value)
  if (rel > 3600) break
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }, sessionId)
  const file = `${OUT}/s-${String(i).padStart(2, '0')}.jpg`
  writeFileSync(file, Buffer.from(shot.data, 'base64'))
  shots.push({ i, ms: rel, file })
}
console.log(JSON.stringify(shots.map((s) => `${s.i}:${s.ms}ms`)))
console.log(shots[0]?.file, '...', shots.at(-1)?.file)
ws.close()
