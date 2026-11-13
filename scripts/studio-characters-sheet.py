"""Stage-2 review sheets: cast lineup, expression grid, plaza Leo old/look/V2, metrics."""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, 'studio/qa')
from color_metrics import frame_metrics  # noqa: E402

C, L = 'evidence/studio-characters', 'evidence/studio-lookdev'
CAST = ['leo', 'pip', 'mother']


def label(img, xy, text, size=22):
    ImageDraw.Draw(img).text(xy, text, fill=(240, 240, 240), font=ImageFont.load_default(size=size), stroke_width=3, stroke_fill=(20, 20, 24))


# 1. Lineup front + three-quarter, phone-sized.
sheet = Image.new('RGB', (1080, 960))
for i, name in enumerate(['lineup', 'lineup34']):
    sheet.paste(Image.open(f'{C}/{name}-1080.png').convert('RGB').resize((540, 960), Image.LANCZOS), (i * 540, 0))
label(sheet, (12, 10), 'Mother · Pip · Leo — front'); label(sheet, (552, 10), 'three-quarter')
sheet.save(f'{C}/lineup-sheet.jpg', quality=90)

# 2. Leo performs the owner's full 35-expression sheet (same 5×7 order), then a cast row of core faces.
SHEET = ['happy', 'sad', 'angry', 'confused', 'pleased', 'pain', 'scared', 'serious', 'silly', 'flirty', 'nervous', 'tired', 'shocked',
         'irritated', 'wtf', 'rage', 'disgusted', 'confident', 'drunk', 'concerned', 'curious', 'pouty', 'sick', 'laughing', 'shame',
         'incredulous', 'bored', 'snooty', 'cold', 'calm', 'crying', 'devious', 'pensive', 'excited', 'triumph']
t = 260
grid = Image.new('RGB', (t * 5, (t + 34) * 7), (18, 22, 28))
for i, e in enumerate(SHEET):
    x, y = (i % 5) * t, (i // 5) * (t + 34)
    grid.paste(Image.open(f'{C}/faces/leo-{e}.png').convert('RGB').resize((t, t), Image.LANCZOS), (x, y))
    label(grid, (x + 8, y + t + 4), e, 22)
grid.save(f'{C}/expressions-35.jpg', quality=88)
CORE = ['happy', 'sad', 'angry', 'shocked', 'scared', 'calm', 'nervous', 'excited']
t = 220
grid = Image.new('RGB', (t * 8, t * 3 + 36), (18, 22, 28))
for c, e in enumerate(CORE):
    label(grid, (c * t + 8, 6), e, 22)
for r, who in enumerate(CAST):
    for c, e in enumerate(CORE):
        grid.paste(Image.open(f'{C}/faces/{who}-{e}.png').convert('RGB').resize((t, t), Image.LANCZOS), (c * t, 36 + r * t))
grid.save(f'{C}/expressions.jpg', quality=90)

# 3. Same plaza camera: legacy → stage-1 look → stage-2 Leo preset.
variants = [('legacy', 'OLD'), ('studio', 'STAGE 1 look'), ('studio-cast', 'STAGE 2 Leo')]
for shot in ['leo', 'wide']:
    img = Image.new('RGB', (540 * 3, 960))
    for i, (v, text) in enumerate(variants):
        img.paste(Image.open(f'{L}/{shot}-{v}-1080.png').convert('RGB').resize((540, 960), Image.LANCZOS), (i * 540, 0))
        label(img, (i * 540 + 12, 10), text, 26)
    img.save(f'{C}/plaza-{shot}-comparison.jpg', quality=90)

metrics = {f'{shot}-{v}': frame_metrics(f'{L}/{shot}-{v}-1080.png') for shot in ['leo', 'wide'] for v, _ in variants}
metrics['lineup'] = frame_metrics(f'{C}/lineup-1080.png')
json.dump(metrics, open(f'{C}/metrics.json', 'w'), indent=1)
print(json.dumps({k: (v['colorfulness'], v['luma']) for k, v in metrics.items()}))

# 4. The eight hair options on one mannequin: front / three-quarter / back.
HAIRS = ['long_red', 'spiky_blonde', 'messy_brown', 'swept_blue', 'ponytail_black', 'long_blonde', 'bun_red', 'bun_pink']
t = 240
img = Image.new('RGB', (t * 8, t * 3 + 34), (18, 22, 28))
for c, h in enumerate(HAIRS):
    label(img, (c * t + 6, 6), h.replace('_', ' '), 20)
    for r, v in enumerate(['front', '34', 'back']):
        img.paste(Image.open(f'{C}/hair/{h}-{v}.png').convert('RGB').resize((t, t), Image.LANCZOS), (c * t, 34 + r * t))
img.save(f'{C}/hair-options.jpg', quality=88)
