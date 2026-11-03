const fs = require('fs')
const path = require('path')

const manifest = JSON.parse(fs.readFileSync('C:/tmp/travel_manifest.json', 'utf8'))

const META = [
  { cn: '上海', geo: '上海市', code: 'SHA', en: 'SHANGHAI' },
  { cn: '四川', geo: '四川省', code: 'CTU', en: 'SICHUAN' },
  { cn: '重庆', geo: '重庆市', code: 'CKG', en: 'CHONGQING' },
  { cn: '陕西', geo: '陕西省', code: 'SIA', en: 'SHAANXI' },
  { cn: '广东', geo: '广东省', code: 'CAN', en: 'GUANGDONG' },
  { cn: '香港', geo: '香港特别行政区', code: 'HKG', en: 'HONG KONG' },
]

const regions = META.map((m) => {
  const r = manifest[m.cn]
  const spots = []
  for (const e of r.entries) if (!spots.includes(e.spot)) spots.push(e.spot)
  return {
    ...m,
    slug: r.slug,
    spots,
    photos: r.entries.map((e) => `/images/travel/${r.slug}/${e.file}`),
  }
})

const L = []
L.push('/* 旅行分区：六个到访地区的照片清单（由 scripts/gen_travel_data.cjs 生成） */')
L.push('export interface TravelRegion {')
L.push('  /** 中文简称，显示用 */')
L.push('  label: string')
L.push('  /** 与 chinaGeo 中的要素名称对应 */')
L.push('  geo: string')
L.push('  code: string')
L.push('  en: string')
L.push('  slug: string')
L.push('  spots: string[]')
L.push('  photos: string[]')
L.push('}')
L.push('')
L.push('/** 单段画廊的照片上限，超出后自动续接下一段 */')
L.push('export const SEGMENT_CAP = 40')
L.push('')
L.push('export const TRAVEL_REGIONS: TravelRegion[] = [')
for (const r of regions) {
  L.push('  {')
  L.push(`    label: '${r.cn}',`)
  L.push(`    geo: '${r.geo}',`)
  L.push(`    code: '${r.code}',`)
  L.push(`    en: '${r.en}',`)
  L.push(`    slug: '${r.slug}',`)
  L.push(`    spots: [${r.spots.map((s) => `'${s}'`).join(', ')}],`)
  L.push('    photos: [')
  for (let i = 0; i < r.photos.length; i += 6) {
    L.push('      ' + r.photos.slice(i, i + 6).map((p) => `'${p}'`).join(', ') + ',')
  }
  L.push('    ],')
  L.push('  },')
}
L.push(']')
L.push('')

const out = path.resolve('C:/Users/MR/WorkBuddy/个人站-react/src/data/travel.ts')
fs.writeFileSync(out, L.join('\n'), 'utf8')
console.log(
  regions.map((r) => `${r.cn}:${r.photos.length}张/${Math.ceil(r.photos.length / 40)}段`).join('  ')
)
console.log('KB:', Math.round(fs.statSync(out).size / 1024))
