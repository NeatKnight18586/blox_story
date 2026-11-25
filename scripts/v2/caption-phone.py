#!/usr/bin/env python3
"""scripts/v2/caption-phone.py — captions v3 phone check (Amendment A4 §D) and sample sheet.

  python3 scripts/v2/caption-phone.py [--video review/season1/tools-demo.mp4] [--story egg] [--until 18]
                                      [--out review/season1/caption-v3-phone.png] [--json review/season1/caption-v3-phone.json]

Measured check: the smallest \\fs the v3 captions use for the story's cues (after the width fit) is burned by libass,
as the capital-only probe "HEX", at y 1250 onto a mid-grey 1080×1920 frame, which is then scaled to the 390 px phone
frame (390×693, Lanczos). Cap height = rows holding white fill pixels. PASS if cap height ≥ 2.6 % of frame height and
the whole caption (fill + outline) lies inside the 58–74 % caption band. Sheet: the same frames of the picture with v2
captions (top row) and v3 captions (bottom row), 390 px cells, ≤ 1600 px wide.
"""
import argparse, json, os, re, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
import captions as C  # noqa: E402

FONTS = 'node_modules/@expo-google-fonts/lilita-one/400Regular'
MIN_CAP, BAND, PW, PH = .026, (.58, .74), 390, 693


def run(cmd): return subprocess.run(cmd, capture_output=True, text=True, check=True)


def ass_for(story, style_name, until, out, cues_path=None):
    cues = json.load(open(cues_path or f'stories/{story}/cues.json')); st = C.load_style(style_name)
    timed = C.timing(C.make_chunks(cues, st), st['leadSeconds'], st['blankPause'])
    ass = C.to_ass(timed, st, (), None, 30, until); open(out, 'w').write(ass)
    sizes = [int(x) for x in re.findall(r'\\fs(\d+)\\fsc', ass)]
    return ass, min(sizes), max(sizes)


def probe(size, style, tmp):
    """Cap height and vertical extent (fractions of the phone frame) of 'HEX' at \\fs size, y = style['y']."""
    st = dict(style); ass = C.to_ass([{'words': ['HEX'], 'start': 0, 'end': 2, 'line': 9}], {**st, 'openerSize': size, 'size': size, 'pop': '', 'fitWidth': 0}, (), None)
    a = os.path.join(tmp, 'probe.ass'); open(a, 'w').write(ass); png = os.path.join(tmp, 'probe.png')
    run(['ffmpeg', '-hide_banner', '-y', '-f', 'lavfi', '-i', 'color=c=0x808080:s=1080x1920:d=1', '-vf', f'ass={a}:fontsdir={FONTS},scale={PW}:{PH}:flags=lanczos', '-frames:v', '1', png])
    im = Image.open(png).convert('RGB'); px = im.load()
    pc = style['primary'][4:]; tgt = (int(pc[4:6], 16), int(pc[2:4], 16), int(pc[0:2], 16))   # ASS &HAABBGGRR → RGB
    isfill = (lambda q: min(q) > 235) if tgt == (255, 255, 255) else (lambda q: all(abs(q[i] - tgt[i]) <= 28 for i in range(3)))   # the style's own fill colour (v7: yellow)
    fill = [y for y in range(PH) if any(isfill(px[x, y]) for x in range(PW))]
    ink = [y for y in range(PH) if any(abs(px[x, y][0] - 128) > 24 for x in range(PW))]
    return {'size': size, 'capPx': len(fill) and fill[-1] - fill[0] + 1, 'cap': round((fill[-1] - fill[0] + 1) / PH, 4), 'top': round(ink[0] / PH, 4), 'bottom': round((ink[-1] + 1) / PH, 4)}


def main():
    a = argparse.ArgumentParser(); a.add_argument('--video', default='review/season1/tools-demo.mp4'); a.add_argument('--story', default='egg')
    a.add_argument('--until', type=float, default=18); a.add_argument('--out', default='review/season1/caption-v3-phone.png')
    a.add_argument('--json', default='review/season1/caption-v3-phone.json'); a.add_argument('--times', default='0.5,4.4,11.2,14.7')
    a.add_argument('--style', help='check one caption style only, e.g. v7 (cap ≥ its minCap, inside the band); default: the v2 + v3 comparison'); o = a.parse_args()
    tmp = tempfile.mkdtemp(); rep = {'limits': {'minCap': MIN_CAP, 'band': BAND}, 'story': o.story, 'video': o.video}
    files = {}
    names = (o.style,) if o.style else ('v2', 'v3'); V = names[-1]; min_cap = C.load_style(V).get('minCap', MIN_CAP) if o.style else MIN_CAP
    rep['limits']['minCap'] = min_cap
    for v in names:
        _, lo, hi = ass_for(o.story, v, None, os.path.join(tmp, f'{v}-full.ass'))   # sizes over the whole episode
        ass_for(o.story, v, o.until, os.path.join(tmp, f'{v}.ass'))
        st = C.load_style(v); rep[v] = {'sizes': [lo, hi], 'smallest': probe(lo, st, tmp), 'largest': probe(hi, st, tmp)}
        files[v] = []
        for t in o.times.split(','):
            f = os.path.join(tmp, f'{v}-{t}.png')
            run(['ffmpeg', '-hide_banner', '-y', '-ss', t, '-i', o.video, '-vf', f"setpts=PTS+{t}/TB,ass={os.path.join(tmp, v + '.ass')}:fontsdir={FONTS},scale={PW}:{PH}:flags=lanczos", '-frames:v', '1', f])
            files[v].append((t, f))
    s3 = rep[V]['smallest']; big = rep[V]['largest']
    rep['failures'] = []
    if s3['cap'] < min_cap: rep['failures'].append(f"smallest {V} cap height {s3['cap']} < {min_cap}")
    for p in (s3, big):
        if p['top'] < BAND[0] or p['bottom'] > BAND[1]: rep['failures'].append(f"{V} \\fs{p['size']} spans {p['top']}–{p['bottom']}, outside band {BAND}")
    rep['pass'] = not rep['failures']
    n = len(files[V]); W = n * PW; sheet = Image.new('RGB', (W, len(names) * (PH + 24)), '#111'); d = ImageDraw.Draw(sheet); f = ImageFont.load_default(size=16)
    for r, v in enumerate(names):
        for k, (t, fp) in enumerate(files[v]):
            x, y = k * PW, r * (PH + 24); d.text((x + 6, y + 4), f"{v} · {t} s · fs {rep[v]['sizes'][0]}-{rep[v]['sizes'][1]}", fill='#ffd84a', font=f)
            im = Image.open(fp).convert('RGB'); sheet.paste(im, (x, y + 24))
            dd = ImageDraw.Draw(sheet); [dd.line([(x, y + 24 + int(b * PH)), (x + 10, y + 24 + int(b * PH))], fill='#ff4a4a', width=2) for b in BAND]   # band ticks
    sheet.save(o.out); json.dump(rep, open(o.json, 'w'), indent=1); open(o.json, 'a').write('\n')
    print(json.dumps({'pass': rep['pass'], V: rep[V], **({'v2': rep['v2']['smallest']} if 'v2' in rep else {}), 'failures': rep['failures']}))
    print('PASS caption phone check' if rep['pass'] else 'FAIL caption phone check'); sys.exit(0 if rep['pass'] else 1)


if __name__ == '__main__':
    main()
