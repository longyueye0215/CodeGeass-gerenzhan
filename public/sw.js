/* eslint-disable no-restricted-globals */
/**
 * 个人站离线缓存层
 * ────────────────────────────────────────────────────────────
 * 与 prewarm.ts 分工：
 *   prewarm 负责「同一会话内」把图片解码进内存；
 *   SW 负责「跨会话 / 跨分区」把字节留在磁盘 Cache Storage。
 *
 * 保守策略（避免部署后看到旧版）：
 *   · HTML 导航一律 network-first，失败才回缓存
 *   · /assets /fonts 带 hash，cache-first + 永久缓存
 *   · 图片 stale-while-revalidate，条目上限 900
 *   · /preview/ 调试外壳、sw.js、清单文件完全不走缓存
 *   · 版本号来自注册 URL 的 ?v=，每次构建自动换桶并清掉旧桶
 */
const VERSION = new URL(self.location.href).searchParams.get('v') || '0'
const SHELL = 'lunar-shell-' + VERSION
const IMAGES = 'lunar-images-' + VERSION
const MAX_IMAGE_ENTRIES = 900

async function networkFirst(req, bucket) {
  const cache = await caches.open(bucket)
  try {
    const res = await fetch(req)
    if (res && res.ok) cache.put(req, res.clone())
    return res
  } catch (e) {
    return (await cache.match(req)) || (await cache.match('/index.html')) || Response.error()
  }
}

async function cacheFirst(req, bucket) {
  const cache = await caches.open(bucket)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res && res.ok) cache.put(req, res.clone())
  return res
}

async function trim(cache) {
  const keys = await cache.keys()
  if (keys.length <= MAX_IMAGE_ENTRIES) return
  const extra = keys.slice(0, keys.length - MAX_IMAGE_ENTRIES)
  await Promise.allSettled(extra.map((k) => cache.delete(k)))
}

async function staleWhileRevalidate(req, bucket) {
  const cache = await caches.open(bucket)
  const hit = await cache.match(req)
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok) {
        cache.put(req, res.clone())
        trim(cache)
      }
      return res
    })
    .catch(() => hit || Response.error())
  return hit || network
}

/** 从 index.html 里自动提取带 hash 的首屏 JS/CSS，不用手工维护清单 */
async function shellAssets() {
  const base = ['/', '/index.html', '/fonts/zpix.woff2', '/prewarm-manifest.json']
  try {
    const res = await fetch('/index.html', { cache: 'no-store' })
    const html = await res.text()
    const found = html.match(/\/assets\/[^"'\s<>]+?\.(?:js|css)/g) || []
    found.forEach((u) => base.push(u))
  } catch (e) {
    /* 离线安装时忽略 */
  }
  return Array.from(new Set(base))
}

/** 后台把 core + 六组门禁图片填进磁盘缓存，最多 360 条 */
async function primeImages() {
  try {
    const m = await fetch('/prewarm-manifest.json').then((r) => (r.ok ? r.json() : null))
    if (!m) return
    const list = Array.from(m.core || [])
    Object.values(m.gate || {}).forEach((arr) => list.push(...arr))
    const uniq = Array.from(new Set(list)).slice(0, 360)
    const cache = await caches.open(IMAGES)
    for (let i = 0; i < uniq.length; i += 6) {
      await Promise.allSettled(uniq.slice(i, i + 6).map((u) => cache.add(u)))
    }
  } catch (e) {
    /* 预缓存失败不影响页面 */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      const assets = await shellAssets()
      await Promise.allSettled(assets.map((u) => cache.add(new Request(u, { cache: 'reload' }))))
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      (async () => {
        const keys = await caches.keys()
        await Promise.all(
          keys
            .filter((k) => k.startsWith('lunar-') && k !== SHELL && k !== IMAGES)
            .map((k) => caches.delete(k))
        )
      })(),
      self.clients.claim(),
      primeImages() // claim 已立即发起，图片填充在后台保活进行
    ])
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.searchParams.has('nosw')) return // 预览套件「禁用缓存」开关
  const p = url.pathname
  if (p.startsWith('/preview/') || p === '/sw.js' || p === '/prewarm-manifest.json') return

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, SHELL))
  } else if (p.startsWith('/assets/') || p.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(req, SHELL))
  } else if (p.startsWith('/images/') || p.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(req, IMAGES))
  }
})
