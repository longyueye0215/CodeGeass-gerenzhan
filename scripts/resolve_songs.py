# -*- coding: utf-8 -*-
"""把 B 站标题里的歌名拿到网易云反查「正式曲名 + 原唱」，查不到的整条丢弃。"""
import json
import os
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

SRC = "bili_fav.json"
CACHE = "songs_cache.json"
OUT = "src/data/playlists.ts"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# 手工剔除：曲名/歌手确认有问题的条目不进歌单
MANUAL_DROP = {
    ("听雨的声音一滴滴清晰 你的呼吸像雨滴渗入我的爱里", "新鲜怪兽"),
    ("怎么说我不爱你-萧敬腾", "猫爪音乐"),
    ("下个, 路口, 见", "李宇春"),
    ("I Really Want to Stay at Your House", "Rosa Walton/Hallie Coggins"),
}

BRACKETS = [
    re.compile(r"《([^》]{1,50})》"),
    re.compile(r"「([^」]{1,50})」"),
    re.compile(r"『([^』]{1,50})』"),
]
PAREN = re.compile(r"[（(\[][^）)\]]{0,40}[）)\]]")
KANA = re.compile(r"[\u3040-\u30ff]")
JP_HINTS = ("JOJO", "赛马场", "赛马娘", "优俊少女", "米津玄师", "YOASOBI", "宇多田")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).lower()
    return re.sub(r"[\s\W_]+", "", s)


def load_cache():
    if os.path.exists(CACHE):
        return json.load(open(CACHE, encoding="utf-8"))
    return {}


def search(name: str):
    url = "https://music.163.com/api/search/get?" + urllib.parse.urlencode(
        {"s": name, "type": 1, "limit": 10, "offset": 0}
    )
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Referer": "https://music.163.com/"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    result = data.get("result") or {}
    return result.get("songs") or []


def tidy_name(name: str) -> str:
    """去掉正式曲名后面的括号补充，例如「千本桜 (Senbonzakura)」→「千本桜」。"""
    return PAREN.sub("", name).strip() or name.strip()


def pack(song):
    artists = [a.get("name", "").strip() for a in (song.get("artists") or []) if a.get("name")]
    if not artists:
        return None
    return {"name": tidy_name(song["name"]), "artists": "/".join(artists[:3])}


MIN_MS = 946684800000  # 2000-01-01，早于此的发行时间都是脏数据


def ptime(song):
    album = song.get("album") or {}
    t = album.get("publishTime") or 0
    return t if t >= MIN_MS else 10 ** 13


def pick(cands):
    """同名（或高度相似）的多条里挑最早发行的那条——翻唱一定晚于原唱。"""
    if not cands:
        return None
    cands.sort(key=ptime)
    for c in cands:
        hit = pack(c)
        if hit:
            return hit
    return None


def lookup(name: str):
    try:
        songs = search(name)
    except Exception:
        return None
    target = norm(name)
    exact = [s for s in songs if norm(s.get("name") or "") == target]
    hit = pick(exact)
    if hit:
        return hit
    if len(target) >= 3:
        near = []
        for s in songs:
            n = norm(s.get("name") or "")
            if not n:
                continue
            if (n.startswith(target) or target.startswith(n)) and abs(len(n) - len(target)) <= 12:
                near.append(s)
        hit = pick(near)
        if hit:
            return hit
    return None


def variants(raw: str):
    out = []
    for v in (raw, PAREN.sub("", raw).strip()):
        v = v.strip(" ·-—–")
        if v and v not in out:
            out.append(v)
    return out


def song_of(title: str):
    """按出现顺序收集所有括号内容：一部动画名常常也套在《》里，
    所以不能只取第一个，要把「」『』里的真歌名也拿去试。"""
    hits = []
    for rx in BRACKETS:
        for m in rx.finditer(title):
            v = m.group(1).strip()
            if v:
                hits.append((m.start(), v))
    hits.sort(key=lambda x: x[0])
    out = []
    for _, v in hits:
        if v not in out:
            out.append(v)
    return out or None


def resolve(name, cache):
    names = name if isinstance(name, list) else [name]
    for raw in names:
        for v in variants(raw):
            if v in cache:
                if cache[v]:
                    got = dict(cache[v])
                    got["name"] = tidy_name(got["name"])
                    return got
                continue
            hit = lookup(v)
            cache[v] = hit
            time.sleep(0.28)
            if hit:
                return hit
    return None


def main():
    folders = json.load(open(SRC, encoding="utf-8"))
    cache = load_cache()

    buckets = {"中文": [], "粤语": [], "日语": [], "外语": []}
    direct = {"中文歌单": "中文", "粤语歌单": "粤语", "日语歌单": "日语", "外语歌单": "外语"}
    by_name = {f["folder"]: f["items"] for f in folders}

    seen = set()
    dropped = 0
    checked = 0

    def take(bucket, hit):
        if (hit["name"], hit["artists"]) in MANUAL_DROP:
            return False
        key = norm(hit["name"]) + "|" + norm(hit["artists"])
        if key in seen:
            return False
        seen.add(key)
        buckets[bucket].append({"t": hit["name"], "a": hit["artists"]})
        return True

    jobs = []
    for folder, bucket in direct.items():
        for it in by_name.get(folder, []):
            jobs.append((bucket, it))
    JP_SET = ("日语",)
    for it in by_name.get("时代的眼泪", []):
        text = it["title"]
        bucket = "日语" if (KANA.search(text) or any(h in text for h in JP_HINTS)) else "中文"
        jobs.append((bucket, it))

    for i, (bucket, it) in enumerate(jobs):
        checked += 1
        song = song_of(it["title"])
        if not song:
            dropped += 1
            continue
        hit = resolve(song, cache)
        if not hit:
            dropped += 1
            continue
        take(bucket, hit)
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(jobs)} … 已收 {sum(len(v) for v in buckets.values())}")
            json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)

    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)

    order = [("zh", "中文歌单", "中文"), ("yue", "粤语歌单", "粤语"),
             ("jp", "日语歌单", "日语"), ("en", "外语歌单", "外语")]
    blocks = []
    for pid, label, bucket in order:
        items = buckets[bucket]
        rows = ",\n".join(
            "    { t: '%s', a: '%s' }" % (i["t"].replace("'", "\\'"), i["a"].replace("'", "\\'"))
            for i in items
        )
        blocks.append(
            "  {\n    id: '%s',\n    label: '%s',\n    items: [\n%s\n    ]\n  }" % (pid, label, rows)
        )
        print(f"{label}: {len(items)}")

    ts = """/**
 * 胧月夜の歌单：由 B 站公开收藏夹整理而来。
 * 曲名与歌手取自网易云音乐曲库（非 UP 主），查不到对应歌曲的条目已丢弃。
 * 此文件由 scripts/resolve_songs.py 生成，请勿手改。
 */

export interface PlaylistTrack {{
  /** 曲目名 */
  t: string
  /** 原唱 */
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
    print(f"检查 {checked} 条，丢弃 {dropped} 条，保留 {sum(len(v) for v in buckets.values())} 条")
    print("写入", OUT)


if __name__ == "__main__":
    main()
