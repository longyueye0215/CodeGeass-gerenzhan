"""wangdao：水印区域强平滑（降采样-中值-放大）+ 羽化贴回。
半透明水印笔画 8-10px，普通中值核不足；降采样等效超大核。
"""
from PIL import Image, ImageFilter, ImageDraw

PATH = 'public/images/novels/wangdao.jpg'
BOX = (1085, 1715, 1368, 1820)  # 覆盖完整文字，右到图像边缘
FEATHER = 10
SCALE = 5

im = Image.open(PATH).convert('RGB')
box_img = im.crop(BOX)
bw, bh = box_img.size

small = box_img.resize((max(2, bw // SCALE), max(2, bh // SCALE)), Image.LANCZOS)
small = small.filter(ImageFilter.MedianFilter(5))
smoothed = small.resize((bw, bh), Image.BILINEAR)

mask = Image.new('L', box_img.size, 0)
md = ImageDraw.Draw(mask)
md.rectangle((FEATHER, FEATHER, bw - FEATHER, bh - FEATHER), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(FEATHER / 2))

im.paste(smoothed, BOX, mask)
im.save(PATH, quality=92)
print('wangdao smoothed (strong)')

w, h = im.size
c = im.crop((int(w * 0.62), int(h * 0.92), w, h))
c = c.resize((c.size[0] * 2, c.size[1] * 2), Image.LANCZOS)
c.save('scripts/wm_wangdao_after.png')
print('after saved')
