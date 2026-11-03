"""从现有 logo.png 生成两套纯色线条版本：
   - logo-light.png : 纯黑线条 (浅色背景使用)
   - logo-dark.png  : 纯白线条 (深色背景使用)
   保留原始 alpha 边缘，仅将线条 RGB 归一为纯色，去除灰边雾感。
"""
from PIL import Image

SRC = 'public/images/logo.png'
LIGHT = 'public/images/logo-light.png'
DARK = 'public/images/logo-dark.png'
ALPHA_MIN = 30  # 低于该 alpha 视为透明


def to_pure(im, color):
    im = im.convert('RGBA')
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = px[x, y]
            if a >= ALPHA_MIN:
                px[x, y] = (color[0], color[1], color[2], a)
    return im


src = Image.open(SRC).convert('RGBA')
light = to_pure(src, (0, 0, 0))
dark = to_pure(src, (255, 255, 255))
light.save(LIGHT)
dark.save(DARK)
print('wrote', LIGHT, light.size)
print('wrote', DARK, dark.size)
