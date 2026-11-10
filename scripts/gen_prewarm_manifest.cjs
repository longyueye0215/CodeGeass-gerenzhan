/**
 * 生成 public/prewarm-manifest.json —— 分区资源预热清单。
 *
 * 为什么需要它：
 *   站点有 3280 张图片 / 127MB，全量预取会把访客带宽打爆。
 *   这里按「分区首屏可见」切出小清单，再由 prewarm.ts 在首屏空闲期
 *   分批解码；深内容只做低优先级后台补齐，不进入过场门禁。
 *
 * 运行：node scripts/gen_prewarm_manifest.cjs
 * （vite build 前由 npm run build 自动调用）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const IMG = path.join(ROOT, 'public', 'images')
const OUT = path.join(ROOT, 'public', 'prewarm-manifest.json')

const IMG_RE = /\.(jpe?g|png|webp|gif|avif)$/i

function list(dir) {
  const abs = path.join(IMG, dir)
  if (!fs.existsSync(abs)) return []
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (IMG_RE.test(e.name)) {
        out.push('/images/' + path.relative(IMG, p).split(path.sep).join('/'))
      }
    }
  }
  walk(abs)
  return out.sort()
}

const take = (arr, n) => arr.slice(0, n)
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)))

const planets = list('planet-clean')
const novels = list('novels')
const music = list('music')
const games = list('games')
const animeCovers = list('anime-covers')
const ukulele = list('ukulele')

/**
 * 游戏分区开场是「从 ANIME_SHOTS 随机抽 100 张」，
 * 预热清单必须沿用 src/data/animeShots.ts 的原始顺序，
 * 否则按文件名排序取前 N 张会和随机池对不上。
 */
const animeShots = (() => {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'src', 'data', 'animeShots.ts'), 'utf8')
    const found = Array.from(txt.matchAll(/src:\s*['"]([^'"]+)['"]/g)).map((m) => m[1])
    return found.length ? found : list('anime')
  } catch {
    return list('anime')
  }
})()
const travel = list('travel')

/** 旅行按地区各取前 N 张，保证点到任一省份都有首屏图可用 */
function travelHead(n) {
  const byRegion = new Map()
  for (const p of travel) {
    const m = p.match(/^\/images\/travel\/([^/]+)\//)
    if (!m) continue
    if (!byRegion.has(m[1])) byRegion.set(m[1], [])
    byRegion.get(m[1]).push(p)
  }
  const out = []
  for (const arr of byRegion.values()) out.push(...take(arr, n))
  return out
}

/** 与 src/data/sectionMedia.ts 的 HERO 顺序严格一致：0 履历 … 5 旅行 */
const HERO = [
  '/images/sections/resume.jpg',
  '/images/sections/novel.jpg',
  '/images/sections/music.jpg',
  '/images/sections/game.jpg',
  '/images/sections/anime.jpg',
  '/images/sections/travel.jpg'
]

/** 首页 / 控制台 / 文档页通用图，六个分区都会用到 */
const core = uniq([
  '/images/logo.png',
  '/images/logo-dark.png',
  '/images/logo-light.png',
  '/images/hero-moon.jpg',
  ...planets,
  ...HERO
])

/**
 * gate 清单：进入该分区时「必须已经解码完成」的图片。
 * 体积刻意压在 ~1–2MB/分区，配合首屏空闲预热，正常情况点击时已 100% 命中。
 */
const gate = {
  'slot-1': uniq([HERO[0], ...take(planets, 3)]),                                  // 履历
  'slot-2': uniq([HERO[1], ...take(novels, 8)]),                                   // 小说
  'slot-3': uniq([HERO[2], ...take(music, 3), ...take(ukulele, 8)]),               // 音乐
  'slot-4': uniq([HERO[3], ...take(games, 24)]),                                   // 游戏 · 图标墙
  'slot-5': uniq([HERO[4], ...take(animeCovers, 40), ...take(animeShots, 40)]),   // 追番 · 照片墙 + 评分表
  'slot-6': uniq([HERO[5], ...travelHead(6)])                                      // 旅行
}

/**
 * sections 清单：分区内继续滚动会看到的内容，空闲期后台补齐，不阻塞过场。
 */
const warm = {
  'slot-1': uniq([...planets, ...HERO]),
  'slot-2': uniq(novels),
  'slot-3': uniq([...music, ...take(ukulele, 60)]),
  'slot-4': uniq(games),
  // 追番开场照片墙的随机池被 DocView 限制在前 160 张，这里必须覆盖同一批
  'slot-5': uniq([...animeCovers, ...take(animeShots, 160)]),
  'slot-6': uniq(travelHead(18))
}

/** deep：只在网络条件好且页面可见时慢慢补，永不进门禁 */
const deep = {
  'slot-3': take(ukulele, 240),
  'slot-5': take(animeShots, 320),
  'slot-6': travelHead(36)
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  core,
  gate,
  sections: warm,
  deep
}

fs.writeFileSync(OUT, JSON.stringify(manifest))
const count = (o) => Object.values(o).reduce((n, a) => n + a.length, 0)
console.log(
  `[prewarm] core ${core.length} / gate ${count(gate)} / warm ${count(warm)} / deep ${count(deep)} -> ${path.relative(ROOT, OUT)}`
)
