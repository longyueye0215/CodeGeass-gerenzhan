const fs = require('fs')

const jobs = [
  {
    src: 'C:/Users/MR/Desktop/开屏文字.txt',
    out: 'src/components/CipherReveal.tsx',
    css: './CipherReveal.css',
    name: 'CipherReveal',
    root: 'cr-root',
    content: 'cr-content'
  },
  {
    src: 'C:/Users/MR/Desktop/星光点点开屏主页.txt',
    out: 'src/components/GlimmerWrap.tsx',
    css: './GlimmerWrap.css',
    name: 'GlimmerWrap',
    root: 'gw-root',
    content: 'gw-content'
  }
]

for (const j of jobs) {
  const raw = fs.readFileSync(j.src, 'utf8').replace(/\r\n/g, '\n')
  const lines = raw.split('\n')
  const start = lines.findIndex((l) => l.trim().startsWith('"use client"'))
  let src = lines.slice(start).join('\n')

  src = src.replace(/^\s*"use client";\s*/, '')
  src = src.replace(/import \{ cn \} from "@\/lib\/utils";\n/, '')
  src = src.replace(
    /(import \* as THREE from "three";\n)/,
    '$1import "' + j.css + '";\n'
  )

  // className={cn("...", className)} -> 语义类名
  src = src.replace(
    /className=\{cn\(\s*"([^"]*)"\s*,\s*className\s*\)\}/g,
    (_m, base) =>
      'className={[' +
      JSON.stringify(j.root) +
      ', ' +
      JSON.stringify(base) +
      ', className].filter(Boolean).join(" ")}'
  )
  src = src.replace(/"relative z-10[^"]*"/g, JSON.stringify(j.content))
  src = src.replace(/"absolute inset-0"/g, JSON.stringify(j.root + '-layer'))

  const marker = 'export default ' + j.name + ';'
  const end = src.indexOf(marker)
  if (end >= 0) src = src.slice(0, end + marker.length) + '\n'

  fs.writeFileSync(j.out, src.trimStart())
  console.log(j.out, 'lines', src.trim().split('\n').length)
  for (const k of ['cn(', '@/lib/utils', 'use client', 'relative z-10'])
    console.log('   ', k, src.includes(k))
}
