# -*- coding: utf-8 -*-
"""把 空耳露娜 的 37 个曲目文件夹里的幻灯片按序导入成 WebP，并生成数据文件。"""
import os
import re
import json
from PIL import Image

SRC = "C:/Users/MR/Desktop/通用/兼职/空耳露娜"
OUT = "C:/Users/MR/WorkBuddy/个人站-react/public/images/ukulele"
DATA = "C:/Users/MR/WorkBuddy/个人站-react/src/data/ukulele.ts"

# (源文件夹, 曲目名)
TRACKS = [
    ("fgo八周年主题曲", "FGO八周年主题曲"),
    ("one last kiss", "one last kiss"),
    ("Only My Railgun", "炮姐OP"),
    ("艾克斯奥特曼", "艾克斯奥特曼"),
    ("艾斯奥特曼", "艾斯奥特曼"),
    ("百恋歌", "百恋歌"),
    ("残酷天使的行动纲领", "残酷天使的行动纲领"),
    ("吃醋", "やきもち"),
    ("大概", "大概"),
    ("迪迦奥特曼主题曲", "迪迦奥特曼主题曲"),
    ("怪物", "怪物"),
    ("花仙子露露", "花仙子"),
    ("捷德奥特曼op", "捷德奥特曼OP"),
    ("精灵", "精灵"),
    ("雷欧奥特曼op", "雷欧OP"),
    ("令和的丽奈", "丽奈"),
    ("胧月", "胧月"),
    ("马赛克碎片", "马赛克碎片"),
    ("梦比优斯奥特曼主题曲", "梦比优斯奥特曼主题曲"),
    ("奈克瑟斯奥特曼", "奈克瑟斯奥特曼OP·英雄"),
    ("偶像", "偶像"),
    ("千本樱", "千本樱"),
    ("群青", "群青"),
    ("若能绽放光芒", "若能绽放光芒"),
    ("赛文奥特曼", "赛文奥特曼"),
    ("山田小姐ed", "山田小姐ED"),
    ("神的随波逐流", "神的随波逐流"),
    ("泰罗奥特曼op", "泰罗奥特曼OP"),
    ("未闻花名", "未闻花名"),
    ("希望的碎片", "希望的碎片"),
    ("向夜晚奔去", "向夜晚奔去"),
    ("勇者", "勇者"),
    ("御坂妹妹们的呼唤", "来自妹妹的声音"),
    ("月光传说", "月光传说"),
    ("祝福", "祝福"),
    ("罪恶王冠op", "罪恶王冠OP·My Dearest"),
    ("罪恶王冠插曲", "罪恶王冠插曲·Euterpe"),
]

KANA = list("あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆ")

QUALITY = 78


def slides(folder: str):
    found = []
    for dirpath, _dirnames, filenames in os.walk(folder):
        for f in filenames:
            if "幻灯片" in f and f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                m = re.search(r"(\d+)", f)
                if m:
                    found.append((int(m.group(1)), os.path.join(dirpath, f)))
    found.sort(key=lambda x: x[0])
    return [p for _, p in found]


def main():
    os.makedirs(OUT, exist_ok=True)
    entries = []
    total_kb = 0

    for i, (folder, title) in enumerate(TRACKS):
        tid = f"t{i + 1:02d}"
        src = os.path.join(SRC, folder)
        files = slides(src)
        if not files:
            print("!! 没有幻灯片:", folder)
            continue

        dest = os.path.join(OUT, tid)
        os.makedirs(dest, exist_ok=True)
        for j, path in enumerate(files):
            im = Image.open(path).convert("RGB")
            target = os.path.join(dest, f"{j + 1:02d}.webp")
            im.save(target, "WEBP", quality=QUALITY, method=6)
            total_kb += os.path.getsize(target) / 1024

        entries.append(
            {"id": tid, "title": title, "kana": KANA[i], "count": len(files)}
        )
        print(f"{tid} {title}  {len(files)} 张")

    body = ",\n".join(
        "  { id: '%s', title: '%s', kana: '%s', count: %d }"
        % (e["id"], e["title"].replace("'", "\\'"), e["kana"], e["count"])
        for e in entries
    )
    ts = f"""/**
 * 空耳露娜作品集：一条记录对应一个曲目文件夹。
 * 歌词图存在 /public/images/ukulele/<id>/<序号>.webp，序号从 01 起按幻灯片顺序。
 * 此文件由 scripts/import_ukulele.py 生成，请勿手改。
 */

export interface UkuleleTrack {{
  id: string
  title: string
  kana: string
  count: number
}}

export const UKULELE_TRACKS: UkuleleTrack[] = [
{body}
]
"""
    with open(DATA, "w", encoding="utf-8") as fh:
        fh.write(ts)
    print(f"\n共 {len(entries)} 首，{total_kb / 1024:.1f} MB")


if __name__ == "__main__":
    main()
