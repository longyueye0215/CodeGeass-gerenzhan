"""精细提取《星月集·修订版.docx》：
- 分类标题在文本框内：深入收集嵌套 w:p（仅样式1），按文档顺序
- 正文段落跳过文本框，避免装饰文字混入
- 8 个分类取首次出现者为真实分辑起点；后记单独归档并拆出署名
输出 scripts/novel_stories.json
"""
import zipfile, json
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
PATH = r'C:\Users\MR\Desktop\通用\新约\星月集·校订完成版\星月集·修订版.docx'

CATEGORIES = ['诗作', '战国物语', '王道', '骑士物语', '原创短篇', '历史同人', '游戏同人', '二创同人']
AFTERWORD_TITLE = '后记'


def para_text(p, include_textbox=False):
    parts = []

    def walk(el):
        if el.tag == W + 'txbxContent' and not include_textbox:
            return
        if el.tag == W + 't':
            parts.append(el.text or '')
        elif el.tag in (W + 'br', W + 'cr'):
            parts.append('\n')
        elif el.tag == W + 'tab':
            parts.append(' ')
        for c in el:
            walk(c)

    walk(p)
    return ''.join(parts)


def para_style(p):
    pPr = p.find(W + 'pPr')
    if pPr is not None:
        pStyle = pPr.find(W + 'pStyle')
        if pStyle is not None:
            return pStyle.get(W + 'val', '')
    return ''


with zipfile.ZipFile(PATH) as z:
    root = ET.fromstring(z.read('word/document.xml'))
body = root.find(W + 'body')

items = []  # (style, text, nested)


def nested_headings(el, out):
    """收集文本框内嵌套的样式1段落（分类标题）。"""
    for desc in el.iter(W + 'p'):
        if desc is el:
            continue
        st = para_style(desc)
        if st == '1':
            out.append((st, para_text(desc), True))


tbl_count = 0
for child in body:
    if child.tag == W + 'p':
        items.append((para_style(child), para_text(child), False))
        nested_headings(child, items)
    elif child.tag == W + 'tbl':
        tbl_count += 1
        for tr in child.findall(W + 'tr'):
            cells = []
            for tc in tr.findall(W + 'tc'):
                cell_text = '\n'.join(para_text(p) for p in tc.findall(W + 'p'))
                cells.append(cell_text)
            items.append(('', ' | '.join(cells), False))
print('items:', len(items), 'tables:', tbl_count)

# 1) 分类真实起点 = 首次出现
seen_cats = set()
cat_start_idx = {}
for i, (style, text, nested) in enumerate(items):
    t = text.strip()
    if style == '1' and t in CATEGORIES and t not in seen_cats:
        seen_cats.add(t)
        cat_start_idx[t] = i
print('category starts:', {c: cat_start_idx.get(c) for c in CATEGORIES})

# 2) 小说标题 = 正文级样式2
story_titles = []  # (idx, title)
for i, (style, text, nested) in enumerate(items):
    t = text.strip()
    if style == '2' and t and not nested:
        story_titles.append((i, t))
print('story-level titles:', len(story_titles))

# 3) 构建故事
cat_start_set = set(cat_start_idx.values())
stories = []
afterword = None
for k, (idx, title) in enumerate(story_titles):
    end = story_titles[k + 1][0] if k + 1 < len(story_titles) else len(items)
    # 当前分类 = idx 之前最近的真实分类起点
    cur_cat = None
    for c, ci in cat_start_idx.items():
        if ci < idx and (cur_cat is None or ci > cat_start_idx[cur_cat]):
            cur_cat = c
    content = []
    for j in range(idx + 1, end):
        style, text, nested = items[j]
        t = text.strip()
        if not t:
            continue
        if style == '1' and t in CATEGORIES:
            continue
        if j in cat_start_set:
            break  # 到达下一分辑起点，正文结束
        for line in text.split('\n'):
            line = line.strip()
            if line:
                content.append(line)
    if title == AFTERWORD_TITLE:
        signature = ''
        if content and content[-1].startswith('胧月夜于'):
            signature = content.pop()
        afterword = {'title': title, 'paragraphs': content, 'signature': signature}
        continue
    stories.append({'title': title, 'category': cur_cat,
                    'paragraphs': content, 'chars': sum(len(p) for p in content)})

print('total stories:', len(stories))
by_cat = {}
for s in stories:
    by_cat.setdefault(s['category'], []).append(s)
for c in CATEGORIES:
    lst = by_cat.get(c, [])
    print(f'\n== {c} ({len(lst)}) ==')
    for s in lst:
        print(f"    {s['title']}  ({s['chars']}字/{len(s['paragraphs'])}段)")

empties = [s['title'] for s in stories if not s['paragraphs']]
print('\nempty stories:', empties)
suspicious = [s['title'] for s in stories
              if any(('星月集' in p or p.strip() in CATEGORIES or '后记' in p)
                     for p in s['paragraphs'])]
print('suspicious stories:', suspicious)
lens = [s['chars'] for s in stories]
print('chars min/max/avg:', min(lens), max(lens), sum(lens) // len(lens))

json.dump({'stories': stories, 'afterword': afterword},
          open('scripts/novel_stories.json', 'w', encoding='utf-8'),
          ensure_ascii=False)
print('\nafterword:', len(afterword['paragraphs']), '段, signature:', afterword['signature'])
