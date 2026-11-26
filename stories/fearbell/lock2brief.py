#!/usr/bin/env python3
"""stories/fearbell/lock2brief.py — MECHANICAL conversion PICTURE_LOCK.md → BRIEF.md (owner, fearbell PREVIS session).

One BEATS row per PICTURE_LOCK row; cue times = the row's words in stories/fearbell/cues.json (raw aligned VO, before meme gaps;
start = the row's first word onset, end = the next row's first onset, last row = last word end). Words, MUST SEE, sync word,
location and notes are copied verbatim; the lock camera is mapped to a camera.js MOVES name + a camtpl kind by the CAMERA table
below; anything without an engine equivalent is listed in UNMAPPED (stories/fearbell/build/lock2brief.json) — never substituted.
  python3 stories/fearbell/lock2brief.py
"""
import json, re, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
LOCK, CUES, OUT, REP = (os.path.join(ROOT, f) for f in ('PICTURE_LOCK.md', 'cues.json', 'BRIEF.md', 'build/lock2brief.json'))

# lock camera → (size, MOVES name, camtpl kind, part with no engine equivalent or '')
CAMERA = {
    'crashZoom out from the bell': ('close', 'crashZoom', 'cu', 'crashZoom OUT (engine crashZoom only zooms in)'),
    'wide drone over the plaza': ('wide', 'drone', 'wide', ''),
    'snap in to CU, then two': ('close', 'snap', 'cu', '"then two" (a second framing inside one shot)'),
    'low angle up at the balcony': ('medium', 'heroLow', 'ms', ''),
    'medium': ('medium', 'static-drift', 'ms', ''),
    'whip-tilt up': ('medium', 'tiltUp', 'ms', '"whip" speed on a tilt (tiltUp is a slow tilt; whip is a pan)'),
    'snap to wide': ('wide', 'snap', 'wide', 'snap OUT to wide (engine snap punches wide → close)'),
    'heroLow': ('medium', 'heroLow', 'ms', ''),
    'wide': ('wide', 'static-drift', 'wide', ''),
    'slow push (the single stillness)': ('medium', 'push', 'ms', ''),
    'high wide': ('wide', 'static-drift', 'establish', ''),
    'CU': ('close', 'static-drift', 'cu', ''),
    'low angle push': ('medium', 'lowAuthority', 'ms', ''),
    'insert → wide': ('insert', 'static-drift', 'insert', '"→ wide" (a second framing inside one shot)'),
    'two': ('medium', 'static-drift', 'two', ''),
    'snap': ('close', 'snap', 'cu', ''),
    'MCU': ('medium', 'static-drift', 'mcu', ''),
    'insert': ('insert', 'static-drift', 'insert', ''),
    'track': ('medium', 'track', 'ms', ''),
    'ots': ('medium', 'static-drift', 'ots', ''),
    'low angle': ('medium', 'heroLow', 'ms', ''),
    'insert ECU': ('ecu', 'static-drift', 'insert', ''),
    'insert / tiltUp': ('insert', 'tiltUp', 'insert', '"insert / tiltUp" names two options; tiltUp kept'),
    'wide drone': ('wide', 'drone', 'wide', ''),
    'wide from the stair foot': ('wide', 'static-drift', 'wide', ''),
    'push': ('medium', 'push', 'ms', ''),
    'track behind': ('medium', 'track', 'ms', '"behind" (track follows from the template side)'),
    'low angle (Lulu POV)': ('medium', 'heroLow', 'ms', '"Lulu POV" (no POV camera on a cast member)'),
    'snap, snap': ('close', 'snap', 'cu', 'two snaps in one shot (one snap per shot)'),
    'insert → two': ('insert', 'static-drift', 'insert', '"→ two" (a second framing inside one shot)'),
    'low angle → two': ('medium', 'heroLow', 'ms', '"→ two" (a second framing inside one shot)'),
    'CU on the puff': ('close', 'static-drift', 'insert', ''),
}
# MUST SEE subject (first named thing of the lock's MUST SEE; CAST role names / prop / creature as written in the lock)
SUBJECT = {1: 'prop:bell', 2: 'town', 3: 'ghost+buslady', 4: 'governor', 5: 'pickles', 6: 'pickles', 7: 'mailman', 8: 'trex+mailman', 9: 'bodybuilder',
    10: 'rat+bodybuilder', 11: 'kevin', 12: 'kevin', 13: 'town', 14: 'hero', 15: 'hero', 16: 'prop:desk', 17: 'spider+teacher', 18: 'kids', 19: 'vacuum+dad',
    20: 'dad', 21: 'kevin', 22: 'kevin', 23: 'prop:burger', 24: 'lulu+shadowPuff', 25: 'shadowPuff+lulu', 26: 'hero+lulu', 27: 'lulu+hero', 28: 'hero', 29: 'bodybuilder',
    30: 'rat', 31: 'governor', 32: 'prop:bell', 33: 'governor', 34: 'prop:bell', 35: 'town', 36: 'dome', 37: 'lulu', 38: 'crowd', 39: 'hero', 40: 'hero', 41: 'hero',
    42: 'hero', 43: 'hero', 44: 'hero', 45: 'hero+lulu', 46: 'hero+lulu', 47: 'lulu', 48: 'lulu', 49: 'dome', 50: 'dome', 51: 'lulu', 52: 'town', 53: 'hero',
    54: 'shadowPuff', 55: 'prop:burger+hero'}
# mood: PICTURE_LOCK has no mood column; keyword rule on the lock's Notes (first match), default fun
MOOD_RULE = [('emotional', 'emotion'), ('PAYOFF', 'payoff'), ('crisis', 'tension'), ('PATTERN BREAK', 'tension'), ('spectacle', 'awe'), ('comedy beat', 'comedy'), ('laugh', 'comedy'), ('funny', 'comedy')]
norm = lambda w: re.sub(r"[^\w']", '', w.replace('’', "'")).lower().strip("'")


def lock_rows(md):
    rows = []
    for ln in md.splitlines():
        m = re.match(r'^\|\s*(\d+)\s*\|(.*)\|\s*$', ln)
        if not m: continue
        c = [x.strip() for x in m.group(2).split('|')]
        rows.append(dict(n=int(m.group(1)), t=c[0], line=c[1], see=c[2], sync=c[3], cam=c[4], loc=c[5], notes=c[6]))
    return rows


def main():
    rows, cues = lock_rows(open(LOCK).read()), json.load(open(CUES))
    W = [w for l in cues['lines'] for w in l['words']]
    i, unmapped, out = 0, [], []
    for r in rows:
        toks = [norm(x) for x in r['line'].split() if norm(x)]
        if [norm(w['w']) for w in W[i:i + len(toks)]] != toks: sys.exit(f"row {r['n']}: words {toks} not at cue word {i} ({[w['w'] for w in W[i:i + len(toks)]]})")
        r['w0'], r['w1'] = i, i + len(toks) - 1; i += len(toks)
    for k, r in enumerate(rows):
        r['start'] = 0.0 if k == 0 else W[r['w0']]['start']
        r['end'] = rows[k + 1]['start'] if k + 1 < len(rows) and 'start' in rows[k + 1] else None
    for k, r in enumerate(rows): r['end'] = W[rows[k + 1]['w0']]['start'] if k + 1 < len(rows) else W[-1]['end']
    for r in rows:
        if r['cam'] not in CAMERA: sys.exit(f"row {r['n']}: camera \"{r['cam']}\" not in the CAMERA table")
        size, move, tpl, um = CAMERA[r['cam']]
        if um: unmapped.append(f"row {r['n']} camera: {um}")
        mood = next((m for kw, m in MOOD_RULE if kw in r['notes'] or kw in r['see']), 'fun')
        sync = norm(r['sync']); hit = [w for w in W[r['w0']:r['w1'] + 1] if norm(w['w']) == sync]
        if not hit: unmapped.append(f"row {r['n']} sync word \"{r['sync']}\": not spoken in the row (\"{r['line']}\")")
        r['syncT'] = hit[0]['start'] if hit else None
        vo = r['line'].replace('|', '/')
        notes = [f"tpl: {tpl}", f"loc: {r['loc']}", f"sync: {r['sync']} @ {r['syncT']:.2f}" if hit else f"sync: {r['sync']}", f"MUST SEE: {r['see']}"] + ([f"lock notes: {r['notes']}"] if r['notes'] else [])
        out.append(f"| {r['n']} | {r['start']:.2f}–{r['end']:.2f} | {vo} | {mood} | {size} | {move} | {SUBJECT[r['n']]} | - | - | none | {' · '.join(notes).replace('|', '/')} |")
    md = f"""# EPISODE BRIEF: fearbell (mechanical conversion of stories/fearbell/PICTURE_LOCK.md by stories/fearbell/lock2brief.py; the lock is the creative truth)

## META
- slug: fearbell
- title: In this town, your WORST FEAR spawns! 🔔 #shorts #roblox
- pinned comment: What would spawn next to YOU when the Fear Bell rings? Did you find the loophole before me?
- comment question: What would spawn next to YOU when the Fear Bell rings?
- length target: 89.5 (VO 85.45 s + 3 meme gaps)
- spec flags: format: 7, lengthVariant: long

## PREMISE
- rule line: "In this town, the Fear Bell spawns your worst fear."
- loved one: Lulu · LITTLE
- clue plants: row 23 · row 30 (wider)
- twist line: A cheeseburger.
- last line: A cheeseburger.

## CAST
- HERO (fixed, `cast/hero.json`): outfit unchanged
- lulu → LITTLE · costume LULU
- governor → GOVERNOR
- kevin → SECOND · costume KEVIN
- pickles → ELDER · costume PICKLES
- mailman → ELDER · costume MAILMAN
- bodybuilder → ELDER · costume BODYBUILDER
- teacher → ADULT_F · costume TEACHER_FB
- dad → ELDER · costume DAD_FB
- buslady → ADULT_F · costume BUSLADY

## WORLD
- setting: the city (parts/city), Fear Bell episode
- locations: Hall belfry, Downtown plaza, Main St bus stop, Hall balcony, suburb yard/street, boardwalk, diner, classroom, hero home dining, hero house (porch/yard)
- palette: cityDay v2 + outline classic (look B)
- COLOUR SCRIPT: (not in the PICTURE_LOCK)

## BEATS
Mechanical: one row per PICTURE_LOCK row. size/move/tpl from the lock Camera (lock2brief.py CAMERA); mood from the lock Notes by keyword (the lock has no mood column); verbs/faces/effects are not lock columns (`-` / `none`); notes = tpl, loc, sync word time, MUST SEE and the lock's notes verbatim.

| # | cue start–end (s) | VO words | mood | size | move | subject | action verb | expression + word it lands on | effect | notes |
|---|---|---|---|---|---|---|---|---|---|---|
""" + '\n'.join(out) + """

## AUDIO (owner, spec audio.gaps, scripts/v2/memegap.py, pad 0.15)
- G1 after "Heights" (nth 1) → assets/sfx/memes/g1_scream.wav
- G2 after "cheeseburger" (nth 1, the Kevin line) → assets/sfx/memes/g2_canihave.wav
- G3 after "fear" (nth 8: "He took one shaky bite of his fear.") → assets/sfx/memes/g3_mmm.wav
- No other gaps, no stingers.

## CLOCK (owner, spec clock)
- DONG + shockwave on row 1 "town"; POP-spawns on rows 2, 3, 6, 8, 10, 19, 53; bellCrack from row 32 "cracked" to the end.

## PAYOFF SHOT
- shows: row 51 — a tiny shadow puff in Lulu's palm, blinking cutely; daylight floods the plaza
- light: brightest, held frame

## CHECKS
- [ ] hero on screen ≤ 10 s (row 10; owner: hero walks through the background of row 9 into row 10)
- [ ] pattern break ≤ 12 s (row 12)
- [ ] loved one named and on screen by 0:40 (row 24)
- [ ] clue shown twice (rows 23, 30; second wider)
- [ ] final shot not wide (row 55 CU)
- [ ] last line ≠ first line
"""
    open(OUT, 'w').write(md)
    os.makedirs(os.path.dirname(REP), exist_ok=True)
    json.dump({'rows': [{k: r[k] for k in ('n', 'start', 'end', 'line', 'see', 'sync', 'syncT', 'cam', 'loc', 'notes', 'w0', 'w1')} for r in rows], 'unmapped': unmapped}, open(REP, 'w'), indent=1, ensure_ascii=False)
    print(json.dumps({'rows': len(rows), 'unmapped': len(unmapped)}))


if __name__ == '__main__':
    main()
