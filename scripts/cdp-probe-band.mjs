const PORT = 9333
const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result) } }
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params, sessionId })) })
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
const ev = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)
await send('Page.enable', {}, sessionId)
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId)
await ev(`location.href = "http://127.0.0.1:4400/"`)
await new Promise((r) => setTimeout(r, 6000))
const out = await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const byText = (sel, txt) => [...document.querySelectorAll(sel)].find(b => (b.textContent||'').includes(txt))
  await sleep(2600); byText('button','啟動').click(); await sleep(2200)
  ;[...document.querySelectorAll('.panel-node')].find(n=>(n.textContent||'').includes('游戏')).click(); await sleep(400)
  byText('.panel button','登入').click(); await sleep(5000)
  const neon = document.querySelector('.game-neon')
  const r = neon.getBoundingClientRect()
  const cx = Math.round(r.left + r.width/2), cy = Math.round(r.top + 20)
  const stack = document.elementsFromPoint(cx, cy).slice(0,5).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,24))
  const cs = getComputedStyle(neon)
  const cv = neon.querySelector('canvas')
  return { rect:{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)},
           stack, mask: cs.maskImage.slice(0,60), neonBg: cs.backgroundColor,
           canvas: cv ? { w: cv.width, h: cv.height, style: cv.getAttribute('style') } : null,
           rootBg: neon.firstElementChild ? getComputedStyle(neon.firstElementChild).backgroundColor : null }
})()`)
console.log(JSON.stringify(out.result?.value ?? out, null, 1))
ws.close()
