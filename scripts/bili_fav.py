# -*- coding: utf-8 -*-
"""读取指定的 5 个公开收藏夹，导出 title / author / bvid。"""
import json
import time
import urllib.parse
import urllib.request

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
FOLDERS = [
    ("中文歌单", 2369893142),
    ("粤语歌单", 3464559642),
    ("日语歌单", 3066006542),
    ("外语歌单", 3143985242),
    ("时代的眼泪", 3229953242),
]


def get(url, params):
    req = urllib.request.Request(
        url + "?" + urllib.parse.urlencode(params),
        headers={
            "User-Agent": UA,
            "Referer": "https://space.bilibili.com/2018386242/favlist",
            "Accept": "application/json, text/plain, */*",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main():
    out = []
    for title, mid in FOLDERS:
        items = []
        pn = 1
        while True:
            r = get(
                "https://api.bilibili.com/x/v3/fav/resource/list",
                {
                    "media_id": mid,
                    "pn": pn,
                    "ps": 20,
                    "platform": "web",
                    "order": "mtime",
                    "type": 0,
                    "tid": 0,
                },
            )
            if r.get("code") != 0:
                print("  失败", title, r.get("code"), r.get("message"))
                break
            data = r.get("data") or {}
            medias = data.get("medias") or []
            for m in medias:
                items.append(
                    {
                        "title": (m.get("title") or "").strip(),
                        "author": ((m.get("upper") or {}).get("name") or "").strip(),
                        "bvid": m.get("bvid") or "",
                    }
                )
            if not data.get("has_more") or not medias:
                break
            pn += 1
            time.sleep(0.5)
        print(f"{title}: {len(items)} 条")
        out.append({"folder": title, "id": mid, "items": items})

    with open("bili_fav.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)

    total = sum(len(f["items"]) for f in out)
    print("总计", total)


if __name__ == "__main__":
    main()
