/**
 * 由 DataV.GeoAtlas 全国省级边界（含台湾省、南海诸岛九段线）生成
 * 供粒子地图使用的精简几何数据。
 * 主图只含纬度 ≥ 17.5° 的陆地（大陆 + 台湾 + 海南主岛 + 港澳），
 * 南海诸岛与九段线按官方地图惯例收进右下角插图框。
 */
const fs = require('fs')
const path = require('path')

const raw = JSON.parse(
  fs.readFileSync('C:/Users/MR/AppData/Local/Temp/china.json', 'utf8')
)
const W = 1000
const EPS = 0.8
const MIN_AREA = 0.6
const SEA_LAT = 17.5 // 低于此纬度的岛礁进入插图

const R = Math.PI / 180
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * R) / 2))

const feats = raw.features.map((f) => {
  const rings = []
  const polys =
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  for (const poly of polys) for (const ring of poly) rings.push(ring)
  return {
    name: f.properties.name || '南海诸岛',
    adcode: f.properties.adcode,
    isDash: f.properties.adcode === '100000_JD',
    rings,
  }
})

function bboxOf(rings) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const ring of rings)
    for (const [lon, lat] of ring) {
      if (lon < x0) x0 = lon
      if (lon > x1) x1 = lon
      if (lat < y0) y0 = lat
      if (lat > y1) y1 = lat
    }
  return { x0, y0, x1, y1 }
}

// 拆分：主图陆地 vs 南海插图
const mainRings = []
const seaRings = []
for (const f of feats) {
  if (f.isDash) {
    f.rings.forEach((ring) => seaRings.push(ring))
    continue
  }
  for (const ring of f.rings) {
    const b = bboxOf([ring])
    if (b.y1 >= SEA_LAT) mainRings.push({ name: f.name, ring })
    else seaRings.push(ring)
  }
}

// 主图墨卡托范围
const mb = bboxOf(mainRings.map((r) => r.ring))
const mx0 = mb.x0 * R
const mx1 = mb.x1 * R
const my0 = mercY(mb.y0)
const my1 = mercY(mb.y1)
const spanX = mx1 - mx0
const H = Math.round(((my1 - my0) / spanX) * W)

const projMain = ([lon, lat]) => [
  ((lon * R - mx0) / spanX) * W,
  ((my1 - mercY(lat)) / spanX) * W,
]

// 插图框：右下角
const PAD = 16
const BOX_W = 150
const sb = bboxOf(seaRings)
const sx0 = sb.x0 * R
const sx1 = sb.x1 * R
const sy1 = mercY(sb.y1)
const sSpanX = sx1 - sx0
const sSpanY = sy1 - mercY(sb.y0)
const BOX_H = Math.round(BOX_W * (sSpanY / sSpanX))
const boxX = W - PAD - BOX_W
const boxY = H - PAD - BOX_H
const projSea = ([lon, lat]) => [
  boxX + ((lon * R - sx0) / sSpanX) * BOX_W,
  boxY + ((sy1 - mercY(lat)) / sSpanX) * BOX_W,
]

// RDP 简化
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dx * (a[1] - p[1]) - (b[0] - a[0]) * (a[0] - p[0])) / len
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts
  let maxD = 0, idx = 0
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1])
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD > eps) {
    const l = rdp(pts.slice(0, idx + 1), eps)
    const r = rdp(pts.slice(idx), eps)
    return l.slice(0, -1).concat(r)
  }
  return [pts[0], pts[pts.length - 1]]
}
function ringArea(pts) {
  let a = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]
  return Math.abs(a / 2)
}

// 组装主图各省级单元
const byName = new Map()
for (const { name, ring } of mainRings) {
  if (!byName.has(name)) byName.set(name, [])
  const xy = ring.map(projMain)
  if (xy.length < 4) continue
  const s = rdp(xy, EPS)
  if (s.length < 3) continue
  if (ringArea(s) >= MIN_AREA) byName.get(name).push(s)
}

// 省级主体过小的（如澳门）至少保留最大的一环，版图要素不可缺
for (const f of feats) {
  if (f.isDash || byName.has(f.name)) continue
  let best = null, bestArea = -1
  for (const ring of f.rings) {
    const b = bboxOf([ring])
    if (b.y1 < SEA_LAT) continue
    const s = rdp(ring.map(projMain), EPS / 2)
    if (s.length < 3) continue
    const a = ringArea(s)
    if (a > bestArea) { bestArea = a; best = s }
  }
  if (best) byName.set(f.name, [best])
}

const shapes = [...byName.entries()].map(([name, rings]) => ({ name, rings }))

// 插图环
const sea = []
for (const ring of seaRings) {
  const xy = ring.map(projSea)
  if (xy.length < 4) continue
  const s = rdp(xy, 0.35)
  if (s.length < 3) continue
  if (ringArea(s) < 0.05) continue
  sea.push(s)
}

function centroid(rings) {
  let best = null, bestArea = 0
  for (const r of rings) {
    const a = ringArea(r)
    if (a > bestArea) { bestArea = a; best = r }
  }
  if (!best) return [0, 0]
  let cx = 0, cy = 0, a = 0
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const f = best[j][0] * best[i][1] - best[i][0] * best[j][1]
    a += f
    cx += (best[j][0] + best[i][0]) * f
    cy += (best[j][1] + best[i][1]) * f
  }
  a *= 3
  if (a === 0) return best[0]
  return [cx / a, cy / a]
}

const centroids = {}
for (const s of shapes) centroids[s.name] = centroid(s.rings).map((v) => +v.toFixed(1))

const fmt = (v) => Math.round(v * 10) / 10
const L = []
L.push('/* 中国省级边界精简几何（源：DataV.GeoAtlas，含台湾省与南海诸岛）')
L.push('   主图不含南海诸岛，九段线与南沙岛礁收在 SEA_INSET 插图框内 */')
L.push('export interface ChinaShape {')
L.push('  name: string')
L.push('  rings: number[][]')
L.push('}')
L.push('')
L.push(`export const MAP_W = ${W}`)
L.push(`export const MAP_H = ${H}`)
L.push('')
L.push('export const SEA_INSET: { x: number; y: number; w: number; h: number; rings: number[][] } = {')
L.push(`  x: ${boxX},`)
L.push(`  y: ${boxY},`)
L.push(`  w: ${BOX_W},`)
L.push(`  h: ${BOX_H},`)
L.push('  rings: [')
for (const r of sea) L.push('    [' + r.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(',') + '],')
L.push('  ],')
L.push('}')
L.push('')
L.push('export const CHINA_SHAPES: ChinaShape[] = [')
for (const s of shapes) {
  const ringStr = s.rings
    .map((r) => '[' + r.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(',') + ']')
    .join(',\n      ')
  L.push(`  { name: '${s.name}', rings: [`)
  L.push('      ' + ringStr)
  L.push('  ] },')
}
L.push(']')
L.push('')
L.push('export const CHINA_CENTROIDS: Record<string, [number, number]> = {')
for (const [k, v] of Object.entries(centroids)) L.push(`  '${k}': [${v[0]}, ${v[1]}],`)
L.push('}')
L.push('')

const out = path.resolve('C:/Users/MR/WorkBuddy/个人站-react/src/data/chinaGeo.ts')
fs.writeFileSync(out, L.join('\n'), 'utf8')
console.log(
  'shapes:',
  shapes.length,
  'H:',
  H,
  'sea rings:',
  sea.length,
  'KB:',
  Math.round(fs.statSync(out).size / 1024)
)
