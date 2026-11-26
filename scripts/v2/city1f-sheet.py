#!/usr/bin/env python3
"""Phase 1F contact sheets (≤ 1600 px): python3 scripts/v2/city1f-sheet.py --dir renders/city1f --measures review/city/1F-measures.json --out review/city
   → 1F-governor.png (turntable front / ¾ / side / back + 3 acts; the 4 faces as phone-size head crops; the Governor on his balcony at phone width)
     1F-tod.png (bayNorth in cityDay2 / cityGoldenHour / cityDusk / cityNight at phone width + crops: wildflower tufts, cliff rock ×2)
Captions sit UNDER each tile; nothing is drawn on people or objects."""
import argparse, json, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--dir', default='renders/city1f'); ap.add_argument('--measures', default='review/city/1F-measures.json'); ap.add_argument('--out', default='review/city')
a = ap.parse_args()
M = json.load(open(a.measures)) if os.path.exists(a.measures) else {}
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
except OSError: F = ImageFont.load_default()
BG, CH = (24, 26, 30), 22


def tile(S, d, path, box, cap, crop=None):
    x, y, w, h = box
    if not os.path.exists(path): d.rectangle([x, y, x + w, y + h], outline=(255, 90, 90)); d.text((x + 6, y + 6), 'missing', fill=(255, 90, 90), font=F); return
    im = Image.open(path).convert('RGB')
    if crop: W, H = im.size; im = im.crop((int(crop[0] * W), int(crop[1] * H), int(crop[2] * W), int(crop[3] * H)))
    S.paste(im.resize((w, h), Image.LANCZOS), (x, y)); d.text((x + 4, y + h + 3), cap, fill=(225, 225, 225), font=F)


def save(S, name):
    assert S.width <= 1600 and S.height <= 1600, S.size
    os.makedirs(a.out, exist_ok=True); p = f'{a.out}/{name}'; S.save(p, optimize=True); print(p, S.size)


g = f'{a.dir}/governor'
if os.path.exists(f'{g}/cells'):
    S = Image.new('RGB', (1560, 356 + CH + 390 + CH + 8), BG); d = ImageDraw.Draw(S)
    for i, (n, cap) in enumerate([('turn-front', 'front'), ('turn-3q', '3/4'), ('turn-side', 'side'), ('turn-back', 'back'), ('act-rope_pull', 'act: rope pull'), ('act-announce', 'act: announce'), ('act-panic_up', 'act: panic (monocle pops)')]):
        tile(S, d, f'{g}/cells/{n}.png', (i * 222, 0, 200, 356), cap)
    y = 356 + CH
    for i, f in enumerate(['gov_smug', 'gov_announce', 'gov_panic', 'gov_oops']):   # head crops at phone size (a close-up's head on a 390 px phone ≈ 180 px)
        tile(S, d, f'{g}/cells/face-{f}.png', ((i % 2) * 200, y + (i // 2) * (180 + CH), 180, 180), f.replace('gov_', 'face: '))
    tile(S, d, f'{g}/balcony.png', (420, y, 219, 390), 'balcony (720 px, scaled)')
    tile(S, d, f'{g}/balcony.png', (660, y, 390, 390), 'balcony crop, phone width', crop=(.12, .05, .88, .48))
    gm = M.get('governor', {}); d.text((1070, y + 6), f"Governor: {gm.get('tris', '?')} tris", fill=(225, 225, 225), font=F)
    d.text((1070, y + 26), 'faces: smug / announce / panic / oops', fill=(225, 225, 225), font=F)
    d.text((1070, y + 46), 'acts: rope_pull / announce / panic_up', fill=(225, 225, 225), font=F)
    save(S, '1F-governor.png')

t = f'{a.dir}/tod'
if os.path.exists(t):
    S = Image.new('RGB', (1560, 600 + CH + 400 + CH), BG); d = ImageDraw.Draw(S); tod = M.get('tod', {})
    for i, L in enumerate(['cityDay2', 'cityGoldenHour', 'cityDusk', 'cityNight']):
        tile(S, d, f'{t}/{L}.png', (i * 390, 0, 337, 600), f"{L}  luma {tod.get(L, {}).get('meanLuma', '?')}")
    y = 600 + CH
    tile(S, d, f'{a.dir}/crops/t1.png', (0, y, 520, 400), 'wildflower tufts (forestTrail, 3D, instanced)', crop=(0, .72, .62, .99))
    tile(S, d, f'{a.dir}/crops/t1.png', (530, y, 500, 400), 'hill rock, triplanar (forestTrail)', crop=(.25, .05, 1, .45))
    tile(S, d, f'{a.dir}/crops/t2.png', (1040, y, 520, 400), 'ravine rock, triplanar (ropeBridge)', crop=(0, .55, 1, 1))
    save(S, '1F-tod.png')
