/**
 * 抓控制台错误：确认六边形着色器编译通过（three 的着色器报错走 console.error）。
 */
const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'http://127.0.0.1:4400/'

const ver = await (await fetch(`${HTTP}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
const logs = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
    return
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type !== 'log') {
    logs.push({
      type: m.params.type,
      text: (m.params.args || []).map((a) => String(a.value ?? a.description ?? '')).join(' ').slice(0, 400)
    })
  }
  if (m.method === 'Runtime.exceptionThrown') {
    logs.push({ type: 'exception', text: JSON.stringify(m.params.exceptionDetails).slice(0, 400) })
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
  await sleep(2600)
  byText('button', '啟動').click()
  await sleep(1600)
  byText('.panel button', '登入').click()
  await sleep(4200)
  const cv = document.querySelector('.music-art canvas')
  const gl = cv && (cv.getContext('webgl2') || cv.getContext('webgl'))
  return {
    doc: !!document.querySelector('.doc'),
    webgl2: !!gl && typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
    glError: gl ? gl.getError() : null
  }
})()`)

console.log('页面状态:', JSON.stringify(out.result?.value))
console.log('错误日志 (' + logs.length + '):')
for (const l of logs.slice(0, 12)) console.log(' -', l.type, '|', l.text)
ws.close()
