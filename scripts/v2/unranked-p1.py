# scripts/v2/unranked-p1.py — E4 Phase 1 sheets + G1 (symbol read at a medium shot, 390 px) + merge into gates.json. Called by unranked-p1.js.
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
raw, out = sys.argv[1], sys.argv[2]
S = json.load(open(f'{raw}/syms.json')); ORDER, syms = S['ORDER'], S['syms']; g2 = json.load(open(f'{raw}/g2.json'))
f = ImageFont.load_default(size=14); BG = '#1b1d21'; Y = '#ffd84a'
def luma(a): return (.2126 * a[..., 0] + .7152 * a[..., 1] + .0722 * a[..., 2]) / 255.0
def hexluma(h): r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]; return .2126 * r + .7152 * g + .0722 * b
def blobs(m):
    seen = np.zeros_like(m, bool); res = []
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]: continue
        st = [(y, x)]; seen[y, x] = True; pts = []
        while st:
            cy, cx = st.pop(); pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not seen[ny, nx]: seen[ny, nx] = True; st.append((ny, nx))
        ys, xs = zip(*pts); res.append({'area': len(pts), 'w': int(max(xs) - min(xs) + 1), 'h': int(max(ys) - min(ys) + 1)})
    return res
# ---- G1 ----
g1 = {'method': 'medium shot (hand in frame, yaw −30°), 390 × 693 px; mask render = symbol fill flat green; extent = longest side of the largest blob; contrast = |mean luma(symbol fill) − mean luma(ink rim ring, 2 px outside the fill)| on the lit render; vs bare skin = |mean luma(fill) − luma(skin hex)| (reported, not the gate)',
      'line': 'every symbol: extent ≥ 6 px and rim contrast ≥ 0.25', 'symbols': {}}
for id in ORDER:
    m = np.asarray(Image.open(f'{raw}/mask-{id}.png').convert('RGB')).astype(int); mask = (m[..., 0] == 0) & (m[..., 1] == 255) & (m[..., 2] == 0)
    lit = np.asarray(Image.open(f'{raw}/med-{id}.png').convert('RGB')).astype(float)
    bl = blobs(mask); L = luma(lit)
    dil = np.asarray(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))) > 0; ring = dil & ~mask
    fill = float(L[mask].mean()) if mask.any() else 0.0; rim = float(L[ring].mean()) if ring.any() else 0.0
    ext = int(max([max(b['w'], b['h']) for b in bl], default=0)); area = int(mask.sum())
    skin = hexluma(syms[id]['skin'])
    g1['symbols'][id] = {'rank': syms[id]['rank'], 'shape': syms[id]['shape'], 'blobs': len(bl), 'extentPx': ext, 'areaPx': area, 'fillLuma': round(fill, 3), 'rimLuma': round(rim, 3), 'contrastRim': round(abs(fill - rim), 3),
                         'contrastVsSkin': round(abs(fill - skin), 3), 'pass': bool(ext >= 6 and abs(fill - rim) >= .25)}
g1['pass'] = all(v['pass'] for v in g1['symbols'].values()); g1['minExtentPx'] = min(v['extentPx'] for v in g1['symbols'].values()); g1['minContrastRim'] = min(v['contrastRim'] for v in g1['symbols'].values()); g1['minContrastVsSkin'] = min(v['contrastVsSkin'] for v in g1['symbols'].values())
for id, v in g1['symbols'].items(): print('G1', id, v['rank'], v['shape'], 'extent', v['extentPx'], 'px  area', v['areaPx'], ' rim contrast', v['contrastRim'], ' vs skin', v['contrastVsSkin'], 'PASS' if v['pass'] else 'FAIL')
# ---- sheets ----
def fit(p, w, h): return Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS)
cw, ch, cols = 150, 267, 5; pair = 2 * cw; ids = ORDER + ['DOG']; rows = (len(ids) + cols - 1) // cols
sheet = Image.new('RGB', (cols * pair, rows * (ch + 20) + 20 + 200), BG); d = ImageDraw.Draw(sheet)
NAME = {'LILA': 'LILA (SECOND)', 'DAX': 'DAX (RIVAL)', 'DAD': 'DAD (ELDER)', 'MOM': 'MOM (ADULT_F)', 'STU_A': 'STUDENT_A ice', 'STU_B': 'STUDENT_B fire', 'STU_C': 'STUDENT_C water'}
for i, id in enumerate(ids):
    x, y = (i % cols) * pair, (i // cols) * (ch + 20)
    for k, v in enumerate(['front', '3q']): sheet.paste(fit(f'{raw}/cell-{id}-{v}.png', cw, ch), (x + k * cw, y + 20))
    d.text((x + 4, y + 3), NAME.get(id, f'STUDENT seed {id[1:]}' if id.startswith('S') and id[1:].isdigit() else id) + (' · ' + syms[id]['rank'] if id in syms else ''), fill=Y, font=f)
y0 = rows * (ch + 20) + 20; d.text((4, y0 - 17), 'DOG · idle · sit · bow (front legs forward, chest down, tail up) · wag', fill=Y, font=f)
for k, p in enumerate(S['DOG']): sheet.paste(fit(f'{raw}/dog-{p}.png', 375, 200 if False else 200), (k * 375, y0))
sheet = sheet.crop((0, 0, 1500, y0 + 200)); sheet.save(f'{out}/cast-sheet.png'); print('cast-sheet', sheet.size)
e = Image.new('RGB', (6 * 260, 280), BG); de = ImageDraw.Draw(e)
for i, (n, lab) in enumerate([('ECU_D', 'D leaf'), ('ECU_C', 'C wave'), ('ECU_B', 'B flame'), ('ECU_A', 'A crystal'), ('ECU_S', 'S lightning (2× D)'), ('ECU_dark', 'S · stolen (dark)')]):
    e.paste(fit(f'{raw}/{n}.png', 260, 260), (i * 260, 20)); de.text((i * 260 + 4, 3), lab, fill=Y, font=f)
e.save(f'{out}/symbols-ecu.png'); print('symbols-ecu', e.size)
Image.open(f'{raw}/lineup.png').convert('RGB').save(f'{out}/lineup-12.png'); print('lineup-12', Image.open(f'{out}/lineup-12.png').size)
G = json.load(open(f'{out}/gates.json')) if __import__('os').path.exists(f'{out}/gates.json') else {}
hm = np.asarray(Image.open(f'{raw}/mask-HERO.png').convert('RGB')).astype(int); G['G3heroMaskPx'] = int(((hm[..., 0] == 0) & (hm[..., 1] == 255) & (hm[..., 2] == 0)).sum())
G['G1'] = json.loads(json.dumps(g1, default=int)); G['G2'] = g2; G['budgetTriangles'] = S['budget']
json.dump(G, open(f'{out}/gates.json', 'w'), indent=1)
