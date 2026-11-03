"""从 alpha/planet-*.webp 中提取主星体，输出干净的圆形精灵。

原素材是联络表切片：alpha 通道是柔和的明度渐变而非真实轮廓，
直接按 alpha 抠会把球体暗面切掉。改用 RGB 亮度对深色底(8,8,8)做前景分割，
填掉坑洞得到实心轮廓，再与拟合圆取交集，保证是真圆、无暗角、无残留光晕。
"""
import math
import os
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

SRC = "public/images/alpha/planet-{}.webp"
OUT = "public/images/planet-clean/planet-{}.png"

LUM = 26          # 与底色 (8,8,8) 分离的亮度阈值
FEATHER = 1.0     # 边缘羽化
TARGET = 256      # 输出边长


def largest_component(mask, w, h):
    px = mask.load()
    seen = bytearray(w * h)
    best = []
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or px[x, y] == 0:
                continue
            q = deque([(x, y)])
            seen[i] = 1
            comp = []
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and px[nx, ny]:
                            seen[j] = 1
                            q.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    return best


os.makedirs("public/images/planet-clean", exist_ok=True)

for n in range(1, 6):
    im = Image.open(SRC.format(n)).convert("RGBA")
    w, h = im.size

    # 1) 亮度分割：球体 vs 深色底
    lum = im.convert("L")
    mask = lum.point(lambda v: 255 if v >= LUM else 0)
    mask = mask.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))

    comp = largest_component(mask, w, h)
    xs = [p[0] for p in comp]
    ys = [p[1] for p in comp]
    bx0, bx1 = min(xs), max(xs) + 1
    by0, by1 = min(ys), max(ys) + 1

    # 2) 实心轮廓：填掉内部空洞（陨石坑是暗的，不能当背景）
    outer = Image.new("L", (w, h), 0)
    opx = outer.load()
    for x, y in comp:
        opx[x, y] = 255
    inv = ImageOps.invert(outer)
    ImageDraw.floodfill(inv, (0, 0), 128)
    holes = inv.point(lambda v: 0 if v == 128 else 255)
    silhouette = ImageChops.lighter(outer, holes)
    silhouette = silhouette.filter(ImageFilter.MaxFilter(3))
    silhouette = silhouette.filter(ImageFilter.GaussianBlur(FEATHER))

    # 3) 裁到可见星体范围，再用内接椭圆收边
    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    bw, bh = bx1 - bx0, by1 - by0
    print(f"p{n}: comp={len(comp)} bbox=({bx0},{by0})-({bx1},{by1}) {bw}x{bh}")

    box = (bx0, by0, bx1, by1)
    body = im.crop(box)

    ss = 4
    circle = Image.new("L", (bw * ss, bh * ss), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, bw * ss - 1, bh * ss - 1), fill=255)
    circle = circle.filter(ImageFilter.GaussianBlur(FEATHER * ss)).resize(
        (bw, bh), Image.LANCZOS
    )

    alpha = ImageChops.multiply(circle, silhouette.crop(box))
    body.putalpha(alpha)

    # 非等比缩放成正方形：被画布裁切的一侧会被拉伸补齐，最终仍是正圆
    out = body.resize((TARGET, TARGET), Image.LANCZOS)
    out.save(OUT.format(n), optimize=True)
    print(f"   -> {OUT.format(n)} {out.size}")
