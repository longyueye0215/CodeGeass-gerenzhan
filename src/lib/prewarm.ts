/**
 * 分区资源预热引擎
 * ────────────────────────────────────────────────────────────
 * 目标：让「打开任意分区」从「边开边下载」变成「只负责显示」。
 *
 * 三层：
 *  ① chunk  —— SectionView / ConsolePanel / three / r3f，首屏空闲即预取
 *  ② gate   —— 每个分区首屏可见图片，全部 Image.decode() 完成才算就绪
 *  ③ warm / deep —— 滚动后才看得到的图，后台低优先级补齐，不阻塞过场
 *
 * ensureReady(sectionId) 是过场门禁唯一入口：用户点击后该组任务提到队首、
 * 切紧急模式；只有 chunk + core + 该组 gate 全部完成（或 12s 兜底）才放行舱门。
 */

export interface WarmState {
  phase: 'idle' | 'chunks' | 'core' | 'warm' | 'ready'
  chunkReady: boolean
  done: number
  total: number
  urgent: boolean
  groups: Record<string, { done: number; total: number; ready: boolean }>
}

interface Manifest {
  version: number
  core: string[]
  gate: Record<string, string[]>
  sections: Record<string, string[]>
  deep: Record<string, string[]>
}

type Task = { url: string; group: string }

/** manifest 拉取失败时的最小兜底，保证门禁不会卡死 */
const FALLBACK: Manifest = {
  version: 1,
  core: ['/images/logo-dark.png', '/images/logo-light.png', '/images/hero-moon.jpg'],
  gate: {},
  sections: {},
  deep: {}
}

const state: WarmState = {
  phase: 'idle',
  chunkReady: false,
  done: 0,
  total: 0,
  urgent: false,
  groups: {}
}

const listeners = new Set<(s: WarmState) => void>()
const queue: Task[] = []
const groupMeta = new Map<string, { total: number; done: number; resolve: () => void; promise: Promise<void> }>()
const seen = new Set<string>()

let manifestPromise: Promise<Manifest> | null = null
let chunkLoader: (() => Promise<unknown>) | null = null
let chunkPromise: Promise<unknown> | null = null
let started = false
let queueBuilt = false
let running = 0
let notifyTimer = 0
let deepAllowed = true
let baseConcurrency = 6

/* ───────────────────────── 状态广播 ───────────────────────── */

function snapshot(): WarmState {
  const groups: WarmState['groups'] = {}
  groupMeta.forEach((g, k) => {
    groups[k] = { done: g.done, total: g.total, ready: g.done >= g.total }
  })
  return { ...state, groups }
}

export function getWarmState(): WarmState {
  return snapshot()
}

export function subscribeWarm(cb: (s: WarmState) => void): () => void {
  listeners.add(cb)
  cb(snapshot())
  return () => listeners.delete(cb)
}

function notify() {
  if (notifyTimer) return
  notifyTimer = window.setTimeout(() => {
    notifyTimer = 0
    const s = snapshot()
    listeners.forEach((cb) => cb(s))
    if (queue.length === 0 && running === 0 && state.phase !== 'ready') {
      state.phase = 'ready'
      listeners.forEach((cb) => cb(snapshot()))
    }
  }, 120)
}

/* ───────────────────────── 分组 ───────────────────────── */

function group(name: string, total: number) {
  const existing = groupMeta.get(name)
  if (existing) return existing
  let resolve = () => {}
  const promise = new Promise<void>((r) => { resolve = r })
  const meta = { total: Math.max(total, 0), done: 0, resolve, promise }
  groupMeta.set(name, meta)
  if (total <= 0) meta.resolve()
  return meta
}

function dedupe(name: string, list: string[]) {
  return list.filter((u) => {
    const key = `${name}|${u}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** 一次性构建全站队列：core → 六组 gate 交错 → warm → deep */
function buildQueue(m: Manifest) {
  if (queueBuilt) return
  queueBuilt = true

  const buckets: { name: string; list: string[] }[] = [
    { name: 'core', list: m.core },
    ...Object.entries(m.gate).map(([id, list]) => ({ name: `gate:${id}`, list })),
    ...Object.entries(m.sections).map(([id, list]) => ({ name: `warm:${id}`, list })),
    ...(deepAllowed ? Object.entries(m.deep).map(([id, list]) => ({ name: `deep:${id}`, list })) : [])
  ]

  // 先声明分组总数（一次定死），再入队 —— 否则门禁会只等第一张图
  const prepared = buckets.map((b) => {
    const fresh = dedupe(b.name, b.list)
    group(b.name, fresh.length)
    state.total += fresh.length
    return { name: b.name, list: fresh }
  })

  const coreList = prepared.find((p) => p.name === 'core')?.list ?? []
  const gates = prepared.filter((p) => p.name.startsWith('gate:'))
  const rest = prepared.filter((p) => p.name !== 'core' && !p.name.startsWith('gate:'))

  const ordered: Task[] = coreList.map((url) => ({ url, group: 'core' }))
  const max = Math.max(0, ...gates.map((p) => p.list.length))
  for (let i = 0; i < max; i += 1) {
    gates.forEach((p) => {
      if (p.list[i]) ordered.push({ url: p.list[i], group: p.name })
    })
  }
  rest.forEach((p) => p.list.forEach((url) => ordered.push({ url, group: p.name })))
  queue.push(...ordered)

  state.phase = 'core'
  notify()
  pump()
}

/* ───────────────────────── 队列执行 ───────────────────────── */

function detectNetwork() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  const slow = Boolean(conn?.saveData) || /(^|-)2g$/.test(conn?.effectiveType || '')
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  baseConcurrency = slow ? 2 : coarse ? 4 : 6
  deepAllowed = !slow && !coarse
}

function decodeImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    try {
      ;(img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = state.urgent ? 'auto' : 'low'
    } catch {
      /* 老浏览器忽略 */
    }
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const guard = window.setTimeout(done, 8000) // 单张失败不拖垮门禁
    img.onload = () => {
      const d = img.decode?.()
      if (d) d.then(() => { window.clearTimeout(guard); done() }, () => { window.clearTimeout(guard); done() })
      else { window.clearTimeout(guard); done() }
    }
    img.onerror = () => { window.clearTimeout(guard); done() }
    img.src = url
    if (img.complete && img.naturalWidth > 0) { window.clearTimeout(guard); done() }
  })
}

const whenIdle = (fn: () => void) => {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback
  if (state.urgent || !ric) window.setTimeout(fn, 0)
  else ric(fn, { timeout: 900 })
}

function finishTask(t: Task) {
  running -= 1
  state.done += 1
  const g = groupMeta.get(t.group)
  if (g) {
    g.done += 1
    if (g.done >= g.total) g.resolve()
  }
  notify()
  pump()
}

function pump() {
  const limit = state.urgent ? Math.max(baseConcurrency + 2, 8) : baseConcurrency
  while (running < limit && queue.length) {
    const t = queue.shift()!
    running += 1
    const run = () => { void decodeImage(t.url).then(() => finishTask(t)) }
    // core / gate 直接跑，warm / deep 让出空闲时间
    if (state.urgent || t.group === 'core' || t.group.startsWith('gate:')) run()
    else whenIdle(run)
  }
}

/** 用户刚点了某分区：把它的门禁任务提到队首 */
function prioritize(sectionId: string) {
  const keys = new Set([`gate:${sectionId}`, 'core'])
  const picked: Task[] = []
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    if (keys.has(queue[i].group)) picked.unshift(queue.splice(i, 1)[0])
  }
  queue.unshift(...picked)
}

/* ───────────────────────── 对外 API ───────────────────────── */

function loadManifest(): Promise<Manifest> {
  if (manifestPromise) return manifestPromise
  manifestPromise = fetch('/prewarm-manifest.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('manifest ' + r.status))))
    .then((m) => (m && Array.isArray(m.core) ? (m as Manifest) : FALLBACK))
    .catch(() => FALLBACK)
  return manifestPromise
}

/** 由 App 注册「分区 chunk 预取函数」，保证只下载一次 */
export function registerChunkLoader(fn: () => Promise<unknown>) {
  chunkLoader = fn
}

function startChunks() {
  if (chunkPromise || !chunkLoader) return chunkPromise ?? Promise.resolve()
  state.phase = 'chunks'
  chunkPromise = chunkLoader()
    .then(() => { state.chunkReady = true })
    .catch(() => { state.chunkReady = true }) // 失败也不锁死门禁
    .finally(notify)
  return chunkPromise
}

/** 首屏渲染完成后调用：等首帧画完 + 一小段空闲再启动，不与启动动画抢带宽 */
export function startPrewarm() {
  if (started) return
  started = true
  detectNetwork()

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) baseConcurrency = Math.min(baseConcurrency, 2)
    else detectNetwork()
  })

  window.setTimeout(() => {
    void startChunks()
    void loadManifest().then((m) => {
      detectNetwork()
      buildQueue(m)
      state.phase = 'warm'
      notify()
    })
  }, 600)
}

const withTimeout = (p: Promise<unknown>, ms: number) =>
  Promise.race([p, new Promise<void>((r) => window.setTimeout(r, ms))])

/**
 * 过场门禁：chunk + core + 目标分区 gate 全部解码完成才 resolve。
 * 12s 兜底，404 / 弱网 / manifest 缺失都不会把舱门锁死。
 */
export async function ensureReady(sectionId: string): Promise<void> {
  if (!started) startPrewarm()
  state.urgent = true
  void startChunks()

  try {
    const m = await loadManifest()
    detectNetwork()
    buildQueue(m) // 深链预览时可能比首屏定时器更早，这里兜底
    prioritize(sectionId)
    pump()
    const g = group(`gate:${sectionId}`, 0)
    const c = group('core', 0)
    notify()
    await withTimeout(
      Promise.all([chunkPromise ?? Promise.resolve(), g.promise, c.promise]),
      12000
    )
  } catch {
    /* 兜底放行 */
  }
}
