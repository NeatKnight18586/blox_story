#!/usr/bin/env python3
"""tools/contact_sheet.py: one frame per shot → ONE image ≤ 1600 px wide, shot numbers burned in (R-FLOW-03, Phase 4).

  python3 tools/contact_sheet.py --spec <episode.json> --out <sheet.png> [--shots 12-19] [--frame mid|first|last|loop]
                                 [--width 270 --height 480] [--cache renders/sheets/<slug>] [--cols N] [--max-width 1600]
  python3 tools/contact_sheet.py --story <slug> …        (= --spec stories/<slug>/episode.json)

Renders only the needed frames with scripts/v2/render.js --frames (the per-shot cache means an unchanged shot is never
re-rendered), then tiles them with "#n id t" labels. --frame loop = shot 1's first frame next to the last shot's last frame (R-LOOP-01).
Pure helpers (parse_range, shot_frames, grid) are unit-tested in tests/v2/test_contact_sheet.py.
"""
import argparse, json, math, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf'


def parse_range(s, n):
    """'12-19,25' → [12…19, 25] (1-based shot numbers, clipped to 1…n); None → all."""
    if not s: return list(range(1, n + 1))
    out = []
    for part in s.split(','):
        a, _, b = part.partition('-')
        lo, hi = int(a), int(b or a)
        out += [k for k in range(lo, hi + 1) if 1 <= k <= n]
    return sorted(set(out))


def shot_frames(spec, which='mid'):
    """[(shot number, id, at, frame)] using engine/timeline.js rounding (start = round(at × fps))."""
    fps, shots = spec.get('fps', 30), sorted(spec['shots'], key=lambda s: s['at'])
    starts = [round(s['at'] * fps) for s in shots] + [round(spec['end'] * fps)]
    out = []
    for i, s in enumerate(shots):
        a, b = starts[i], max(starts[i] + 1, starts[i + 1])
        f = {'first': a, 'last': b - 1}.get(which, (a + b - 1) // 2)
        out.append((i + 1, s['id'], s['at'], f))
    return out


def grid(n, tile_w, max_w=1600, cols=None):
    cols = cols or max(1, min(n, max_w // tile_w))
    return cols, math.ceil(n / cols)


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--spec'); a.add_argument('--story'); a.add_argument('--out', required=True); a.add_argument('--shots')
    a.add_argument('--frame', default='mid', choices=['mid', 'first', 'last', 'loop']); a.add_argument('--width', type=int, default=270)
    a.add_argument('--height', type=int, default=480); a.add_argument('--cache'); a.add_argument('--cols', type=int); a.add_argument('--max-width', type=int, default=1600)
    a.add_argument('--load-timeout', type=int, default=120, help='s to wait for the page (big baked sets: 1800)')
    o = a.parse_args()
    spec_path = o.spec or f'stories/{o.story}/episode.json'
    spec = json.loads(Path(spec_path).read_text()); slug = spec.get('slug') or Path(spec_path).parent.name
    if o.frame == 'loop':
        f0, fl = shot_frames(spec, 'first'), shot_frames(spec, 'last')
        picks = [(1, f0[0][1] + ' first', f0[0][2], f0[0][3]), (len(fl), fl[-1][1] + ' last', fl[-1][2], fl[-1][3])]
    else:
        allf = shot_frames(spec, o.frame); keep = set(parse_range(o.shots, len(allf)))
        picks = [p for p in allf if p[0] in keep]
    cache = Path(o.cache or ROOT / 'renders/sheets' / slug)
    frames = ','.join(str(p[3]) for p in picks)
    r = subprocess.run(['node', 'scripts/v2/render.js', '--spec', spec_path, '--out', str(cache), '--width', str(o.width), '--height', str(o.height),
                        '--aa', '0', '--frames', frames, '--load-timeout', str(o.load_timeout)], cwd=ROOT, capture_output=True, text=True)
    if r.returncode: sys.exit(f'render.js failed:\n{r.stderr[-1500:]}')
    prog = json.loads((cache / 'progress.json').read_text())
    from PIL import Image, ImageDraw, ImageFont
    cols, rows = grid(len(picks), o.width, o.max_width, o.cols)
    scale = min(1.0, o.max_width / (cols * o.width)); tw, th = int(o.width * scale), int(o.height * scale)
    sheet = Image.new('RGB', (cols * tw, rows * th), (20, 20, 20)); d = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype(str(FONT), max(12, tw // 11))
    except OSError: font = ImageFont.load_default()
    for k, (n, sid, at, f) in enumerate(picks):
        im = Image.open(cache / 'frames' / f'frame-{f:05d}.png').convert('RGB').resize((tw, th))
        x, y = (k % cols) * tw, (k // cols) * th; sheet.paste(im, (x, y))
        label = f'#{n} {sid} {at:.1f}s'
        d.rectangle([x, y, x + tw, y + font.size + 8], fill=(0, 0, 0)); d.text((x + 5, y + 3), label, fill=(255, 235, 120), font=font)
    Path(o.out).parent.mkdir(parents=True, exist_ok=True); sheet.save(o.out)
    print(json.dumps({'out': o.out, 'shots': len(picks), 'size': sheet.size, 'rendered': prog.get('rendered', prog.get('todo')), 'cached': prog.get('cached'),
                      'wallSeconds': prog.get('wallSeconds')}))


if __name__ == '__main__':
    main()
