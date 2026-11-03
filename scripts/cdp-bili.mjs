/**
 * 抓 B 站空间收藏夹页自身的接口响应，拿到公开收藏夹的 fid 列表。
 */
const PORT = 9333
const HTTP = `http://127.0.0.1:${PORT}`
const URL_ = process.argv[2] || 'https://space.bilibili.com/2018386242/favlist'

const ver = await (await fetch(`${HTTP}/json/version`)).json()
const ws = new WebSocket(ver.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
const wanted = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)
    return
  }
  if (m.method === 'Network.responseReceived') {
    const url = m.params.response.url
    if (url.includes('folder/created/list') || url.includes('folder/list')) {
      wanted.push({ requestId: m.params.requestId, url })
    }
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
await send('Network.enable', {}, sessionId)
await ev(`location.href = ${JSON.stringify(URL_)}`)
await new Promise((r) => setTimeout(r, 8000))

await ev(`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  for (let i = 0; i < 5; i++) { window.scrollTo(0, document.body.scrollHeight * (i / 5)); await sleep(700) }
  window.scrollTo(0, 0)
  return 1
})()`)
await new Promise((r) => setTimeout(r, 1500))

console.log('captured', wanted.length)
for (const w of wanted) {
  try {
    const body = await send('Network.getResponseBody', { requestId: w.requestId }, sessionId)
    const text = body.body
    console.log('---', w.url.slice(0, 90), 'len', text.length)
    try {
      const json = JSON.parse(text)
      const list = (json.data && (json.data.list || json.data)) || []
      if (Array.isArray(list)) {
        for (const f of list) console.log('  ', f.id, f.title, f.media_count)
      }
    } catch {
      console.log('  (not json)', text.slice(0, 160))
    }
  } catch (err) {
    console.log('  body fail', String(err).slice(0, 120))
  }
}
ws.close()
