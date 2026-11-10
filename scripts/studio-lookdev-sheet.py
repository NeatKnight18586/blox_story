"""Build look-gate review sheets and metrics from evidence/studio-lookdev captures."""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, 'studio/qa')
from color_metrics import frame_metrics  # noqa: E402

OUT = 'evidence/studio-lookdev'
W = 1080
# Measured once from 22 frames of the user's private reference Short (not committed).
REFERENCE = {'saturation': .47, 'colorfulness': 98, 'luma': .67, 'contrast_p95_p5': .50, 'frames': 22}
GATE = {'colorfulness_min': 80, 'luma_min': .60}

pairs = [('wide', 'Plaza wide (D01 camera)'), ('leo', 'Leo medium close-up')]
font = ImageFont.load_default(size=28)


def sheet(width, path, quality):
    h = round(width * 16 / 9)
    tiles = [(f'{shot}-{look}-{W}.png', f'{"OLD" if look == "legacy" else "NEW"}: {title}')
             for shot, title in pairs for look in ('legacy', 'studio')]
    img = Image.new('RGB', (width * 4, h + 40), (18, 22, 28))
    d = ImageDraw.Draw(img)
    f = ImageFont.load_default(size=max(14, width // 30))
    for i, (name, label) in enumerate(tiles):
        img.paste(Image.open(f'{OUT}/{name}').convert('RGB').resize((width, h), Image.LANCZOS), (i * width, 40))
        d.text((i * width + 8, 8), label, fill=(235, 235, 235), font=f)
    img.save(path, quality=quality)


sheet(540, f'{OUT}/comparison.jpg', 90)
sheet(390, f'{OUT}/phone-390.jpg', 88)

frames = {f'{shot}-{look}': frame_metrics(f'{OUT}/{shot}-{look}-{W}.png') for shot, _ in pairs for look in ('legacy', 'studio')}
gate = {f'{shot}-studio': {'colorfulness': frames[f'{shot}-studio']['colorfulness'] >= GATE['colorfulness_min'],
                           'luma': frames[f'{shot}-studio']['luma'] >= GATE['luma_min']} for shot, _ in pairs}
json.dump({'reference': REFERENCE, 'gate': GATE, 'frames': frames, 'pass': gate}, open(f'{OUT}/metrics.json', 'w'), indent=1)
print(json.dumps({'frames': frames, 'pass': gate}, indent=1))
