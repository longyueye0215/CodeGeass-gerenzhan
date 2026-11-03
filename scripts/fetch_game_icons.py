# -*- coding: utf-8 -*-
"""按游戏名从 App Store（中国区）取官方图标，统一处理成 256×256，并生成数据文件。"""
import io
import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from PIL import Image

OUT_DIR = "public/images/games"
DATA = "src/data/games.ts"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

GAMES = [
    "王者荣耀", "原神", "影之诗", "影之诗2", "阴阳师", "我的世界", "忘却前夜", "雀魂",
    "战双帕米什", "血族", "以闪亮之名", "少女战争", "少女回战", "重返未来1999", "无期迷途",
    "棕色尘埃2", "星之后裔2", "国际象棋", "明日方舟", "鸣潮", "phigros", "白夜极光",
    "nikke·胜利女神", "赛马娘", "时之幻想曲", "碧蓝航线", "第七史诗", "初音未来·世界计划",
    "bangdream", "影之刃3", "崩坏3", "决战平安京", "信长之野望", "彼界", "明日之后", "光遇",
    "第五人格", "植物大战僵尸", "植物大战僵尸2", "喵斯快跑", "地铁跑酷", "神庙逃亡",
    "滑雪大冒险", "元气骑士", "明日方舟·终末地", "迷你世界", "和平精英", "永劫无间",
    "歧路旅人·大陆的霸者", "2.5次元的诱惑", "想要成为影之实力者", "月圆之夜", "狼人杀",
    "阴阳师·百闻牌", "阴阳师·妖怪屋", "艾希", "饥荒", "部落冲突", "皇室战争", "奥奇传说",
    "火柴人联盟", "火柴人联盟3", "暗影格斗", "奥特曼格斗进化0", "奥特曼格斗进化3",
    "开心消消乐", "摩尔庄园", "三国志幻想大陆", "保卫萝卜", "保卫萝卜3", "辐射避难所",
    "60s生存", "活下去", "熊大快跑", "汤姆猫跑酷", "我的汤姆猫", "我的安吉拉", "小小梦魇",
    "疯狂动物园", "饥饿鲨", "滚动的天空", "FGO", "坎特伯雷公主与骑士唤醒冠军之剑的奇幻冒险",
    "弓箭手大作战", "登山赛车", "行界", "少女前线·云图计划", "恐怖奶奶", "永远的七日之都",
    "他人世界末", "灵魂潮汐", "球球大作战", "约战·精灵再临", "天天酷跑", "qq飞车",
    "胡桃日记", "旅行青蛙", "哈利波特·魔法觉醒", "创造与魔法", "奶块", "王者荣耀·世界",
    "崩坏·星穹铁道", "猫之城", "一念逍遥", "玩具熊的五夜后宫", "杀戮尖塔", "鹅鸭杀",
    "深空之夜", "天命之子",
]

# App Store 里精确对应的 App 名（避免被同名无关 App 顶掉）
FORCE_APP = {
    "地铁跑酷": "Subway Surfers",
    "饥荒": "Don't Starve",
    "杀戮尖塔": "Slay the Spire",
    "恐怖奶奶": "Granny",
    "雀魂": "雀魂",
    "奶块": "奶块",
    "星之后裔2": "ASTRA",
    "天命之子": "Destiny Child",
    "部落冲突": "Clash of Clans",
    "皇室战争": "Clash Royale",
    "艾希": "ICEY",
}

# 这些在 B 站找不到像样的官方头像，宁可用文字牌，也别放个默认头像
NO_BILI = {
    "雀魂", "忘却前夜", "少女回战", "奥特曼格斗进化3", "星之后裔2",
    "奶块", "2.5次元的诱惑", "时之幻想曲", "天命之子", "杀戮尖塔",
}

# App Store 上名字不一样的，补一份别名再搜
ALIASES = {
    "地铁跑酷": ["Subway Surfers"],
    "部落冲突": ["Clash of Clans"],
    "皇室战争": ["Clash Royale"],
    "饥荒": ["Don't Starve", "饥荒"],
    "艾希": ["ICEY"],
    "赛马娘": ["赛马娘 Pretty Derby", "Uma Musume"],
    "雀魂": ["雀魂麻将", "Mahjong Soul"],
    "战双帕米什": ["战双帕弥什"],
    "少女战争": ["少女战争"],
    "少女回战": ["少女回战"],
    "棕色尘埃2": ["Brown Dust 2", "棕色尘埃2"],
    "白夜极光": ["Alchemy Stars", "白夜极光"],
    "nikke·胜利女神": ["NIKKE", "胜利女神：妮姬"],
    "时之幻想曲": ["时之幻想曲"],
    "初音未来·世界计划": ["初音未来：缤纷舞台", "Project SEKAI"],
    "bangdream": ["BanG Dream"],
    "决战平安京": ["决战！平安京"],
    "彼界": ["彼界"],
    "忘却前夜": ["忘却前夜", "Morimens"],
    "想要成为影之实力者": ["想要成为影之实力者"],
    "2.5次元的诱惑": ["2.5次元的诱惑"],
    "奥特曼格斗进化0": ["奥特曼", "Ultraman"],
    "奥特曼格斗进化3": ["奥特曼", "Ultraman"],
    "60s生存": ["60 Seconds", "60秒"],
    "活下去": ["活下去", "Live or Die"],
    "熊大快跑": ["熊出没", "熊大快跑"],
    "汤姆猫跑酷": ["汤姆猫跑酷", "Talking Tom"],
    "疯狂动物园": ["疯狂动物园", "Rodeo Stampede"],
    "恐怖奶奶": ["Granny"],
    "永远的七日之都": ["永远的7日之都", "七日之都"],
    "他人世界末": ["他人世界末"],
    "旅行青蛙": ["旅行青蛙", "旅かえる"],
    "奶块": ["奶块"],
    "玩具熊的五夜后宫": ["Five Nights at Freddy"],
    "杀戮尖塔": ["Slay the Spire"],
    "深空之夜": ["深空之眼"],
    "天命之子": ["Destiny Child", "天命之子"],
    "奥奇传说": ["奥奇传说", "奥奇传说：手游"],
    "星之后裔2": ["星之后裔", "ASTRA"],
    "少女战争": ["少女战争"],
    "FGO": ["命运-冠位指定", "Fate Grand Order"],
    "qq飞车": ["QQ飞车"],
    "永远的七日之都": ["永远的7日之都"],
    "恐怖奶奶": ["Granny"],
    "玩具熊的五夜后宫": ["Five Nights at Freddy", "玩具熊的五夜后宫"],
    "杀戮尖塔": ["Slay the Spire"],
    "深空之夜": ["深空之眼"],
    "天命之子": ["Destiny Child"],
    "旅行青蛙": ["旅行青蛙：中国之旅"],
    "疯狂动物园": ["疯狂动物园"],
    "奶块": ["奶块"],
    "天天酷跑": ["天天酷跑"],
    "他人世界末": ["他人世界末"],
    "影之诗2": ["影之诗：超凡世界", "Shadowverse Worlds Beyond"],
    "星之后裔2": ["星之后裔", "ASTRA Knights of Veda"],
    "2.5次元的诱惑": ["2.5次元的诱惑"],
    "想要成为影之实力者": ["想要成为影之实力者"],
    "彼界": ["彼界"],
    "信长之野望": ["信长之野望"],
    "影之刃3": ["影之刃3"],
    "奥特曼格斗进化0": ["奥特曼格斗进化"],
    "奥特曼格斗进化3": ["奥特曼格斗进化"],
    "60s生存": ["60秒", "60 Seconds"],
}

# 名字里带「·」的，搜索时按整体或前后段都试一次
def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).lower()
    return re.sub(r"[\s·\-_:：·・.]+", "", s)


def search(term: str):
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(
        {"term": term, "country": "cn", "entity": "software", "limit": 8}
    )
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.loads(r.read().decode())
            results = data.get("results", [])
            if results or attempt == 3:
                return results
        except Exception:
            pass
        time.sleep(2.5 * (attempt + 1))
    return []


def art_url(item):
    url = item.get("artworkUrl512") or item.get("artworkUrl100") or ""
    url = url.replace("100x100bb", "512x512bb").replace("512x512bb.jpg", "512x512bb.png")
    return url


def pick(results, name):
    force = FORCE_APP.get(name)
    if force:
        key = force.lower()
        for r in results:
            if key in (r.get("trackName") or "").lower():
                return r
    target = norm(name)
    best, best_score = None, 0.0
    for r in results:
        title = norm(r.get("trackName") or "")
        if not title:
            continue
        if title == target:
            return r
        if target in title or title in target:
            score = min(len(title), len(target)) / max(len(title), len(target))
            if score > best_score:
                best, best_score = r, score
    return best if best_score >= 0.45 else None


def http_json(url, referer="https://search.bilibili.com/"):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": referer, "Cookie": BILI_COOKIE[0]})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode())
        except Exception:
            time.sleep(1.5)
    return {}


BILI_COOKIE = [""]


def bili_cookie():
    if BILI_COOKIE[0]:
        return BILI_COOKIE[0]
    try:
        d = http_json("https://api.bilibili.com/x/frontend/finger/spi", "https://www.bilibili.com/")
        data = d.get("data") or {}
        BILI_COOKIE[0] = f"buvid3={data.get('b_3','')}; buvid4={data.get('b_4','')}"
    except Exception:
        pass
    return BILI_COOKIE[0]


def bili_icon(name: str):
    """App Store 没有的，退而取 B 站官方账号头像。"""
    bili_cookie()
    for term in [name] + ALIASES.get(name, []):
        url = "https://api.bilibili.com/x/web-interface/search/type?" + urllib.parse.urlencode(
            {"search_type": "bili_user", "keyword": term, "page": 1}
        )
        d = http_json(url)
        users = ((d.get("data") or {}).get("result") or [])
        target = norm(term)
        best, score = None, 0.0
        for u in users:
            uname = norm(u.get("uname") or "")
            if not uname:
                continue
            if uname == target:
                best, score = u, 2.0
                break
            if target in uname or uname in target:
                sc = min(len(uname), len(target)) / max(len(uname), len(target))
                if sc > score:
                    best, score = u, sc
        if best and score >= 0.5:
            pic = best.get("upic") or ""
            if pic.startswith("//"):
                return "https:" + pic
        time.sleep(0.6)
    return None


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def text_tile(name: str, path: str):
    """实在找不到官方图标的，用文字牌占位，尺寸与其它图标一致。"""
    from PIL import ImageDraw, ImageFont
    im = Image.new("RGB", (256, 256), (10, 16, 26))
    d = ImageDraw.Draw(im)
    for y in range(256):
        shade = int(10 + 14 * (y / 255))
        d.line([(0, y), (256, y)], fill=(shade, shade + 4, shade + 12))
    d.rectangle([0, 0, 255, 255], outline=(52, 78, 112), width=2)
    font = None
    for f in ("C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/simhei.ttf"):
        try:
            font = ImageFont.truetype(f, 34 if len(name) <= 5 else 26)
            break
        except Exception:
            continue
    if font:
        lines = [name[i : i + 5] for i in range(0, len(name), 5)][:3]
        total = len(lines) * 40
        y = 128 - total // 2
        for line in lines:
            w = d.textlength(line, font=font)
            d.text((128 - w / 2, y), line, font=font, fill=(168, 198, 232))
            y += 40
    im.save(path, quality=90)


def square(raw: bytes) -> Image.Image:
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))
    bg = Image.new("RGB", (256, 256), (8, 12, 18))
    im = im.resize((256, 256), Image.LANCZOS)
    bg.paste(im, (0, 0), im)
    return bg


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    entries, missed = [], []
    for i, name in enumerate(GAMES):
        gid = f"g{i + 1:03d}"
        path = os.path.join(OUT_DIR, f"{gid}.jpg")
        if os.path.exists(path) and os.path.getsize(path) > 2000:
            entries.append({"id": gid, "name": name, "app": "", "file": f"{gid}.jpg"})
            continue
        hit = None
        terms = [name] + ALIASES.get(name, [])
        if "·" in name:
            terms += [p for p in name.split("·") if len(p) >= 2]
        for term in terms:
            try:
                results = search(term)
            except Exception:
                results = []
            hit = pick(results, term) or pick(results, name)
            if hit:
                break
            time.sleep(0.9)
        if not hit:
            icon = None
            if name not in NO_BILI:
                try:
                    icon = bili_icon(name)
                except Exception:
                    icon = None
            if icon:
                try:
                    square(download(icon)).save(path, quality=90, optimize=True)
                    entries.append({"id": gid, "name": name, "app": "", "file": f"{gid}.jpg"})
                    print(f"{gid} ✓ {name}  ← B站头像")
                    continue
                except Exception:
                    pass
            text_tile(name, path)
            entries.append({"id": gid, "name": name, "app": "", "file": f"{gid}.jpg"})
            missed.append(name)
            print(f"{gid} ○ {name}  ← 文字占位")
            continue
        try:
            img = square(download(art_url(hit)))
            img.save(path, quality=90, optimize=True)
            entries.append({"id": gid, "name": name, "app": hit.get("trackName", ""), "file": f"{gid}.jpg"})
            print(f"{gid} ✓ {name}  ← {hit.get('trackName','')[:24]}")
        except Exception as e:
            missed.append(name)
            print(f"{gid} ✗ {name} 下载失败 {type(e).__name__}")
        time.sleep(0.9)

    body = ",\n".join(
        "  { id: '%s', name: '%s', src: '/images/games/%s' }" % (e["id"], e["name"], e["file"])
        for e in entries
    )
    ts = """/**
 * 游戏分区图标墙：图标来自 App Store 中国区官方商店图，统一裁成 256×256。
 * 此文件由 scripts/fetch_game_icons.py 生成。
 */

export interface GameIcon {
  id: string
  name: string
  src: string
}

export const GAME_ICONS: GameIcon[] = [
__BODY__
]
""".replace("__BODY__", body)
    open(DATA, "w", encoding="utf-8").write(ts)
    print(f"\n成功 {len(entries)} / {len(GAMES)}，缺失 {len(missed)}")
    if missed:
        print("缺失：", "、".join(missed))


if __name__ == "__main__":
    main()
