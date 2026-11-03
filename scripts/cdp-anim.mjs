/**
 * 直接检查 .vault-gate 上到底跑了哪些 CSS 动画、进度如何。
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

await send('Runtime.enable', {}, sessionId)
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 6000))

const out = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2500)
  byText('button', '啟動').click()
  await sleep(1500)
  const rows = []
  byText('.panel button', '登入').click()
  const t0 = performance.now()
  for (let i = 0; i < 12; i++) {
    const g = document.querySelector('.vault-gate')
    const anims = g ? g.getAnimations().map(a => ({
      name: a.animationName,
      t: Math.round(Number(a.currentTime) || 0),
      state: a.playState
    })) : []
    rows.push({
      ms: Math.round(performance.now() - t0),
      exists: !!g,
      op: g ? getComputedStyle(g).opacity : null,
      anims
    })
    await sleep(90)
  }
  return rows
})()`)

for (const r of out.result.value) {
  console.log(
    `${String(r.ms).padStart(5)}ms exists=${r.exists ? 'Y' : 'n'} op=${r.op} ` +
      r.anims.map((a) => `${a.name}@${a.t}(${a.state})`).join(', ')
  )
}
ws.close()
