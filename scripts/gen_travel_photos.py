from pathlib import Path
from PIL import Image, ImageOps
import json

SRC = Path(r"C:/Users/MR/Desktop/旅游")
OUT = Path(r"C:/Users/MR/WorkBuddy/个人站-react/public/images/travel")
SLUG = {
    "上海": "shanghai",
    "四川": "sichuan",
    "广东": "guangdong",
    "重庆": "chongqing",
    "陕西": "shaanxi",
    "香港": "hongkong",
}
MAX_EDGE = 820
QUALITY = 80

report = {}
for cn, slug in SLUG.items():
    root = SRC / cn
    files = sorted(
        [p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")],
        key=lambda p: (p.parent.as_posix(), p.name),
    )
    dest = OUT / slug
    dest.mkdir(parents=True, exist_ok=True)
    entries = []
    for i, p in enumerate(files, start=1):
        try:
            im = Image.open(p)
            im = ImageOps.exif_transpose(im)
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            w, h = im.size
            scale = min(1.0, MAX_EDGE / max(w, h))
            if scale < 1.0:
                im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
            name = f"{i:04d}.jpg"
            im.save(dest / name, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            spot = p.parent.name if p.parent != root else cn
            entries.append({"file": name, "spot": spot})
        except Exception as e:
            print("SKIP", p, e)
    report[cn] = {"slug": slug, "count": len(entries), "entries": entries}
    print(f"{cn}: {len(entries)} photos")

(Path("/tmp/travel_manifest.json")).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
print("DONE")
