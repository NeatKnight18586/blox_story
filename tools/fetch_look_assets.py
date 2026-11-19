#!/usr/bin/env python3
"""tools/fetch_look_assets.py: Phase 5 look assets (CC0 HDRIs + photo texture sets) from assets/look7.json.

  python3 tools/fetch_look_assets.py [--list assets/look7.json] [--out renders/cache/assets]

Downloads into <out>/<id>/ (gitignored), converts bump/height maps to OpenGL normal maps (bump_to_normal, pure), and merges
<out>/manifest.json in the format parts/location.js reads ({materials: {slot: {id, maps}}, hdri: {slot: {id, file}}}).
Existing entries (e.g. Poly Haven sets from scripts/v2/fetch-assets.py on the farm) win over these. Tests: tests/v2/test_look7.py.
"""
import argparse, io, json, os, sys, urllib.request
import numpy as np


def bump_to_normal(h, strength=2.0):
    """h: float32 H×W height in 0..1 → uint8 H×W×3 OpenGL normal map (+Y = up in texture space, rows run downward). Tileable (wraps)."""
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * .5 * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * .5 * strength
    n = np.stack([-dx, dy, np.ones_like(h)], -1)          # row index grows downward = −V, so +dh/drow tilts the normal towards +V
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * .5 + .5) * 255 + .5).clip(0, 255).astype(np.uint8)


def get(url, limit):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'blox-story-look-fetch/1.0'}), timeout=90) as r:
        b = r.read(limit + 1)
    if len(b) > limit: raise ValueError(f'{url}: larger than {limit} bytes')
    return b


def main():
    from PIL import Image
    a = argparse.ArgumentParser(); a.add_argument('--list', default='assets/look7.json'); a.add_argument('--out', default='renders/cache/assets'); o = a.parse_args()
    L = json.load(open(o.list)); base, lim = L['base'], L.get('maxFileBytes', 8_000_000)
    mpath = os.path.join(o.out, 'manifest.json')
    man = json.load(open(mpath)) if os.path.exists(mpath) else {'materials': {}, 'hdri': {}}
    man.setdefault('materials', {}); man.setdefault('hdri', {}); rep = {'hdri': [], 'materials': [], 'failed': []}
    for slot, e in L['hdri'].items():
        d = os.path.join(o.out, e['id']); os.makedirs(d, exist_ok=True); fn = os.path.basename(e['file'])
        try:
            if not os.path.exists(os.path.join(d, fn)): open(os.path.join(d, fn), 'wb').write(get(base + e['file'], lim))
            man['hdri'].setdefault(slot, {'id': e['id'], 'file': fn, 'source': e['source']}); rep['hdri'].append(slot)
        except Exception as x: rep['failed'].append(f'hdri {slot}: {x}')
    for slot, e in L['materials'].items():
        d = os.path.join(o.out, e['id']); os.makedirs(d, exist_ok=True); maps = {}
        try:
            for k in ('albedo', 'rough', 'normal'):
                if k in e:
                    fn = f'{k}.jpg'
                    if not os.path.exists(os.path.join(d, fn)): open(os.path.join(d, fn), 'wb').write(get(base + e[k], lim))
                    maps[k] = fn
            if 'bump' in e or e.get('bumpFromAlbedo'):
                if not os.path.exists(os.path.join(d, 'normal.png')):
                    src = Image.open(io.BytesIO(get(base + e['bump'], lim))) if 'bump' in e else Image.open(os.path.join(d, 'albedo.jpg'))
                    h = np.asarray(src.convert('L').resize((1024, 1024)), dtype=np.float32) / 255
                    Image.fromarray(bump_to_normal(h, e.get('bumpStrength', 2.0))).save(os.path.join(d, 'normal.png'))
                maps['normal'] = 'normal.png'
            man['materials'].setdefault(slot, {'id': e['id'], 'maps': maps, 'source': e['source']}); rep['materials'].append(slot)
        except Exception as x: rep['failed'].append(f'material {slot}: {x}')
    json.dump(man, open(mpath, 'w'), indent=1)
    print(json.dumps(rep)); sys.exit(1 if rep['failed'] else 0)


if __name__ == '__main__':
    main()


def read_hdr(path):
    """Radiance .hdr (RLE RGBE) → float32 H×W×3. Pure numpy; enough for the 1k equirects in assets/look7.json."""
    b = open(path, 'rb').read(); i = b.index(b'\n\n') + 2; j = b.index(b'\n', i)
    dims = b[i:j].split(); H, W = int(dims[1]), int(dims[3]); p = j + 1
    out = np.zeros((H, W, 4), np.uint8)
    for y in range(H):
        if b[p] != 2 or b[p + 1] != 2: raise ValueError('flat RGBE not supported')
        p += 4
        for c in range(4):
            x = 0
            while x < W:
                n = b[p]; p += 1
                if n > 128: n -= 128; out[y, x:x + n, c] = b[p]; p += 1
                else: out[y, x:x + n, c] = np.frombuffer(b[p:p + n], np.uint8); p += n
                x += n
    e = out[..., 3].astype(np.int32); f = np.where(e > 0, np.ldexp(1.0, e - 136), 0).astype(np.float32)
    return out[..., :3].astype(np.float32) * f[..., None]


def hdri_stats(rgb):
    """Pure: sun dominance (top 0.1 % luminance share), mean sky luminance (upper half), warm/cool ratio R/B of the upper half."""
    L = rgb @ np.array([.2126, .7152, .0722], np.float32); H = L.shape[0]; up = rgb[:H // 2]
    flat = np.sort(L.ravel()); top = flat[-max(1, flat.size // 1000):].sum()
    return {'sunShare': round(float(top / flat.sum()), 3), 'skyMean': round(float(L[:H // 2].mean()), 3),
            'rb': round(float(up[..., 0].mean() / max(1e-6, up[..., 2].mean())), 3)}
