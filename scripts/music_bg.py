"""把两张插画的白底换成站点夜色底，供粒子取样用（粒子只看 RGB，不看 alpha）。"""
from PIL import Image
from collections import deque

BG = (4, 7, 13)
SRC = [
    ("D:/weixin/xwechat_files/wxid_ekjh7dueezf922_b884/temp/RWTemp/2026-11/a7fff3609608c37c8509c1132111f552/e69519edf4dec01fe570a4382c29a704.jpg",
     "public/images/music/aria.jpg"),
    ("D:/weixin/xwechat_files/wxid_ekjh7dueezf922_b884/temp/RWTemp/2026-11/a7fff3609608c37c8509c1132111f552/e7c8a85708a1df844d3e7cd146f00299.jpg",
     "public/images/music/miku.jpg"),
]

def flood_white(im: Image.Image, hi: int = 238) -> Image.Image:
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    bg = bytearray(w * h)          # 1 = 背景
    q = deque()

    def white(x, y):
        r, g, b = px[x, y]
        return r >= hi and g >= hi and b >= hi

    for x in range(w):
        for y in (0, h - 1):
            if white(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if white(x, y) and not bg[y * w + x]:
                bg[y * w + x] = 1
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not bg[ny * w + nx] and white(nx, ny):
                bg[ny * w + nx] = 1
                q.append((nx, ny))

    # 被笔画围住的白块（右上角签名的底）也一并吃掉。
    # 只在签名所在的右上角小区域里做，避免把脸上的大片浅色当成背景挖穿。
    x_lo, x_hi = int(w * 0.62), w
    y_lo, y_hi = 0, int(h * 0.24)
    seen = bytearray(w * h)
    for y0 in range(y_lo, y_hi):
        for x0 in range(x_lo, x_hi):
            i0 = y0 * w + x0
            if bg[i0] or seen[i0] or not white(x0, y0):
                continue
            comp = []
            qq = deque([(x0, y0)])
            seen[i0] = 1
            outside = False
            while qq:
                x, y = qq.popleft()
                comp.append((x, y))
                if not (x_lo <= x < x_hi and y_lo <= y < y_hi):
                    outside = True
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if not seen[ni] and not bg[ni] and white(nx, ny):
                            seen[ni] = 1
                            qq.append((nx, ny))
            if not outside and len(comp) >= 400:
                for x, y in comp:
                    bg[y * w + x] = 1

    # 把紧贴背景的浅色描边也吃掉，避免留一圈白边
    edge = []
    for y in range(h):
        for x in range(w):
            if bg[y * w + x]:
                continue
            near = False
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and bg[ny * w + nx]:
                    near = True
                    break
            if near:
                r, g, b = px[x, y]
                if min(r, g, b) >= 214:
                    edge.append((x, y))
    for x, y in edge:
        bg[y * w + x] = 1

    out = rgb.copy()
    op = out.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            if bg[row + x]:
                op[x, y] = BG
    return out

for src, dst in SRC:
    im = Image.open(src)
    res = flood_white(im)
    res.save(dst, quality=93, subsampling=0)
    print(dst, res.size)
