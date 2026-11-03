"""去除小说分类图右下角的「豆包AI生成」水印：
线稿图背景为纯白、主体为黑色线条，水印为中灰色文字。
策略：右下角区域内，将"非纯白且非深黑"的中灰像素刷白（保留黑色线条）。
"""
from PIL import Image
import glob, os

# (路径, 检测区域: 右侧比例, 底部比例) —— 紧贴水印的小区域，避免误伤线条
IMAGES = {
    'shizuo.jpg': (0.30, 0.06),
    'zhanguowu.jpg': (0.28, 0.05),
    'wangdao.jpg': (0.30, 0.05),
    'qishi.jpg': (0.30, 0.05),
    'yuanchuang.jpg': (0.30, 0.06),
    'lishi.jpg': (0.30, 0.05),
    'youxi.jpg': (0.30, 0.06),
    'erchuang.jpg': (0.30, 0.06),
}

for name, (rw, rh) in IMAGES.items():
    path = f'public/images/novels/{name}'
    im = Image.open(path).convert('RGB')
    w, h = im.size
    x0, y0 = int(w * (1 - rw)), int(h * (1 - rh))
    px = im.load()
    hit = 0
    for y in range(y0, h):
        for x in range(x0, w):
            r, g, b = px[x, y]
            lum = (r + g + b) / 3
            sat = max(r, g, b) - min(r, g, b)
            # 中灰（水印文字）：非纯白、非深黑、低饱和
            if lum > 80 and lum < 246 and sat < 40:
                px[x, y] = (255, 255, 255)
                hit += 1
    im.save(path, quality=92)
    print(f'{name}: region=({x0},{y0})-({w},{h}) whitened={hit}')

print('done')
