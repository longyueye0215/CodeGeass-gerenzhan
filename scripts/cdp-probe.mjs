/**
 * DOM 探针：在过场的各个时刻直接读 DOM/CSS 状态（不做截图，避免延迟）。
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
  const log = []
  const snap = (label) => {
    const g = document.querySelector('.vault-gate')
    const cv = g?.querySelector('canvas')
    const w = cv?.width || 0
    const h = cv?.height || 0
    const cs = g ? getComputedStyle(g) : null
    log.push({
      label,
      gate: !!g,
      hatchClass: g ? g.classList.contains('hatch') : null,
      opacity: cs ? cs.opacity : null,
      bg: cs ? cs.backgroundColor : null,
      canvas: !!cv,
      size: w && h ? w + 'x' + h : null,
      doc: !!document.querySelector('.doc'),
      loading: !!document.querySelector('.loading')
    })
  }
  const enter = byText('.panel button', '登入')
  const t0 = performance.now()
  enter.click()
  for (const ms of [60, 300, 600, 750, 900, 1050, 1500, 2100, 2250, 2500, 2700, 2900, 3100, 3300]) {
    const wait = ms - (performance.now() - t0)
    if (wait > 0) await sleep(wait)
    snap(Math.round(performance.now() - t0) + 'ms')
  }
  return log
})()`)

for (const row of out.result.value) {
  console.log(
    `${String(row.label).padStart(7)} gate=${row.gate ? 'Y' : 'n'} hatch=${row.hatchClass ? 'Y' : 'n'} ` +
      `op=${row.opacity} bg=${row.bg} canvas=${row.canvas ? 'Y' : 'n'} ${row.size || ''} ` +
      `doc=${row.doc ? 'Y' : 'n'} load=${row.loading ? 'Y' : 'n'}`
  )
}
ws.close()
