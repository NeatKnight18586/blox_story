#!/usr/bin/env python3
"""Phase R: download the CC0 asset set listed in assets/realism.json from Poly Haven (farm job; blocked in cloud sessions).
Resolves each slot (first candidate id that exists, else the most-downloaded asset matching `search`), downloads the 1k
maps into renders/cache/assets/<id>/ and writes renders/cache/assets/manifest.json (what the page loads) plus
assets/LICENSES.md (source URL per asset, CC0; hand-written sections from "## HDRI backdrops" on are kept). Refuses any file >
maxFileBytes. Phase 1A: `models` slots download a glTF model (the .gltf plus every file it includes: .bin, textures, at their
relative paths; each ≤ maxModelBytes) → manifest `models[slot] = {id, file, bytes, url}`. Phase 1E: a model slot with
`"pick": "lightest"` ranks its candidates + every `search` hit (`exclude` words dropped) by total glTF bytes at the slot's resolution
(sizes from the files API, nothing downloaded) and takes the lightest whose every file fits maxModelBytes; the ranking is written to
manifest `modelsConsidered[slot]` (the report quotes it). Stdlib only.
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


class TooBig(Exception):
    pass


def fetch(url, dest, limit):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return os.path.getsize(dest)
    b = get(url, binary=True)
    if len(b) > limit:
        raise TooBig(f'{url}: {len(b)} bytes > {limit}')
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
    man['models'] = {}
    if spec.get('models'):
        mo, mlimit, mfmt = get(f'{API}/assets?t=models'), spec.get('maxModelBytes', limit), spec.get('modelFormat', 'gltf')
        for slot, s in spec['models'].items():
            cands = [c for c in s.get('candidates', []) if c in mo]
            q = s.get('search', '').lower()
            if s.get('pick') == 'lightest':   # Phase 1E: every search hit (any of the |-separated words), lightest first
                ws, ex = [w for w in q.split('|') if w], [w for w in s.get('exclude', []) if w]
                hits = [k for k, v in mo.items() if any(w in k or w in v.get('name', '').lower() or w in ' '.join(v.get('tags', [])).lower() for w in ws) and not any(x in k for x in ex)]
                cands += [k for k in hits if k not in cands]
                sized = []
                for aid in cands[:40]:
                    g = get(f'{API}/files/{aid}').get(mfmt, {}).get(s.get('resolution', res), {}).get(mfmt)
                    if not g: continue
                    files = [g.get('size', 0)] + [inc.get('size', 0) for inc in (g.get('include') or {}).values()]
                    sized.append((sum(files), max(files), aid))
                sized.sort(); man.setdefault('modelsConsidered', {})[slot] = [{'id': a, 'bytes': t, 'maxFile': m} for t, m, a in sized]
                cands = [a for t, m, a in sized if m <= mlimit]
                print(f'{slot}: lightest candidates', [(a, t) for t, m, a in sized[:8]], file=sys.stderr)
            else:
                cands += [k for _, k in sorted(((v.get('download_count', 0), k) for k, v in mo.items() if q and (q in k or q in v.get('name', '').lower())), reverse=True)[:3] if k not in cands]
            for aid in cands:   # first candidate whose files all fit maxModelBytes (an oversized one is skipped, not fatal)
                g = get(f'{API}/files/{aid}').get(mfmt, {}).get(s.get('resolution', res), {}).get(mfmt)
                if not g:
                    print(f'{aid}: no {mfmt} at {res}', file=sys.stderr); continue
                d = os.path.join(a.out, aid); os.makedirs(d, exist_ok=True)
                try:
                    name = os.path.basename(g['url']); n = fetch(g['url'], os.path.join(d, name), mlimit)
                    for rel, inc in (g.get('include') or {}).items():
                        dest = os.path.normpath(os.path.join(d, rel))
                        if not dest.startswith(os.path.normpath(d) + os.sep):
                            raise SystemExit(f'{aid}: include path escapes the asset dir: {rel}')
                        os.makedirs(os.path.dirname(dest), exist_ok=True); n += fetch(inc['url'], dest, mlimit)
                except TooBig as e:
                    print(f'{aid}: skipped ({e})', file=sys.stderr); continue
                man['models'][slot] = {'id': aid, 'file': name, 'bytes': n, 'url': f'https://polyhaven.com/a/{aid}'}
                rows.append((slot, aid, mo[aid].get('name', aid), 'model (glTF)', n)); break
            else:
                print(f'no usable model for {slot}', file=sys.stderr)
    os.makedirs(a.out, exist_ok=True)
    json.dump(man, open(os.path.join(a.out, 'manifest.json'), 'w'), indent=1)
    lic = ['# Third-party assets (Phase R realism spike)', '',
           'All assets below are from Poly Haven and are **CC0 1.0** (public domain, https://polyhaven.com/license).',
           'They are downloaded by the farm job `.github/workflows/assets.yml` into a cache and never committed.', '',
           '| slot | asset | kind | bytes (1k) | source |', '|---|---|---|---|---|']
    lic += [f'| {s} | {n} (`{i}`) | {k} | {b} | https://polyhaven.com/a/{i} |' for s, i, n, k, b in rows]
    keep = ''
    if os.path.exists(a.licenses):
        old = open(a.licenses).read(); i = old.find('## HDRI backdrops')
        keep = '\n' + old[i:] if i >= 0 else ''
    open(a.licenses, 'w').write('\n'.join(lic) + '\n' + keep)
    print(json.dumps({'materials': {k: v['id'] for k, v in man['materials'].items()}, 'hdri': {k: v['id'] for k, v in man['hdri'].items()}, 'models': {k: v['id'] for k, v in man['models'].items()},
                      'bytes': sum(r[4] for r in rows)}))


if __name__ == '__main__':
    main()
