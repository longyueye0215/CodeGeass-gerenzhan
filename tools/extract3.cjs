const fs = require('fs')

const j = {
  src: 'C:/Users/MR/Desktop/星球版个人站/React bits pro组件代码/星际穿越动效.txt',
  out: 'src/components/GlitterWarp.tsx',
  css: './GlitterWarp.css',
  name: 'GlitterWarp',
  root: 'glw-root'
}

const raw = fs.readFileSync(j.src, 'utf8').replace(/\r\n/g, '\n')
const lines = raw.split('\n')
const start = lines.findIndex((l) => l.trim().startsWith('"use client"'))
let src = lines.slice(start).join('\n')

src = src.replace(/^\s*"use client";\s*/, '')
src = src.replace(/import \{ cn \} from "@\/lib\/utils";\n/, '')
src = src.replace(/(import \* as THREE from "three";\n)/, '$1import "' + j.css + '";\n')

src = src.replace(
  /className=\{cn\(\s*"([^"]*)"\s*,\s*className\s*\)\}/g,
  (_m, base) =>
    'className={[' +
    JSON.stringify(j.root) +
    ', ' +
    JSON.stringify(base) +
    ', className].filter(Boolean).join(" ")}'
)
src = src.replace(/"relative z-10[^"]*"/g, JSON.stringify(j.root + '-content'))
src = src.replace(/"absolute inset-0"/g, JSON.stringify(j.root + '-layer'))

const marker = 'export default ' + j.name
const idx = src.lastIndexOf(marker)
src = src.slice(0, idx) + src.slice(idx).split('\n').slice(0, 2).join('\n') + '\n'

fs.writeFileSync(j.out, src.trimStart())
console.log(j.out, 'lines', src.trim().split('\n').length)
for (const k of ['cn(', '@/lib/utils', 'use client', 'relative z-10'])
  console.log('   ', k, src.includes(k))
console.log('--- tail ---')
console.log(src.trim().split('\n').slice(-4).join('\n'))
