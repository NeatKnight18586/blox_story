#!/usr/bin/env python3
"""scripts/v2/beats.py — beats intake (format v5, Phase 3b): the owner's timestamp list → episode.json shots.

  python3 scripts/v2/beats.py --world toyhouse --list stories/<slug>/beats.txt [--spec base.json] [--out episode.json] [--end 82] [--fps 24]

One line per beat: a timestamp, then plain words. Never reads the script or the voice; it only converts the owner's list.
    0:00  crash zoom on the shutter
    0:03.5  top down hall, lights cascade
    0:06  aisle track hall
    0:09  close on MO at the counter, freeze 8f
    0:12  split counter | track
    0:15  low angle HERO, impact
    1:02  wide street, memory
Timestamps: M:SS(.s) or plain seconds (12.5 / 12.5s). Words understood (case-insensitive):
  move   crash zoom | top down / timelapse | split | low angle / authority | aisle / track down | pull | push | whip | orbit | drift / static
  size   wide | medium | close | insert        place  any anchor name of the world (parts/sets4/anchors.json), or @name
  who    a cast name (HERO MO PIP YOUNG_PIP MO_DAD HERO_TAPED) → the shot subject        flags  freeze [Nf|Ns], impact, on twos, reveal
  grade  memory | dawn (per-shot grade)            lights cascade → a lightsCascade effect at that time from the world's practicals
The anchor, size and subject carry over from the previous line when a line does not name them. Output: {shots, effects, end, summary}.
"""
import argparse, json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CAST = ['HERO_TAPED', 'YOUNG_PIP', 'MO_DAD', 'HERO', 'MO', 'PIP']
MOVES = [  # (regex, move) — first match wins
    (r'crash\s*zoom', 'crashZoom'), (r'top[\s-]*down|timelapse|time[\s-]*lapse', 'topDown'), (r'split', 'splitScreen'), (r'low\s*angle|low\s*authority|authority', 'lowAuthority'),
    (r'aisle|track(?:ing)?\s*down', 'aisleTrack'), (r'whip', 'whip'), (r'orbit', 'orbit'), (r'pull', 'pull'), (r'drift|static', 'static-drift'), (r'push', 'push')]
SIZES = ['insert', 'close', 'medium', 'wide']
DEFAULT_SIZE = {'crashZoom': 'wide', 'topDown': 'wide', 'splitScreen': 'medium', 'lowAuthority': 'medium', 'aisleTrack': 'wide', 'whip': 'wide'}
LIMITS = {'minLen': 75, 'maxLen': 90, 'avgMin': 1.2, 'avgMax': 2.2, 'staticMax': 2.5, 'movingMax': 3.5, 'splitMax': 3.0}
STATIC = ('static-drift', 'topDown')
TS = re.compile(r'^\s*(?:(\d+):)?(\d+(?:\.\d+)?)\s*s?\s*[-–:|]?\s+(.*\S)\s*$')


def parse_ts(m):
    return int(m.group(1) or 0) * 60 + float(m.group(2))


def parse_list(text):
    """Pure: the owner's list → [(seconds, words)]. Blank lines and # comments skipped; a line with no timestamp is an error."""
    rows = []
    for n, line in enumerate(text.splitlines(), 1):
        if not line.strip() or line.strip().startswith('#'): continue
        m = TS.match(line)
        if not m: raise ValueError(f'line {n}: no timestamp: {line!r}')
        rows.append((parse_ts(m), m.group(3), n))
    rows.sort(key=lambda r: r[0])
    if rows and rows[0][0] != 0: raise ValueError('the first beat must be at 0:00 (the first second carries the hook)')
    for a, b in zip(rows, rows[1:]):
        if b[0] <= a[0]: raise ValueError(f'line {b[2]}: timestamp {b[0]} s does not follow {a[0]} s')
    return rows


def read_line(words, anchors, prev):
    """Pure: one beat's words → fields (move, size, anchor, subject, flags). prev = the carried-over anchor/size/subject."""
    w = words.lower(); out = {'anchor': prev.get('anchor'), 'size': None, 'subject': prev.get('subject')}
    out['move'] = next((mv for rx, mv in MOVES if re.search(rx, w)), 'push')
    out['size'] = next((s for s in SIZES if re.search(rf'\b{s}\b', w)), None)
    names = [a for a in anchors if re.search(rf'(?<![\w]){re.escape(a.lower())}(?![\w])', w)]
    if names: out['anchor'] = names[0]; out['anchors'] = names
    for c in CAST:
        if re.search(rf'(?<![\w]){c.lower().replace("_", "[ _]")}(?![\w])', w): out['subject'] = c; break
    out['freeze'] = None
    fm = re.search(r'freeze(?:\s+(\d+(?:\.\d+)?)\s*(f|s)?)?', w)
    if fm: out['freeze'] = {'frames': int(float(fm.group(1)) * (24 if fm.group(2) == 's' else 1)) if fm.group(1) else 12}
    out['impact'] = bool(re.search(r'\bimpact\b', w)); out['twos'] = bool(re.search(r'on\s*twos', w)); out['reveal'] = bool(re.search(r'\breveal', w))
    gm = re.search(r'\b(memory|dawn)\b', w); out['grade'] = gm.group(1) if gm else None; out['cascade'] = bool(re.search(r'lights?\s*(cascade|on)', w))
    return out


def build(rows, world, fps=24, end=None, cast_keys=None):
    """Pure: parsed rows → {shots, effects, end, summary}. Raises on an unknown place."""
    idx = json.load(open(os.path.join(ROOT, 'parts/sets4/anchors.json')))[world]; anchors = idx['anchors']
    starts = [round(r[0] * fps) for r in rows]; end_f = round((end if end is not None else rows[-1][0] + 2.0) * fps)
    if end_f <= starts[-1]: raise ValueError('--end must be after the last beat')
    shots, effects, prev = [], [], {}; warn = []
    for i, (row, f0) in enumerate(zip(rows, starts)):
        f1 = starts[i + 1] if i + 1 < len(starts) else end_f; frames = f1 - f0; dur = frames / fps
        rd = read_line(row[1], anchors, prev); anchor = rd['anchor']
        if not anchor: raise ValueError(f'line {row[2]}: no place named; use one of {anchors}')
        mv = rd['move']; size = rd['size'] or DEFAULT_SIZE.get(mv) or prev.get('size') or 'medium'
        sh = {'id': f'B{i + 1:02d}-{mv}', 'frames': frames, 'move': mv, 'size': size, 'anchor': anchor, 'shadowRadius': 14, 'why': row[1]}
        if rd['subject']:
            key = (cast_keys or {}).get(rd['subject'], rd['subject'].lower()); sh['subject'] = key
        if mv == 'crashZoom': sh.update({'to': {'fov': 12}, 'zoomAt': round(min(.4, dur * .3), 2)})
        if mv == 'topDown': sh.update({'degrees': 30, 'static': True})
        if mv == 'splitScreen':
            two = rd.get('anchors', [])
            if len(two) < 2: raise ValueError(f'line {row[2]}: split needs two places, e.g. "split counter | track"')
            sh.update({'a': {'anchor': two[0]}, 'b': {'anchor': two[1]}}); sh.pop('anchor')
        if mv == 'static-drift': sh['static'] = True
        if rd['freeze']: sh['freeze'] = [round(dur * .45, 2), rd['freeze']['frames']]
        if rd['impact']: sh['impact'] = round(dur * .5, 2)
        if rd['twos']: sh['step'] = 2
        if rd['reveal'] or i == 0: sh['reveal'] = True
        if rd['grade']: sh['grade'] = rd['grade']
        if rd['cascade']: effects.append({'type': 'lightsCascade', 'at': round(f0 / fps, 3), 'step': .11, 'points': idx.get('practicals', []), 'color': '#ffd68a', 'size': 2.6})
        shots.append(sh); prev = {'anchor': anchor if mv != 'splitScreen' else prev.get('anchor', anchor), 'size': size, 'subject': rd['subject']}
        lim = LIMITS['staticMax'] if mv in STATIC else LIMITS['movingMax']
        if dur > lim + 1e-9: warn.append(f"{sh['id']}: {'static' if mv in STATIC else 'moving'} shot {dur:.2f} s > {lim}")
        if mv == 'splitScreen' and dur > LIMITS['splitMax'] + 1e-9: warn.append(f"{sh['id']}: splitScreen {dur:.2f} s > {LIMITS['splitMax']}")
    length = end_f / fps; avg = length / len(shots)
    if not LIMITS['minLen'] <= length <= LIMITS['maxLen']: warn.append(f"length {length:.2f} s outside {LIMITS['minLen']}–{LIMITS['maxLen']} s")
    if not LIMITS['avgMin'] <= avg <= LIMITS['avgMax']: warn.append(f"average shot {avg:.2f} s outside {LIMITS['avgMin']}–{LIMITS['avgMax']} s")
    return {'shots': shots, 'effects': effects, 'end': round(length, 3), 'summary': {'shots': len(shots), 'lengthS': round(length, 2), 'averageShotS': round(avg, 2), 'warnings': warn}}


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--world', default='toyhouse'); a.add_argument('--list', required=True); a.add_argument('--spec'); a.add_argument('--out'); a.add_argument('--end', type=float); a.add_argument('--fps', type=int, default=24)
    o = a.parse_args()
    try: r = build(parse_list(open(o.list).read()), o.world, o.fps, o.end)
    except ValueError as e: print(f'beats: {e}', file=sys.stderr); sys.exit(1)
    if o.spec:
        spec = json.load(open(o.spec)); spec.update({'shots': r['shots'], 'end': r['end'], 'fps': o.fps, 'format': 5}); spec['effects'] = [*[e for e in spec.get('effects', []) if e.get('type') != 'lightsCascade'], *r['effects']]
        json.dump(spec, open(o.out or o.spec, 'w'), indent=1)
    else:
        json.dump({k: r[k] for k in ('shots', 'effects', 'end')}, open(o.out, 'w'), indent=1) if o.out else None
    print(json.dumps(r['summary'])); sys.exit(0)


if __name__ == '__main__':
    main()
