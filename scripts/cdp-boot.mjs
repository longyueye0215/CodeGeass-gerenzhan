/** 验证点启动后：门开时已经能看到分区选择面板，不再漏出首页 */
const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
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
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId)
await ev(`location.href = "http://127.0.0.1:4400/"`)
await new Promise((r) => setTimeout(r, 6000))
const out = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600)
  const btn = byText('button', '啟動')
  btn.click()
  const rows = []
  for (let i = 0; i < 15; i++) {
    await sleep(80)
    const gate = document.querySelector('.doc-gate, .vault-gate')
    const panel = document.querySelector('.panel')
    const home = document.querySelector('.hero, .hud')
    rows.push(
      Math.round((i + 1) * 80) + 'ms ' +
      (gate ? 'G' : '-') +
      (panel ? 'P' + (getComputedStyle(panel).opacity === '1' ? '1' : 'x') : '-') +
      (home ? 'H' : '-')
    )
  }
  return rows
})()`)
console.log((out.result?.value ?? []).join('  '))
ws.close()
