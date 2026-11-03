/** 诊断：在 Node 中渲染小说分区 DocView 与 NovelCatalog，捕获渲染期错误 */
import { renderToString } from 'react-dom/server'
import DocView from '../src/components/DocView'
import NovelCatalog from '../src/components/NovelCatalog'
import { sectionSlots } from '../src/data/sections'
import { NOVEL_CATEGORIES, getNovelStory } from '../src/data/novels'

function tryRender(name: string, el: React.ReactElement) {
  try {
    const html = renderToString(el)
    console.log(`[OK] ${name} — html length ${html.length}`)
    return html
  } catch (e) {
    console.error(`[FAIL] ${name}:`, e)
    return ''
  }
}

// 1) 小说分区首页（后记）
const novelSlot = sectionSlots[1]
tryRender('DocView/novel-landing', (
  <DocView slot={novelSlot} slots={sectionSlots} onHome={() => {}} onPick={() => {}} />
))

// 2) 小说阅读态（带 storyId 的等价渲染：直接渲染一篇）
const first = NOVEL_CATEGORIES[0]?.stories[0]
if (first) console.log('[INFO] first story:', first.id, first.title, 'paras:', first.paragraphs.length)

// 3) getNovelStory 抽查
const probe = getNovelStory('novel-0-0')
console.log('[INFO] getNovelStory(novel-0-0):', probe?.title)

// 4) 目录弹窗展开态
tryRender('NovelCatalog/open', <NovelCatalog open onClose={() => {}} onOpenStory={() => {}} />)

// 5) 履历分区回归
tryRender('DocView/resume', (
  <DocView slot={sectionSlots[0]} slots={sectionSlots} onHome={() => {}} onPick={() => {}} />
))

console.log('[DONE] ssr-check finished')
