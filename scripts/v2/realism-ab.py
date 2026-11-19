#!/usr/bin/env python3
"""Phase R: A/B sheet at phone width. Rows = locations (renders/realism/<loc>-<shot>.png, 1080x1920), columns = shots,
each cell 390x693, label strip with s/frame @1440, Laplacian bg/actor and contrast from review/realism/realism.json.
  python3 scripts/v2/realism-ab.py [--locs street-procedural,street-cc0] [--out review/realism/realism-ab-390.png]"""
import argparse, json
from PIL import Image, ImageDraw, ImageFont
a = argparse.ArgumentParser(); a.add_argument('--locs', default='street-procedural,street-cc0'); a.add_argument('--stills', default='renders/realism')
a.add_argument('--report', default='review/realism/realism.json'); a.add_argument('--out', default='review/realism/realism-ab-390.png'); o = a.parse_args()
R = json.load(open(o.report))['locations']; locs = o.locs.split(','); W, H, S = 390, 693, 34; f = ImageFont.load_default(size=13)
shots = [r['shot'] for r in R[locs[0]]['shots']]
sheet = Image.new('RGB', (len(shots) * W, len(locs) * (H + S)), '#111'); d = ImageDraw.Draw(sheet)
for r, loc in enumerate(locs):
    for c, sh in enumerate(shots):
        m = next(x for x in R[loc]['shots'] if x['shot'] == sh); y = r * (H + S)
        sheet.paste(Image.open(f'{o.stills}/{loc}-{sh}.png').convert('RGB').resize((W, H), Image.LANCZOS), (c * W, y + S))
        d.text((c * W + 6, y + 2), f'{loc.replace("street-", "")} · {sh}', fill='#fff', font=f)
        d.text((c * W + 6, y + 17), f'{m["s1440"]} s@1440 · lap {m["lap"]} · contrast {m["contrast"]}', fill='#ffd27a', font=f)
sheet.save(o.out); print(json.dumps({'out': o.out, 'size': sheet.size}))
