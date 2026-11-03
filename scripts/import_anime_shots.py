# -*- coding: utf-8 -*-
"""把 动漫截图 转成 WebP 并生成 ContactSheet 的素材清单。"""
import os
import json
import re
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

SRC = "C:/Users/MR/Desktop/动漫截图"
OUT_DIR = "public/images/anime"
DATA = "src/data/animeShots.ts"
MAX_W = 1280
QUALITY = 72


def convert(args):
    name, idx = args
    src = os.path.join(SRC, name)
    try:
        im = Image.open(src).convert("RGB")
    except Exception:
        return None
    w, h = im.size
    if h > w:  # 竖图/方图直接跳过
        return None
    if w > MAX_W:
        im = im.resize((MAX_W, round(h * MAX_W / w)), Image.LANCZOS)
    dst = os.path.join(OUT_DIR, f"{idx:04d}.webp")
    im.save(dst, "WEBP", quality=QUALITY, method=4)
    return {"src": f"/images/anime/{idx:04d}.webp", "w": im.width, "h": im.height,
            "kb": os.path.getsize(dst) / 1024}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
    jobs = [(f, i + 1) for i, f in enumerate(files)]
    out = []
    with ThreadPoolExecutor(8) as ex:
        for r in ex.map(convert, jobs):
            if r:
                out.append(r)
    total = sum(r["kb"] for r in out) / 1024
    body = ",\n".join(
        "  { src: '%s', w: %d, h: %d }" % (r["src"], r["w"], r["h"]) for r in out
    )
    ts = """/**
 * 游戏分区开场「照片从深处涌出」的素材清单。
 * 图片由 scripts/import_anime_shots.py 从桌面的动漫截图批量生成，未做任何裁剪。
 */

export interface AnimeShot {
  src: string
  w: number
  h: number
}

export const ANIME_SHOTS: AnimeShot[] = [
__BODY__
]
""".replace("__BODY__", body)
    open(DATA, "w", encoding="utf-8").write(ts)
    print(f"转换 {len(out)} 张，共 {total:.1f} MB")


if __name__ == "__main__":
    main()
