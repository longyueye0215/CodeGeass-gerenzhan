"""由 novel_stories.json 生成 src/data/novels.ts"""
import json

data = json.load(open('scripts/novel_stories.json', encoding='utf-8'))
CATEGORIES = ['诗作', '战国物语', '王道', '骑士物语', '原创短篇', '历史同人', '游戏同人', '二创同人']


def q(s):
    return json.dumps(s, ensure_ascii=False)


stories_by_cat = {}
for s in data['stories']:
    stories_by_cat.setdefault(s['category'], []).append(s)

out = []
out.append('/** 《星月集·修订版》小说数据 —— 由 scripts/gen_novels_ts.py 自动生成，请勿手改 */')
out.append('')
out.append('export interface NovelStory {')
out.append('  id: string')
out.append('  title: string')
out.append('  category: string')
out.append('  paragraphs: string[]')
out.append('}')
out.append('')
out.append('export interface NovelCategory {')
out.append('  id: string')
out.append('  label: string')
out.append('  stories: NovelStory[]')
out.append('}')
out.append('')

aw = data['afterword']
out.append('/** 小说分区首页展示的后记 */')
out.append('export const NOVEL_AFTERWORD = {')
out.append(f"  title: {q(aw['title'])},")
out.append('  paragraphs: [')
for p in aw['paragraphs']:
    out.append(f'    {q(p)},')
out.append('  ],')
out.append(f"  signature: {q(aw['signature'])},")
out.append('}')
out.append('')

out.append('export const NOVEL_CATEGORIES: NovelCategory[] = [')
for ci, cat in enumerate(CATEGORIES):
    lst = stories_by_cat.get(cat, [])
    out.append('  {')
    out.append(f'    id: {q(cat)},')
    out.append(f'    label: {q(cat)},')
    out.append('    stories: [')
    for si, s in enumerate(lst):
        out.append('      {')
        out.append(f"        id: {q(f'novel-{ci}-{si}')},")
        out.append(f"        title: {q(s['title'])},")
        out.append(f"        category: {q(cat)},")
        out.append('        paragraphs: [')
        for p in s['paragraphs']:
            out.append(f'          {q(p)},')
        out.append('        ],')
        out.append('      },')
    out.append('    ],')
    out.append('  },')
out.append(']')
out.append('')
out.append('export const ALL_NOVEL_STORIES: NovelStory[] = NOVEL_CATEGORIES.flatMap((c) => c.stories)')
out.append('')
out.append('export function getNovelStory(id: string): NovelStory | undefined {')
out.append('  return ALL_NOVEL_STORIES.find((s) => s.id === id)')
out.append('}')
out.append('')

src = '\n'.join(out)
open('src/data/novels.ts', 'w', encoding='utf-8').write(src)
print('written src/data/novels.ts,', len(src), 'chars')
