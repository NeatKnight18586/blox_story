#!/usr/bin/env python3
"""Phase R: download the CC0 asset set listed in assets/realism.json from Poly Haven (farm job; blocked in cloud sessions).
Resolves each slot (first candidate id that exists, else the most-downloaded asset matching `search`), downloads the 1k
maps into renders/cache/assets/<id>/ and writes renders/cache/assets/manifest.json (what the page loads) plus
assets/LICENSES.md (source URL per asset, CC0). Refuses any file > maxFileBytes. Stdlib only.
  python3 scripts/v2/fetch-assets.py [--list assets/realism.json] [--out renders/cache/assets]
"""
import argparse, json, os, sys, urllib.request

API = 'https://api.polyhaven.com'
UA = {'User-Agent': 'blox-story-asset-fetch/1.0'}


def get(url, binary=False):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        b = r.read()
    return b if binary else json.loads(b)


def resolve(slot, listing):
    for c in slot.get('candidates', []):
        if c in listing:
            return c
    q = slot.get('search', '').lower()
    hits = [(v.get('download_count', 0), k) for k, v in listing.items()
            if q and (q in k or q in v.get('name', '').lower() or q in ' '.join(v.get('tags', [])).lower())]
    return max(hits)[1] if hits else None


def fetch(url, dest, limit):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return os.path.getsize(dest)
    b = get(url, binary=True)
    if len(b) > limit:
        raise SystemExit(f'{url}: {len(b)} bytes > {limit}')
    with open(dest, 'wb') as f:
        f.write(b)
    return len(b)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', default='assets/realism.json')
    ap.add_argument('--out', default='renders/cache/assets')
    ap.add_argument('--licenses', default='assets/LICENSES.md')
    a = ap.parse_args()
    spec = json.load(open(a.list))
    res, fmt, limit = spec['resolution'], spec['format'], spec.get('maxFileBytes', 5_000_000)
    man = {'source': spec['source'], 'materials': {}, 'hdri': {}}
    rows = []
    tex = get(f'{API}/assets?t=textures')
    for slot, s in spec['materials'].items():
        aid = resolve(s, tex)
        if not aid:
            print(f'no texture for {slot}', file=sys.stderr); continue
        files, d = get(f'{API}/files/{aid}'), os.path.join(a.out, aid)
        os.makedirs(d, exist_ok=True)
        maps, total = {}, 0
        for key, ph in spec['maps'].items():
            f = files.get(ph, {}).get(res, {}).get(fmt)
            if not f:
                continue
            name = os.path.basename(f['url'])
            total += fetch(f['url'], os.path.join(d, name), limit)
            maps[key] = name
        man['materials'][slot] = {'id': aid, 'maps': maps, 'bytes': total, 'url': f'https://polyhaven.com/a/{aid}'}
        rows.append((slot, aid, tex[aid].get('name', aid), 'texture', total))
    hd = get(f'{API}/assets?t=hdris')
    for slot, s in spec['hdri'].items():
        aid = resolve(s, hd)
        if not aid:
            print(f'no hdri for {slot}', file=sys.stderr); continue
        f = get(f'{API}/files/{aid}')['hdri'][res][s.get('format', 'hdr')]
        d = os.path.join(a.out, aid); os.makedirs(d, exist_ok=True)
        name = os.path.basename(f['url']); n = fetch(f['url'], os.path.join(d, name), limit)
        man['hdri'][slot] = {'id': aid, 'file': name, 'bytes': n, 'url': f'https://polyhaven.com/a/{aid}'}
        rows.append((slot, aid, hd[aid].get('name', aid), 'hdri', n))
    os.makedirs(a.out, exist_ok=True)
    json.dump(man, open(os.path.join(a.out, 'manifest.json'), 'w'), indent=1)
    lic = ['# Third-party assets (Phase R realism spike)', '',
           'All assets below are from Poly Haven and are **CC0 1.0** (public domain, https://polyhaven.com/license).',
           'They are downloaded by the farm job `.github/workflows/assets.yml` into a cache and never committed.', '',
           '| slot | asset | kind | bytes (1k) | source |', '|---|---|---|---|---|']
    lic += [f'| {s} | {n} (`{i}`) | {k} | {b} | https://polyhaven.com/a/{i} |' for s, i, n, k, b in rows]
    open(a.licenses, 'w').write('\n'.join(lic) + '\n')
    print(json.dumps({'materials': {k: v['id'] for k, v in man['materials'].items()}, 'hdri': {k: v['id'] for k, v in man['hdri'].items()},
                      'bytes': sum(r[4] for r in rows)}))


if __name__ == '__main__':
    main()
