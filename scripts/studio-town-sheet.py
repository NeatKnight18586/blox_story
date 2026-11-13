"""Town kit review sheet + metrics against the stage-1 plaza wide."""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, 'studio/qa')
from color_metrics import frame_metrics  # noqa: E402

O = 'evidence/studio-town'
SHOTS = [('street_wide', 'Street wide'), ('street_mid', 'Street medium'), ('plaza_wide', 'Plaza wide (D01-style)'), ('plaza_low', 'Plaza low')]
img = Image.new('RGB', (540 * 4, 960))
for i, (s, label) in enumerate(SHOTS):
    img.paste(Image.open(f'{O}/{s}-1080.png').convert('RGB').resize((540, 960), Image.LANCZOS), (i * 540, 0))
    ImageDraw.Draw(img).text((i * 540 + 12, 10), label, fill=(245, 245, 245), font=ImageFont.load_default(size=26), stroke_width=3, stroke_fill=(20, 20, 24))
img.save(f'{O}/town-sheet.jpg', quality=88)
# Same plaza camera family: old legacy D01 → stage-1 look → town kit.
cmp = Image.new('RGB', (540 * 3, 960))
for i, (path, label) in enumerate([('evidence/studio-lookdev/wide-legacy-1080.png', 'OLD plaza'), ('evidence/studio-lookdev/wide-studio-1080.png', 'STAGE 1 look'), (f'{O}/plaza_wide-1080.png', 'TOWN KIT')]):
    cmp.paste(Image.open(path).convert('RGB').resize((540, 960), Image.LANCZOS), (i * 540, 0))
    ImageDraw.Draw(cmp).text((i * 540 + 12, 10), label, fill=(245, 245, 245), font=ImageFont.load_default(size=28), stroke_width=3, stroke_fill=(20, 20, 24))
cmp.save(f'{O}/plaza-comparison.jpg', quality=88)
m = {s: frame_metrics(f'{O}/{s}-1080.png') for s, _ in SHOTS}
m['gate'] = {'colorfulness_min': 80, 'luma_min': .6}
json.dump(m, open(f'{O}/metrics.json', 'w'), indent=1)
print({k: (v['colorfulness'], v['luma']) for k, v in m.items() if k != 'gate'})
