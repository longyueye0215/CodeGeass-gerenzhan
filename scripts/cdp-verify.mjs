/**
 * 过场衔接客观验证：
 * 在真实浏览器里触发「分区选择 → 进入分区」的过场，
 * 逐帧采样所有全屏不透明层的合成覆盖率，
 * 只要全程 ≈1，就说明首页不会在任何一帧露出来。
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'http://127.0.0.1:4400/'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const profile = mkdtempSync(path.join(tmpdir(), 'cdp-verify-'))
const browser = process.env.CDP_NO_SPAWN
  ? null
  : spawn(
      EDGE,
      [
        '--headless=new',
        `--remote-debugging-port=${PORT}`,
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--disable-extensions',
        '--window-size=1440,900',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        'about:blank'
      ],
      { stdio: 'ignore' }
    )
process.on('exit', () => browser?.kill())

let ver = null
for (let i = 0; i < 40 && !ver; i++) {
  await new Promise((r) => setTimeout(r, 500))
  try {
    ver = await (await fetch(`${HTTP}/json/version`)).json()
  } catch {
    /* 还没起来 */
  }
}
if (!ver) throw new Error('浏览器调试端口未就绪')
console.log('browser:', ver.Browser)

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
const ev = (expr) =>
  send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId)

await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 6000))

const probe = `(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2500)
  const launch = byText('button', '啟動')
  if (!launch) return { err: 'no-launch-button' }
  launch.click()
  await sleep(1500)
  const enter = byText('.panel button', '登入')
  if (!enter) return { err: 'no-enter-button', buttons: [...document.querySelectorAll('.panel button')].map(b=>b.textContent).join('|') }
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
    if (performance.now() - t0 < 4300) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  enter.click()
  await sleep(4600)
  const s = window.__s
  let min = 1, at = 0
  for (const [t, c] of s) if (t > 40 && c < min) { min = c; at = t }
  return {
    frames: s.length,
    minCoverage: min,
    minAtMs: at,
    holes: s.filter(x => x[1] < 0.999).slice(0, 10),
    first8: s.slice(0, 8),
    mid: s.filter(x => x[0] > 1500 && x[0] < 2900).slice(0, 6),
    last: s.slice(-2),
    docPresent: !!document.querySelector('.doc'),
    sampleEvery: s.filter((_, i) => i % 12 === 0).map(x => x[0] + 'ms:' + x[1])
  }
})()`

const out = await ev(probe)
console.log(JSON.stringify(out.result?.value ?? out, null, 2))
ws.close()
