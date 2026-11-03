/**
 * 回程验证：从分区返回首页时，黑幕应当单调减弱，
 * 不允许"首页先露出来、又被黑幕重新盖住"的回跳。
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

const probe = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2500)
  byText('button', '啟動').click()
  await sleep(1500)
  byText('.panel button', '登入').click()
  await sleep(4500)
  if (!document.querySelector('.doc')) return { err: '未进入分区' }
  window.__s = []
  const t0 = performance.now()
  const sel = ['.transit-floor', '.vault-gate', '.loading', '.doc', '.home-fade', '.intro']
  const tick = () => {
    let pass = 1
    const d = {}
    for (const s of sel) {
      for (const el of document.querySelectorAll(s)) {
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        const op = parseFloat(cs.opacity)
        if (!isNaN(op) && op > 0) { pass *= (1 - op); d[s] = +(1 - (1 - (d[s] || 0)) * (1 - op)).toFixed(3) }
      }
    }
    window.__s.push([Math.round(performance.now() - t0), +(1 - pass).toFixed(4), d])
    if (performance.now() - t0 < 3200) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  document.querySelector('.doc-menu').click()
  await sleep(3400)
  const s = window.__s
  const reblack = []
  let dropped = false
  for (const [t, c] of s) {
    if (c < 0.9) dropped = true
    if (dropped && c > 0.95) reblack.push([t, c])
  }
  return {
    frames: s.length,
    reblackAfterReveal: reblack.slice(0, 8),
    backOnHome: !document.querySelector('.doc'),
    timeline: s.filter((_, i) => i % 3 === 0).map(x => x[0] + ':' + x[1])
  }
})()`

const out = await ev(probe)
console.log('回程检查:', JSON.stringify(out.result?.value ?? out, null, 2))
ws.close()
