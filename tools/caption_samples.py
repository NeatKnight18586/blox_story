#!/usr/bin/env python3
"""tools/caption_samples.py: Phase 6 accent options (R-BRAND-06, R-CAP-01). Burns real v6 captions (libass, the style in
captions/pop-shorts-v6.json) onto two Phase 5 stills (golden = bright, night = dark), one column per accent option + one base
column, draws the Shorts UI zones, and measures each option.
  python3 tools/caption_samples.py [--bright renders/look7/goldenBittersweet-R1_lowwide.png] [--dark renders/look7/nightMystery-R1_lowwide.png]
                                   [--story egg] [--out review/captions]
Checks (pass lines): cap height ≥ 2.6 % of the frame (minCap, analytic from the font as libass sizes it) · rendered text box inside
safeBox (pixel diff) · accent vs outline contrast ≥ 7:1 (WCAG) · accent vs white ΔE76 ≥ 25 (reads as a different colour) · accent hue
≥ 30° from Volze gold #FFD700 and from the hero skin #FFD542. Pure helpers are unit-tested in tests/v2/test_captions6.py.
"""
import argparse, colorsys, json, math, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/v2'))
import captions as C  # noqa: E402

FONTS = str(ROOT / 'node_modules/@expo-google-fonts/lilita-one/400Regular')
UI = {'top bar': (0, 0, 1, .08), 'action rail': (.86, .45, 1, .88), 'title / channel / music': (0, .78, 1, 1)}


def srgb_lin(c): c = c / 255; return np.where(c <= .04045, c / 12.92, ((c + .055) / 1.055) ** 2.4)
def rel_lum(rgb): r, g, b = srgb_lin(np.array(rgb, float)); return .2126 * r + .7152 * g + .0722 * b
def contrast(a, b): la, lb = sorted([rel_lum(a), rel_lum(b)], reverse=True); return (la + .05) / (lb + .05)
def hex_rgb(h): h = h.lstrip('#'); return [int(h[i:i + 2], 16) for i in (0, 2, 4)]
def lab(rgb):
    r, g, b = srgb_lin(np.array(rgb, float)); X = (.4124 * r + .3576 * g + .1805 * b) / .95047; Y = .2126 * r + .7152 * g + .0722 * b; Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > .008856 else 7.787 * t + 16 / 116
    return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))
def delta_e(a, b): return math.dist(lab(a), lab(b))
def hue_deg(rgb): return colorsys.rgb_to_hsv(*[v / 255 for v in rgb])[0] * 360
def hue_dist(a, b): d = abs(hue_deg(a) - hue_deg(b)) % 360; return min(d, 360 - d)


def cap_frac(style, size=None):
    """Cap height of 'H' as libass draws \\fs size (ascent + descent = size), as a fraction of the frame height."""
    size = size or style['size']; f = ImageFont.truetype(str(ROOT / style['fontFile']), 200); a, d = f.getmetrics()
    x0, y0, x1, y1 = f.getbbox('H'); return (y1 - y0) / (a + d) * size / style['playRes'][1]


def color_checks(hexc):
    rgb, outline = hex_rgb(hexc), [16, 16, 16]
    v = {'contrastOutline': round(float(contrast(rgb, outline)), 2), 'deltaEWhite': round(float(delta_e(rgb, [255, 255, 255])), 1),
         'hueFromGold': round(float(hue_dist(rgb, hex_rgb('#FFD700'))), 1), 'hueFromHeroSkin': round(float(hue_dist(rgb, hex_rgb('#FFD542'))), 1)}
    v['pass'] = bool(v['contrastOutline'] >= 7 and v['deltaEWhite'] >= 25 and v['hueFromGold'] >= 30 and v['hueFromHeroSkin'] >= 30)
    return v


def burn(bg, ass_text, out_png):
    with tempfile.TemporaryDirectory() as d:
        a = os.path.join(d, 'c.ass'); open(a, 'w').write(ass_text)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', '24', '-t', '1', '-i', bg, '-vf',
                        f"scale=1080:1920,subtitles={a}:fontsdir={FONTS}", '-ss', '0.5', '-frames:v', '1', out_png], check=True)


def text_box(with_png, bg_png):
    a = np.asarray(Image.open(with_png).convert('RGB'), int); b = np.asarray(Image.open(bg_png).convert('RGB').resize((1080, 1920)), int)
    m = np.abs(a - b).sum(-1) > 40; ys, xs = np.nonzero(m)
    return (float(xs.min() / 1080), float(ys.min() / 1920), float(xs.max() / 1080), float(ys.max() / 1920)) if len(xs) else None


def main():
    p = argparse.ArgumentParser(); p.add_argument('--bright', default='renders/look7/goldenBittersweet-R1_lowwide.png')
    p.add_argument('--dark', default='renders/look7/nightMystery-R1_lowwide.png'); p.add_argument('--story', default='egg'); p.add_argument('--out', default='review/captions')
    o = p.parse_args(); Path(o.out).mkdir(parents=True, exist_ok=True)
    st = C.load_style('v6'); cues = json.load(open(f'stories/{o.story}/cues.json'))
    ch = C.group6(cues, st); base = next(c for c in ch if len(c['words']) == 2 and c['words'][0].lower() == 'this')
    acc = next(c for c in ch if len(c['words']) == 2 and c['words'][-1].lower().startswith('midnight'))   # owner's words, read only
    cols = [('base (white)', None, base, ())] + [(k, v['hex'], acc, {(0, 1)}) for k, v in st['accentOptions'].items()]
    W, H = 390, 693; sheet = Image.new('RGB', (W * len(cols), H * 2), (12, 12, 12)); d = ImageDraw.Draw(sheet, 'RGBA')
    font = ImageFont.truetype(str(ROOT / st['fontFile']), 20); rep = {'style': st['name'], 'capFrac': round(float(cap_frac(st)), 4), 'minCap': st['minCap'], 'options': {}, 'boxes': {}}
    tmp = tempfile.mkdtemp()
    for row, bg in enumerate([o.bright, o.dark]):
        for k, (name, hexc, chunk, kw) in enumerate(cols):
            s2 = dict(st); s2['pop'] = ''
            if hexc: s2['keywordColour'] = C.hex_to_ass(hexc)
            ass = C.to_ass([{**chunk, 'start': 0, 'end': 5}], s2, (), None, 24, None, keywords=kw)
            png = os.path.join(tmp, f'{row}-{k}.png'); burn(bg, ass, png)
            box = text_box(png, bg); rep['boxes'][f'{["bright", "dark"][row]}/{name}'] = [round(v, 3) for v in box] if box else None
            if hexc and box:   # local check: accent vs the median background behind the text box (owner sees it on real frames)
                b = np.asarray(Image.open(bg).convert('RGB').resize((1080, 1920)), int)[int(box[1] * 1920):int(box[3] * 1920), int(box[0] * 1080):int(box[2] * 1080)]
                med = np.median(b.reshape(-1, 3), 0); de = round(float(delta_e(hex_rgb(hexc), med)), 1)
                rep.setdefault('localDeltaE', {})[f'{["bright", "dark"][row]}/{name}'] = {'bgMedian': [int(v) for v in med], 'deltaE': de, 'pass': de >= 25}
            x, y = k * W, row * H; sheet.paste(Image.open(png).convert('RGB').resize((W, H), Image.LANCZOS), (x, y))
            for (ux0, uy0, ux1, uy1) in UI.values(): d.rectangle([x + ux0 * W, y + uy0 * H, x + ux1 * W, y + uy1 * H], fill=(255, 40, 40, 48), outline=(255, 60, 60, 160))
            sb = st['safeBox']; d.rectangle([x + sb['x'][0] * W, y + sb['y'][0] * H, x + sb['x'][1] * W, y + sb['y'][1] * H], outline=(80, 255, 120, 200), width=2)
            d.rectangle([x, y, x + W, y + 26], fill=(0, 0, 0, 230)); d.text((x + 6, y + 2), f'{name} {hexc or ""}', fill=(255, 255, 255), font=font)
    for name, v in st['accentOptions'].items(): rep['options'][name] = {'hex': v['hex'], **color_checks(v['hex'])}
    sb = st['safeBox']; rep['inSafeBox'] = bool(all(b and b[0] >= sb['x'][0] and b[2] <= sb['x'][1] and b[1] >= sb['y'][0] and b[3] <= sb['y'][1] for b in rep['boxes'].values()))
    rep['capPass'] = bool(rep['capFrac'] >= st['minCap'])
    sheet.save(f'{o.out}/accent-options-390.png'); json.dump(rep, open(f'{o.out}/accent-options.json', 'w'), indent=1)
    print(json.dumps({k: rep[k] for k in ('capFrac', 'capPass', 'inSafeBox')}), json.dumps(rep['options']))


if __name__ == '__main__':
    main()
