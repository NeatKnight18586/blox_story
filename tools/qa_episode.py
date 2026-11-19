#!/usr/bin/env python3
"""tools/qa_episode.py: the retention QA linter, "view-jail guard" (Retention Engine Phase 3).

  python3 tools/qa_episode.py --story <slug> [--spec episodes/EPnn/spec.yml] [--final] [--allow ID --reason "…"]… [--out f.json]
  python3 tools/qa_episode.py --dir <folder with episode.json, cues.json, script.txt> …     (fixtures)

Reads stories/<slug>/{episode.json, cues.json, script.txt} and the episode's spec.yml (found by `slug:` under episodes/ if not given).
Prints one line per rule ID: PASS / FAIL / SKIP / ALLOWED with timestamps. SKIP = the rule needs a spec field or a later phase.
Exit 1 on any FAIL; with --final also on any SKIP (nothing un-checked reaches a final render, R-FLOW-06).
--allow ID --reason "…" turns that rule's FAIL/SKIP into ALLOWED and appends it to the allow log (episodes/EPnn/qa/allow.log, or
review/<slug>/qa-allow.log without an episode folder). --final also honours every ID already in that log, so the farm uses only
allows that were committed. N-* rules can't be allowed.
Pure: check(...) → [{id, status, msg, at}]. Tests: tests/v2/test_qa_episode.py.
"""
import argparse, datetime, json, math, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from validate_spec import read_tier  # noqa: E402

STATIC_MOVES = {'static-drift', 'static'}
WIDE_MOVES = {'topDown', 'drone'}
EVENT_KEYS = ('impact', 'zoomAt', 'snapAt')          # shot-local camera events (s)
GAP = 0.4                                             # R-LEAK-01
CUT_TOL_FRAMES = 2                                    # R-CUT-01: a cut within 2 frames of a word start
AVG = (1.5, 2.2)                                      # R-CUT-01
STATIC_MAX, MOVING_MAX = 2.5, 3.5                     # R-LEAK-02
SAME_CLASS_MAX = 2                                    # R-CAM-02
END_MAX = 0.3                                         # R-END-01
HOOK_S, HOOK_WORDS, VO_START = 5.0, 18, 0.3           # R-HOOK-04
NEW_INFO_S = 6.0                                      # R-MID-01
REVERSAL = (.55, .75)                                 # R-MID-03
ACT1_END_S = 25.0                                     # R-STORY-02: Act I ≈ 0:04–0:25 (spec act2_at_s overrides)
COUNTER_MIN = 3                                       # R-MID-02
HARD = (60, 175)                                      # R-LEN-03
LOOP_OK = {'pos': .15, 'target': .15, 'fov': 5}       # R-LOOP-01 (= engine/presets6.js LOOP_OK)
SIGN_CAP, SIGN_SECS = .03, 1.0                        # R-SIGN-01: cap ≥ 3 % of frame height, ≥ 1.0 s on screen
BANNED = ['thanks for watching', 'thank you for watching', 'subscribe', 'follow for more', 'like and follow', 'part 2', 'part two',
          'see you next time', 'smash that like', 'hit the bell']
GREETINGS = {'hi', 'hey', 'hello', 'welcome', 'guys', 'today'}
FIRST_PERSON = re.compile(r"\b(i|me|my|mine|myself|we|us|our|ours|ourselves|i'm|i've|i'd|i'll|we're|we've)\b", re.I)
LABEL_KEYS = {'tag', 'tags', 'bubble', 'classReveal', 'classReveals', 'card'}
LEGACY_CAPTIONS = {'pop-shorts-v2', 'pop-shorts-v3', 'pop-shorts-v5', 'white-shorts-v1', None}
UNALLOWABLE = ('N-',)


# ---------- pure helpers ----------
def cue_words(cues):
    return [{'w': w.get('w', w.get('word', '')), 'start': float(w['start']), 'end': float(w['end'])} for l in cues['lines'] for w in l['words']]


def clean_script(text):
    return re.sub(r'\*', '', text)


def sentences(text):
    return [s.strip() for s in re.split(r'(?<=[.!?…])\s+|\n+', clean_script(text)) if s.strip()]


def outside_quotes(s):
    return re.sub(r'"[^"]*"|“[^”]*”', ' ', s)


def shot_list(ep):
    shots = sorted(ep.get('shots', []), key=lambda s: s['at'])
    return shots


def durations(shots, end):
    ats = [s['at'] for s in shots] + [end]
    return [b - a for a, b in zip(ats, ats[1:])]


def runtime_of(ep, cues):
    """Finished video length (s), modelled on assemble.py end_total: format 6 = the picture; 5 = max(pic, voice + .85); older = max(pic, voice + 2.5, 122.5)."""
    shots = shot_list(ep)
    pic = float(ep.get('end') or (shots[-1]['at'] if shots else 0))
    vlen = float(cues.get('duration') or 0)
    fmt = ep.get('format')
    if fmt == 6: return pic
    if fmt == 5: return max(pic, vlen + .85)
    return max(pic, vlen + 2.5, 122.5)


def gaps(words, thr=GAP):
    return [(a['end'], b['start']) for a, b in zip(words, words[1:]) if b['start'] - a['end'] > thr + 1e-9]


def camera_events(shots):
    ev = []
    for s in shots:
        if s['at'] > 0: ev.append(s['at'])
        for k in EVENT_KEYS:
            if isinstance(s.get(k), (int, float)): ev.append(s['at'] + s[k])
        if isinstance(s.get('freeze'), list) and s['freeze']: ev.append(s['at'] + s['freeze'][0])
    return sorted(ev)


def shot_class(s):
    if s.get('size') == 'insert' or s.get('move') == 'macro': return 'macro'
    if s.get('size') == 'wide' or s.get('move') in WIDE_MOVES: return 'wide'
    return None


def locked(s):
    """R-CAM-01: no camera motion at all (a static move, from == to, or a topDown with no turn). `static: true` alone is not
    'locked': format 5 uses it to mark a held framing (length limit), e.g. a slowly turning topDown."""
    if s.get('move') in STATIC_MOVES: return True
    if s.get('move') == 'topDown': return not s.get('degrees', 40)
    if s.get('move') == 'orbit': return not s.get('degrees', 30)   # an orbit sweeps `degrees` around the target (from == to by design)
    f, t = s.get('from'), s.get('to')
    return bool(f and t and f == t)


def held(s):
    """R-LEAK-02: a held framing (static length limit 2.5 s)."""
    return bool(s.get('static')) or locked(s)


def find_keys(obj, keys, path=''):
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in keys and v not in (None, False, [], {}): out.append(f'{path}.{k}'.lstrip('.'))
            out += find_keys(v, keys, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj): out += find_keys(v, keys, f'{path}[{i}]')
    return out


def hero_keys(ep):
    return [k for k, c in (ep.get('cast') or {}).items() if k.lower() == 'hero' or (isinstance(c, dict) and 'HERO' in (c.get('preset'), c.get('troupe')))]


def fmt_t(t): return f'{t:.2f}s'


def _pose(s, end=False):
    f = s.get('from') or (s.get('a') or {}).get('from')
    if not f: return None
    e = (s.get('to') or {}) if end else {}
    return {'position': e.get('position', f['position']), 'target': e.get('target', f['target']), 'fov': e.get('fov', f.get('fov', 40))}


def loop_score(first, last):
    """R-LOOP-01: distance of the last frame's camera from frame 1's, relative to frame 1's camera–target distance; fov delta (deg)."""
    a, b = _pose(first), _pose(last, end=True)
    if not a or not b: return None
    d = lambda u, v: math.dist(u, v)
    ref = d(a['position'], a['target']) or 1
    return {'pos': round(d(a['position'], b['position']) / ref, 3), 'target': round(d(a['target'], b['target']) / ref, 3), 'fov': round(abs(a['fov'] - b['fov']), 2)}


def sign_legibility(signs, shots, dur):
    """{sign id: legible seconds}: shots whose `see` lists the sign, cap height / frame height ≥ 3 % from the shot's opening camera."""
    out = {}
    for g in signs:
        t = 0.0
        for s, dd in zip(shots, dur):
            p = _pose(s)
            if not p or g['id'] not in (s.get('see') or []): continue
            dist = math.dist(p['position'], g['at']); fh = 2 * dist * math.tan(math.radians(p['fov']) / 2)
            if fh > 0 and g.get('capH', 0) / fh >= SIGN_CAP - 1e-9: t += dd
        out[g['id']] = round(t, 2)
    return out


def caption_check(style_name, cues, fps):
    """R-CAP-01/02 for the v6 style (scripts/v2/captions.py group6/timing6, the same code the finish uses): per caption the start
    error vs its first word's onset in frames, captions on screen < 2 frames, max words. → dict or None (unknown style)."""
    sys.path.insert(0, str(ROOT / 'scripts/v2')); import captions as CAP
    path = CAP.STYLES.get(style_name)
    if not path: return None
    st = json.loads((ROOT / path).read_text()); st['fontFile'] = str(ROOT / st['fontFile'])
    if st.get('grouping') != 'v6': return {'grouping': st.get('grouping'), 'maxWords': st.get('maxWords', 3), 'accentApproved': False, 'accent': None, 'errMin': 0, 'errMax': 0, 'short': [], 'bad': [], 'captions': 0}
    t = CAP.timing6(CAP.group6(cues, st, fps), fps, st['blankPause'])
    err = [(c['start'] - c['onset']) * fps for c in t]
    short = [' '.join(c['words']) for c in t if (c['end'] - c['start']) * fps < 2 - 1e-3]
    acc = (st.get('accentOptions') or {}).get(st.get('accentKey'), {}).get('hex')
    return {'grouping': 'v6', 'maxWords': max(len(c['words']) for c in t), 'accentApproved': bool(st.get('accentApproved')), 'accent': acc,
            'errMin': round(min(err), 3), 'errMax': round(max(err), 3), 'short': short, 'captions': len(t),
            'bad': [(c['onset'], e) for c, e in zip(t, err) if abs(e) > 1 + 1e-9]}


def check(ep, cues, script, spec=None, tier=(105, 135), story_dir=None):
    """→ [{id, status: PASS|FAIL|SKIP, msg, at: [s…]}] in rule order."""
    R = []
    def add(rid, ok, msg, at=()):
        R.append({'id': rid, 'status': 'PASS' if ok is True else ('SKIP' if ok is None else 'FAIL'), 'msg': msg, 'at': [round(x, 2) for x in at][:12]})
    spec = spec or {}
    fps = ep.get('fps', 30)
    words, shots = cue_words(cues), shot_list(ep)
    end = runtime_of(ep, cues)
    pic_end = float(ep.get('end') or end)
    dur = durations(shots, pic_end)
    sents = sentences(script)
    last = words[-1]['end'] if words else 0

    # --- brand / non-negotiables visible in data
    first2 = ' '.join(w['w'].lower().strip('.,!?…"') for w in words[:2])
    add('R-BRAND-01', first2 == 'in this', f'opens "{" ".join(w["w"] for w in words[:3])}" (want "In this …")', [words[0]['start']] if words else [])
    fp = [s for s in sents if FIRST_PERSON.search(outside_quotes(s))]
    add('N-VO-03', not fp, f'{len(fp)} first-person sentence(s) outside quotes' + (f': "{fp[0][:60]}"' if fp else ''))
    hk = hero_keys(ep)
    sig = (ep.get('signature') or {}).get('prop')
    early = [s for s in shots if s['at'] < 3.0]
    hero_seen = any(set(s.get('see') or []) & set(hk) for s in early)
    prop_seen = bool(sig) and any(sig in (s.get('see') or []) for s in early)
    add('R-BRAND-03', hero_seen and prop_seen, f'hero in 0–3 s: {"yes" if hero_seen else "no"}; signature prop: '
        + (('in frame' if prop_seen else f'"{sig}" not in 0–3 s') if sig else 'none defined (episode.json signature.prop; Phase 4)'))
    bad_faces = [k for k, c in (ep.get('cast') or {}).items() if isinstance(c, dict) and ((c.get('faceStyle') and c['faceStyle'] != 'v5') or (not c.get('faceStyle') and c.get('style') not in ('v5', None) and not c.get('troupe')))]
    add('N-FACE-01', not bad_faces, 'all cast on faces v5' if not bad_faces else f'not faces v5: {", ".join(bad_faces)}')
    sfx_on = (ep.get('sfx') in (True, 'on')) if ep.get('format') == 6 else (ep.get('sfx') is not False and ep.get('sfx') != 'off')
    implied = sfx_on and ep.get('sfx') not in (True, 'on')
    music = bool(story_dir) and (Path(story_dir) / 'music.mp3').exists()
    add('N-AUD-01', not implied and not music, ('sfx would be auto-placed (no explicit "sfx": "on"; set "sfx": false or format 6)' if implied else
        f'sfx {"on (explicit)" if sfx_on else "off"}') + ('; music.mp3 present (owner handles BGM)' if music else ''))
    lab = find_keys({'cast': ep.get('cast'), 'shots': ep.get('shots')}, LABEL_KEYS)
    labels_off = ep.get('labels') is False or ep.get('season') == 1
    add('R-LABEL-01', labels_off and not lab, ('labels: false' if labels_off else 'spec lacks "labels": false') + (f'; label keys at {", ".join(lab[:4])}' if lab else ''))

    # --- hook
    add('R-HOOK-03', bool(shots) and not locked(shots[0]) and bool(shots[0].get('reveal') or shots[0].get('openHit')) and
        not (GREETINGS & {w['w'].lower().strip('.,!?') for w in words[:4]}),
        f'shot 1 {shots[0].get("move") if shots else "—"}, reveal {bool(shots and shots[0].get("reveal"))}; first words "{" ".join(w["w"] for w in words[:4])}"', [0])
    if spec.get('hook_rule') and spec.get('hook_break'):
        n, src = len((spec['hook_rule'] + ' ' + spec['hook_break']).split()), 'spec'
    else:
        n, src = len(' '.join(sents[:2]).split()), 'first 2 sentences (no spec)'
    hook_end = words[min(n, len(words)) - 1]['end'] if words else 0
    vo0 = words[0]['start'] if words else 99
    add('R-HOOK-04', vo0 <= VO_START and n <= HOOK_WORDS and hook_end <= HOOK_S + 1e-9,
        f'VO starts {fmt_t(vo0)} (≤ {VO_START}); hook = {n} words ({src}, ≤ {HOOK_WORDS}) ends {fmt_t(hook_end)} (≤ {HOOK_S})', [vo0, hook_end])
    r = spec.get('roblox_context_starts_at_s')
    add('R-HOOK-02', None if r is None else r >= 5, f'roblox context starts {r} s (≥ 5)' if r is not None else 'needs spec roblox_context_starts_at_s')
    add('R-JOLT-01', bool(shots) and bool(shots[0].get('openHit')) and not [s for s in shots[1:] if s.get('openHit')] and
        not [e for e in (ep.get('effects') or []) if e.get('type') == 'shake'],
        f'openHit on shot 1: {bool(shots and shots[0].get("openHit"))}; other openHit: {[s["id"] for s in shots[1:] if s.get("openHit")]}; '
        f'shake effects at {[e.get("at") for e in (ep.get("effects") or []) if e.get("type") == "shake"]}', [0])

    # --- cadence and camera
    avg = pic_end / len(shots) if shots else 0
    gp = gaps(words)
    starts = [w['start'] for w in words]
    off = [s['at'] for s in shots if s['at'] > 0 and min(abs(s['at'] - t) for t in starts) > CUT_TOL_FRAMES / fps + 1e-9
           and not any(a - 1e-9 <= s['at'] <= b + 1e-9 for a, b in gp)]
    add('R-CUT-01', AVG[0] <= avg <= AVG[1] and not off, f'{len(shots)} shots, average {avg:.2f} s ({AVG[0]}–{AVG[1]}); {len(off)} cut(s) not on a word start or in a VO gap', off)
    long_ = [(s, d) for s, d in zip(shots, dur) if (held(s) and d > STATIC_MAX + 1e-9) or d > MOVING_MAX + 1e-9]
    add('R-LEAK-02', not long_, f'{len(long_)} shot(s) too long (static > {STATIC_MAX}, moving > {MOVING_MAX}): ' + ', '.join(f'{s["id"]} {d:.2f}' for s, d in long_[:6]), [s['at'] for s, _ in long_])
    lock = [s for s in shots if locked(s)]
    add('R-CAM-01', not lock, f'{len(lock)} locked-off shot(s)' + (': ' + ', '.join(s['id'] for s in lock[:6]) if lock else ''), [s['at'] for s in lock])
    ev = camera_events(shots)
    dead = [(a, b) for a, b in gp if not any(a - 1e-9 <= t <= b + 1e-9 for t in ev)]
    add('R-LEAK-01', not dead, f'{len(gp)} VO gap(s) > {GAP} s (VO is final, N-VO-02); {len(dead)} with no cut/camera event: '
        + ', '.join(f'{a:.2f}+{b - a:.2f}' for a, b in dead[:8]), [a for a, _ in dead])
    cls = [shot_class(s) for s in shots]
    pairs = [shots[i + 1] for i in range(len(cls) - 1) if cls[i] and cls[i] == cls[i + 1]]
    add('R-CAM-02', len(pairs) <= SAME_CLASS_MAX, f'{len(pairs)} same-class neighbour pair(s) (wide-wide / macro-macro; ≤ {SAME_CLASS_MAX})', [s['at'] for s in pairs])

    # --- middle
    beats = sorted(b['at_s'] for b in (spec.get('beats') or []) if isinstance(b, dict) and isinstance(b.get('at_s'), (int, float)))
    src = 'spec beats'
    if not beats: beats, src = [l['words'][0]['start'] for l in cues['lines'] if l.get('words')], 'proxy: script line starts (no spec beats)'
    pts = [0.0] + beats + [end]
    over = [(a, b - a) for a, b in zip(pts, pts[1:]) if b - a > NEW_INFO_S + 1e-9]
    add('R-MID-01', not over, f'{len(beats)} beats ({src}); {len(over)} gap(s) > {NEW_INFO_S} s: ' + ', '.join(f'{a:.2f}+{g:.2f}' for a, g in over[:6]), [a for a, _ in over])
    rev = spec.get('reversal_at_s')
    if rev is None: rev = next((b['at_s'] for b in (spec.get('beats') or []) if isinstance(b, dict) and b.get('type') == 'reversal'), None)
    add('R-MID-03', None if rev is None else REVERSAL[0] <= rev / end <= REVERSAL[1],
        f'reversal at {rev} s = {rev / end * 100:.0f} % of {end:.2f} s (55–75 %)' if rev is not None else 'needs spec reversal_at_s or a reversal beat', [rev] if rev else [])
    obj = (spec.get('counter') or {}).get('object')
    if obj and rev is not None:
        a2 = spec.get('act2_at_s', ACT1_END_S)
        seen = [s for s, d in zip(shots, dur) if s['at'] < rev and s['at'] + d > a2 and (obj in (s.get('see') or []) or (obj == 'clock' and s.get('clock')))]
        add('R-MID-02', len(seen) >= COUNTER_MIN, f'counter "{obj}" in {len(seen)} Act II shot(s) ({a2}–{rev} s, ≥ {COUNTER_MIN}); advancing = owner check on the sheet', [s['at'] for s in seen])
    else:
        add('R-MID-02', None, 'needs spec counter.object and reversal_at_s')

    # --- signage, hero shots, loop
    sg, es = spec.get('signage'), ep.get('signs') or []
    if es:   # placed signs (engine/signs6.js): count, words, and legibility measured from the cameras
        leg = sign_legibility(es, shots, dur); short = {k: v for k, v in leg.items() if v < SIGN_SECS}
        long_signs = [g['text'] for g in es if len(str(g['text']).split()) > 3]
        add('R-SIGN-01', 3 <= len(es) <= 6 and not long_signs and not short, f'{len(es)} placed signs (3–6), over 3 words: {long_signs}; legible < {SIGN_SECS} s: {short or "none"}')
    elif sg:
        t = [x.get('text') if isinstance(x, dict) else x for x in sg]
        long_signs = [x for x in t if len(str(x).split()) > 3]
        add('R-SIGN-01', None if 3 <= len(t) <= 6 and not long_signs else False, f'{len(t)} signs in the spec (3–6), over 3 words: {long_signs}; none placed yet (episode.json signs, engine/signs6.js) so legibility is unmeasured')
    else:
        add('R-SIGN-01', None, 'needs spec signage / episode.json signs')
    hs = [i for i, s in enumerate(shots) if s.get('hero')]
    ok = len(hs) == 3 and shots and hs[0] == 0 and hs[-1] == len(shots) - 1
    if ok and rev is not None:
        mid = shots[hs[1]]; ok = mid['at'] <= rev + 1e-9 < mid['at'] + dur[hs[1]] + 1.0
    add('R-HERO-01', ok, f'{len(hs)} shot(s) marked hero (need 3: first, the reversal, last): {[shots[i]["id"] for i in hs]}')
    ls = loop_score(shots[0], shots[-1]) if len(shots) > 1 else None
    add('R-LOOP-01', None if ls is None else all(ls[k] <= LOOP_OK[k] for k in LOOP_OK),
        f'last frame vs frame 1: camera {ls["pos"]}, target {ls["target"]} (× cam–target distance, ≤ {LOOP_OK["pos"]}), fov Δ {ls["fov"]}° (≤ {LOOP_OK["fov"]}); loop helper: presets6.loopify' if ls else 'needs camera poses on the first and last shots')

    # --- captions
    style = ep.get('captionStyle')
    if style in LEGACY_CAPTIONS:
        add('R-CAP-01', False, f'caption style {style}: legacy (groups up to 3 words, yellow keywords)')
        add('R-CAP-02', None, f'caption sync is measured for the v6 style only (style {style})')
    else:
        cs = caption_check(style, cues, fps)
        if cs is None:
            add('R-CAP-01', None, f'caption style {style}: unknown'); add('R-CAP-02', None, f'caption style {style}: unknown')
        else:
            ok1 = cs['maxWords'] <= 2 and cs['grouping'] == 'v6'
            add('R-CAP-01', (None if not cs['accentApproved'] else True) if ok1 else False,
                f"{style}: max {cs['maxWords']} words, accent {cs['accent']} ({'approved' if cs['accentApproved'] else 'owner pick pending: captions/pop-shorts-v6.json accentApproved'})")
            add('R-CAP-02', cs['errMin'] >= -1 - 1e-9 and cs['errMax'] <= 1 + 1e-9 and not cs['short'],
                f"{cs['captions']} captions, start − onset {cs['errMin']:+.2f}…{cs['errMax']:+.2f} frames (± 1); shown < 2 frames: {cs['short'][:3] or 'none'}",
                [t for t, _ in cs['bad']])

    # --- ending and length
    tail = end - last
    add('R-END-01', -1e-9 <= tail <= END_MAX + 1e-9, f'video ends {fmt_t(end)}, last word ends {fmt_t(last)}: tail {tail:.2f} s (0–{END_MAX})', [last, end])
    low = clean_script(script).lower()
    hits = [p for p in BANNED if p in low]
    fades = [e for e in (ep.get('effects') or []) if e.get('type') == 'fadeColor' and float(e.get('at', 0)) >= end - 2]
    add('R-END-02', not hits and not fades, f'banned phrases {hits}; fade in the last 2 s: {len(fades)}')
    add('R-LEN-03', HARD[0] <= end <= HARD[1], f'runtime {fmt_t(end)} ({HARD[0]}–{HARD[1]})')
    add('R-LEN-01', tier[0] <= end <= tier[1], f'runtime {fmt_t(end)} vs current tier {tier[0]}–{tier[1]} s (docs/LENGTH_TIER.md)')
    return R


def apply_allow(results, allow):
    for r in results:
        if r['status'] in ('FAIL', 'SKIP') and r['id'] in allow and not r['id'].startswith(UNALLOWABLE): r['status'] = 'ALLOWED'
    return results


def logged_allows(log):
    return {m.group(1) for m in re.finditer(r'--allow (\S+)', Path(log).read_text())} if Path(log).exists() else set()


# ---------- CLI ----------
def find_spec(slug):
    import yaml
    for p in sorted((ROOT / 'episodes').glob('EP*/spec.yml')):
        s = yaml.safe_load(p.read_text()) or {}
        if s.get('slug') == slug: return p
    return None


def main():
    import yaml
    a = argparse.ArgumentParser()
    a.add_argument('--story'); a.add_argument('--dir'); a.add_argument('--spec'); a.add_argument('--final', action='store_true')
    a.add_argument('--allow', action='append', default=[]); a.add_argument('--reason', default=''); a.add_argument('--out')
    a.add_argument('--quiet', action='store_true'); o = a.parse_args()
    if not (o.story or o.dir): a.error('--story or --dir')
    d = Path(o.dir) if o.dir else ROOT / 'stories' / o.story
    slug = o.story or d.name
    ep = json.loads((d / 'episode.json').read_text()); cues = json.loads((d / 'cues.json').read_text())
    script = (d / 'script.txt').read_text() if (d / 'script.txt').exists() else ''
    sp = Path(o.spec) if o.spec else (d / 'spec.yml' if (d / 'spec.yml').exists() else find_spec(slug))
    spec = yaml.safe_load(sp.read_text()) if sp else None
    log = (sp.parent / 'qa' / 'allow.log') if sp and sp.parent.name.startswith('EP') else (ROOT / 'review' / slug / 'qa-allow.log'
           if d.resolve().parent == (ROOT / 'stories').resolve() else d / 'qa-allow.log')
    res = check(ep, cues, script, spec, read_tier(), d)
    new = [r for r in res if r['status'] in ('FAIL', 'SKIP') and r['id'] in o.allow and not r['id'].startswith(UNALLOWABLE)]
    if new:
        log.parent.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ')
        with log.open('a') as f:
            for r in new: f.write(f'{stamp} qa_episode --allow {r["id"]} ({r["status"]}: {r["msg"]}) | reason: {o.reason or "(none given)"}\n')
    apply_allow(res, set(o.allow) | (logged_allows(log) if o.final else set()))
    n = {k: sum(r['status'] == k for r in res) for k in ('PASS', 'FAIL', 'SKIP', 'ALLOWED')}
    if not o.quiet:
        for r in res: print(f'{r["status"]:7} {r["id"]:11} {r["msg"]}' + (f'  @ {", ".join(f"{t:.2f}" for t in r["at"])}' if r['at'] and r['status'] != 'PASS' else ''))
    blocked = n['FAIL'] or (o.final and n['SKIP'])
    print(f'QA {slug}: {n["PASS"]} PASS, {n["FAIL"]} FAIL, {n["SKIP"]} SKIP, {n["ALLOWED"]} ALLOWED → {"BLOCKED" if blocked else "OK"}'
          + (' (--final: SKIP blocks)' if o.final else '') + (f' · spec {sp}' if sp else ' · no spec'))
    in_stories = d.resolve().parent == (ROOT / 'stories').resolve()
    out = Path(o.out) if o.out else ((sp.parent / 'qa' / 'qa.json') if sp and sp.parent.name.startswith('EP') else
                                     (ROOT / 'review' / slug / 'qa-retention.json' if in_stories else None))   # fixtures: report only with --out
    if out:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps({'story': slug, 'final': o.final, 'counts': n, 'blocked': bool(blocked), 'results': res}, indent=1))
    sys.exit(1 if blocked else 0)


if __name__ == '__main__':
    main()
