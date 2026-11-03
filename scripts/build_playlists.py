# -*- coding: utf-8 -*-
"""把抓下来的 5 个收藏夹整理成 4 份歌单，生成 src/data/playlists.ts。"""
import json
import re
import unicodedata

SRC = "bili_fav.json"
OUT = "src/data/playlists.ts"

NOISE = [
    "无损", "音质", "无损音质", "高音质", "现场", "完整版", "官方", "MV", "Hi-Res", "HI-RES",
    "4K", "合集", "纯享", "歌词", "字幕", "修复", "版本", "中字", "搬运", "翻唱", "演唱会",
    "live", "Live", "LIVE", "百万", "录音棚", "大声听", "神级", "顶级", "画质", "动画",
    "主题曲", "片尾曲", "片头曲", "OST", "OP", "ED", "精选", "歌单", "耳机", "沉浸",
]

CJK = re.compile(r"[\u4e00-\u9fff]")
KANA = re.compile(r"[\u3040-\u30ff]")
EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F000-\U0001F2FF\U0000FE00-\U0000FE0F]"
)


def tidy(text: str) -> str:
    text = EMOJI.sub("", text)
    text = re.sub(r"[【】\[\]〖〗]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -—–|｜:：·,，。.~～")


# 整段装饰块（【】/[]/〖〗）连同内容一起丢掉
DECOR = re.compile(r"[【\[〖][^】\]〗]*[】\]〗]")
# 会污染歌手名的词，先剥掉再判断
STRIP_WORDS = [
    "百万豪装录音棚", "百万级录音棚", "录音棚", "大声听", "在", "试听", "珍藏", "顶级画质",
    "无损音质", "无损", "高音质", "音质", "官方", "完整版", "现场版", "现场", "演唱会",
    "每日粤语歌曲分享", "每日", "歌曲分享", "分享", "搬运", "中文字幕", "字幕", "修复",
    "合集", "精选", "歌单", "神曲", "经典", "老歌", "金曲", "音乐", "MV", "高清", "画质",
]
SENTENCE = re.compile(r"[，。！？；,.!?;~～]")
BAD = ["无损", "音质", "现场", "完整版", "官方", "MV", "合集", "演唱会", "画质", "字幕", "分享", "版"]


def pick_artist(before: str, after: str):
    for raw in (before, after):
        cand = DECOR.sub(" ", raw)
        cand = tidy(cand)
        cand = re.sub(r"^(by|BY|翻唱|cover)\s*", "", cand, flags=re.I)
        for w in STRIP_WORDS:
            cand = cand.replace(w, " ")
        cand = re.sub(r"\s+", " ", cand).strip(" -—–|｜:：·")
        if not (2 <= len(cand) <= 14):
            continue
        if any(n.lower() in cand.lower() for n in BAD):
            continue
        if SENTENCE.search(cand) or "《" in cand or "》" in cand:
            continue
        if not (CJK.search(cand) or re.search(r"[A-Za-z]", cand)):
            continue
        return cand
    return ""


def parse(title: str):
    """尽量从标题里拆出「歌名 / 歌手」。"""
    title = EMOJI.sub("", title).strip()
    m = re.search(r"《([^》]{1,40})》", title)
    if m:
        song = tidy(m.group(1))
        artist = pick_artist(title[: m.start()], title[m.end():])
        if song:
            return song, artist
    # 没有书名号：把标题当歌名，末尾去掉常见噪音
    song = tidy(title)
    if len(song) > 34:
        song = song[:34] + "…"
    return song, ""


def key_of(song: str, artist: str) -> str:
    raw = unicodedata.normalize("NFKC", song + "|" + artist).lower()
    return re.sub(r"[\s\W_]+", "", raw)


def main():
    folders = json.load(open(SRC, encoding="utf-8"))
    by_name = {f["folder"]: f["items"] for f in folders}

    buckets = {"中文": [], "粤语": [], "日语": [], "外语": []}
    direct = {
        "中文歌单": "中文",
        "粤语歌单": "粤语",
        "日语歌单": "日语",
        "外语歌单": "外语",
    }

    seen_bvid = set()
    seen_key = set()

    def push(bucket, item, song, artist):
        k = key_of(song, artist)
        bv = item["bvid"]
        if bv and bv in seen_bvid:
            return False
        if k in seen_key:
            return False
        if bv:
            seen_bvid.add(bv)
        seen_key.add(k)
        buckets[bucket].append({"t": song, "a": artist})
        return True

    for folder, bucket in direct.items():
        for it in by_name.get(folder, []):
            song, artist = parse(it["title"])
            if not artist:
                artist = it["author"]
            push(bucket, it, song, artist)

    # 时代的眼泪：按内容归到对应语种
    JP_HINTS = ("JOJO", "赛马娘", "米津玄师", "优俊少女")
    for it in by_name.get("时代的眼泪", []):
        song, artist = parse(it["title"])
        if not artist:
            artist = it["author"]
        text = it["title"]
        if any(h in text for h in JP_HINTS) or KANA.search(text):
            push("日语", it, song, artist)
        else:
            push("中文", it, song, artist)

    order = [
        ("zh", "中文歌单", "中文"),
        ("yue", "粤语歌单", "粤语"),
        ("jp", "日语歌单", "日语"),
        ("en", "外语歌单", "外语"),
    ]
    blocks = []
    for pid, label, bucket in order:
        items = buckets[bucket]
        rows = ",\n".join(
            "    { t: '%s', a: '%s' }" % (i["t"].replace("'", "\\'"), i["a"].replace("'", "\\'"))
            for i in items
        )
        blocks.append(
            "  {\n    id: '%s',\n    label: '%s',\n    items: [\n%s\n    ]\n  }"
            % (pid, label, rows)
        )
        print(f"{label}: {len(items)}")

    ts = """/**
 * 胧月夜の歌单：由 B 站公开收藏夹整理而来（中文/粤语/日语/外语 + 时代的眼泪按语种并入），
 * 全局去重，一条一首。此文件由 scripts/build_playlists.py 生成，请勿手改。
 */

export interface PlaylistTrack {{
  /** 曲目名 */
  t: string
  /** 歌手 */
  a: string
}}

export interface Playlist {{
  id: string
  label: string
  items: PlaylistTrack[]
}}

export const PLAYLISTS: Playlist[] = [
{body}
]
""".format(body=",\n".join(blocks))

    open(OUT, "w", encoding="utf-8").write(ts)
    print("写入", OUT)


if __name__ == "__main__":
    main()
