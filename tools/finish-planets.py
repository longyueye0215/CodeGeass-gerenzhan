"""把五颗星球统一裁成等大圆形精灵。

生成图在球体最外圈带了一圈不透明的纯白轮廓光（约 4%~8% 半径）。
直接按 alpha 外接框裁会把白圈一起留下，所以这里逐角度从外向内探测
「第一处非白像素」，得到球面真实半径，再按这个半径裁切 + 边缘羽化。
"""
import math
import os
import statistics
from PIL import Image, ImageChops, ImageDraw, ImageFilter

GEN = "assets/planet-src"
OUT = "public/images/planet-clean"

SOURCES = {
    1: f"{GEN}/A_single_photorealistic_planet_2026-10-30T12-45-49.png",
    2: f"{GEN}/A_single_photorealistic_planet_2026-10-30T12-48-03.png",
    3: f"{GEN}/A_single_photorealistic_planet_2026-10-30T16-53-44.png",
    4: f"{GEN}/A_single_photorealistic_planet_2026-10-30T12-46-28.png",
    5: f"{GEN}/A_single_photorealistic_planet_2026-10-30T12-46-39.png",
}

SIZE = 256
ALPHA_SOLID = 170   # 视为不透明的阈值
WHITE = 205         # min(R,G,B) 高于此值视为残留光环（含浅灰）
FEATHER = 1.1
# 个别图外圈还有一圈均匀的浅灰光环，且环外有暗间隙，
# 探针会把「环」误判成球面，这里对这几张单独多修一点。
TRIM = {5: 0.9}


def surface_radius(im, box):
    """逐角度从外向内找球面边界，返回中位半径"""
    px = im.load()
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    outer = min(x1 - x0, y1 - y0) / 2
    radii = []

    for i in range(72):
        a = (i / 72) * math.tau
        cos, sin = math.cos(a), math.sin(a)
        r = outer
        while r > 8:
            x, y = int(cx + cos * r), int(cy + sin * r)
            if 0 <= x < im.width and 0 <= y < im.height:
                rr, gg, bb, aa = px[x, y]
                if aa > ALPHA_SOLID and min(rr, gg, bb) <= WHITE:
                    break
            r -= 1
        radii.append(r)

    return statistics.median(radii)


def ring_whiteness(im, cx, cy, r):
    """统计半径 r 外侧一圈里「不透明的纯白像素」占比"""
    px = im.load()
    hits = total = 0
    for i in range(144):
        a = (i / 144) * math.tau
        for k in (0.95, 0.97, 0.99):
            x, y = int(cx + math.cos(a) * r * k), int(cy + math.sin(a) * r * k)
            if 0 <= x < im.width and 0 <= y < im.height:
                rr, gg, bb, aa = px[x, y]
                total += 1
                if aa > ALPHA_SOLID and min(rr, gg, bb) > WHITE:
                    hits += 1
    return hits / max(total, 1)


def finish(im):
    solid = im.getchannel("A").point(lambda v: 255 if v > ALPHA_SOLID else 0)
    box = solid.getbbox()
    if not box:
        return im.resize((SIZE, SIZE), Image.LANCZOS)

    r = surface_radius(im, box)
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2

    # 若边缘仍残留白圈，逐步内缩，直到白像素占比可忽略
    for _ in range(14):
        if ring_whiteness(im, cx, cy, r) < 0.05:
            break
        r *= 0.97

    r *= TRIM.get(n, 1.0)
    cx, cy = int(cx), int(cy)
    side = int(r * 2)
    crop = im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2))

    # 只保留与中心连通的那一块，角落的杂散小行星会被丢掉
    solid = crop.getchannel("A").point(lambda v: 255 if v > 60 else 0)
    probe = solid.copy()
    ImageDraw.floodfill(probe, (side // 2, side // 2), 128)
    keep = probe.point(lambda v: 255 if v == 128 else 0)
    crop.putalpha(ImageChops.multiply(crop.getchannel("A"), keep))

    # 第三张图上有一颗与主球相连的残留卫星，单独收紧半径把它削掉
    if n == 3:
        lim = side * 0.455
        cut = Image.new("L", (side, side), 0)
        ImageDraw.Draw(cut).ellipse(
            (side / 2 - lim, side / 2 - lim, side / 2 + lim, side / 2 + lim), fill=255
        )
        cut = cut.filter(ImageFilter.GaussianBlur(1.2))
        crop.putalpha(ImageChops.multiply(crop.getchannel("A"), cut))

    # 边缘径向羽化，避免硬切
    ss = 4
    big = side * ss
    m = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(m)
    steps = 40
    for i in range(steps + 1):
        t = i / steps
        radius = (side / 2) * (1.0 - 0.06 * t) * ss
        c = big / 2
        d.ellipse((c - radius, c - radius, c + radius, c + radius), fill=int(255 * t))
    m = m.filter(ImageFilter.GaussianBlur(FEATHER * ss)).resize((side, side), Image.LANCZOS)
    crop.putalpha(ImageChops.multiply(crop.getchannel("A"), m))

    return crop.resize((SIZE, SIZE), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)

for n, src in SOURCES.items():
    im = Image.open(src)
    im.load()
    im = im.convert("RGBA")
    out = finish(im)
    out.save(f"{OUT}/planet-{n}.png", optimize=True)
    print(f"p{n} <- {os.path.basename(src)}  {im.size} -> {out.size}")
