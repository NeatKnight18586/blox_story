// P2 / P2b Faces v6 — distinct-colour restraint, alias map, talk families, mouth turn, life (pure logic).
import test from 'node:test';
import assert from 'node:assert/strict';
import {FACE_NAMES6, FACES6, ALIAS6, PALETTE6, MAX_COLOURS, fillColours6, name6, family6, talkSetFor6, isHeld6, blinkAt6, popAt6, TALK6, TALK_NAMES6, faceItems6, mouthTurn} from '../../avatar-style/faces6.js';
import {HERO_PRESETS5} from '../../avatar-style/faces5.js';
import {talkSet6, talkFamily6, FAMILY6} from '../../engine/lipflap.js';

test('24 expressions: at most 3 DISTINCT fill colours (white counts once) per face, per talk shape and while blinking; palette only', () => {
  assert.equal(FACE_NAMES6.length, 24);
  const ok = new Set(Object.values(PALETTE6).map(c => c.toUpperCase()));
  for (const n of FACE_NAMES6) for (const o of [{}, {blink: true}, {talk: 0}, {talk: 1}, {talk: 2}, {talk: 3}]) {
    const c = fillColours6(n, o); assert.ok(c.length <= MAX_COLOURS, `${n} ${JSON.stringify(o)}: ${c}`);
    for (const x of c) assert.ok(ok.has(x), `${n}: ${x} off palette`);
  }
  assert.equal(PALETTE6.sparkle, PALETTE6.teeth);   // white sparkles (owner P2b): the same white as teeth, glints and eye whites
});

test('glints stay on in every talk shape (white is already counted)', () => {
  for (const n of ['smile', 'grin', 'determined', 'sad_soft', 'neutral', 'wink']) for (const t of [0, 1, 2, 3]) assert.ok(faceItems6(n, {talk: t}).some(i => i.role === 'glint'), `${n} talk ${t}`);
});

test('every faces5 hero_* name maps to a v6 face; unknown faces5 names still draw (faces5 linework)', () => {
  for (const h of HERO_PRESETS5) assert.ok(FACES6[name6(h)], h);
  for (const [k, v] of Object.entries(ALIAS6)) assert.ok(FACES6[v], `${k} → ${v}`);
  assert.ok(faceItems6('love').length > 0);
});

test('talk families: each expression is in exactly one family; four sets × 4 shapes; every v6 face talks', () => {
  for (const n of FACE_NAMES6) { const hits = Object.keys(FAMILY6).filter(k => FAMILY6[k].includes(n)); assert.equal(hits.length, 1, `${n}: ${hits}`); assert.equal(talkFamily6(n), hits[0]); assert.equal(family6(n), hits[0]); assert.ok(!isHeld6(n)); }
  assert.deepEqual(new Set(Object.values(FAMILY6).flat()), new Set(FACE_NAMES6));
  assert.deepEqual(TALK_NAMES6.sort(), ['angry', 'happy', 'neutral', 'sad']); for (const k of TALK_NAMES6) assert.equal(TALK6[k].length, 4);
  assert.equal(talkSet6('happy'), 'happy'); assert.equal(talkSetFor6('hero_grin'), 'happy'); assert.equal(talkSetFor6('determined'), 'angry'); assert.equal(talkSetFor6('cry'), 'sad'); assert.equal(talkSetFor6('scheme'), 'neutral');
  for (const [k, want] of Object.entries({smile: 'happy', grin: 'happy', laugh: 'happy', wink: 'happy', warm: 'happy', relief: 'happy', nervous_laugh: 'happy', embarrassed: 'happy', neutral: 'neutral', thinking: 'neutral', smirk: 'neutral', scheme: 'neutral', sleepy: 'neutral',
    sad_soft: 'sad', cry: 'sad', gasp: 'sad', panic: 'sad', terrified: 'sad', shock: 'sad', determined: 'angry', rage: 'angry', yell: 'angry', disgust: 'angry'})) assert.equal(talkFamily6(k), want, k);
});

test('mouth corners: happy upturned, neutral level, sad downturned, angry level or down — no other family turns up', () => {
  for (const [fam, set] of Object.entries(TALK6)) set.forEach((sh, i) => { const turn = mouthTurn(sh.mouth);
    if (fam === 'happy') { assert.ok(turn > 0.01 || i === 0 && turn > 0, `happy ${i}: ${turn}`); }
    else if (fam === 'neutral') assert.ok(Math.abs(turn) < 0.01, `neutral ${i}: ${turn}`);
    else if (fam === 'sad') assert.ok(turn < -0.01, `sad ${i}: ${turn}`);
    else assert.ok(turn <= 0.01, `angry ${i}: ${turn}`); });
  assert.ok(TALK6.sad.slice(1).every(sh => mouthTurn(sh.mouth) < 0));
  // teeth: top teeth from `open` (shape 2) in neutral / sad; both rows in angry small and open; tongue only in wide
  const has = (fam, i, role) => TALK6[fam][i].fills.some(([r]) => r === role);
  for (const fam of ['neutral', 'sad', 'happy']) { assert.ok(!has(fam, 1, 'teeth') || fam === 'happy'); assert.ok(has(fam, 2, 'teeth')); assert.ok(has(fam, 3, 'tongue') && !has(fam, 2, 'tongue')); }
  assert.ok(TALK6.angry[1].fills.some(([r, o]) => r === 'teeth' && o?.both) && TALK6.angry[2].fills.some(([r, o]) => r === 'teeth' && o?.both) && has('angry', 3, 'tongue'));
});

test('redrawn faces: cry (wobbly downturned mouth, two tear streams), rage (4 anger arcs, thick teeth), awe (2 glints per eye, 3 sparkles)', () => {
  const cry = faceItems6('cry'); assert.ok(mouthTurn(FACES6.cry.mouth[0]) < -0.01);
  assert.equal(cry.filter(i => i.role === 'water' && i.pts).length >= 4, true);   // 2 ribbons + 2 drops (+ highlights)
  const rage = faceItems6('rage'), arcs = rage.filter(i => i.role === 'anger'); assert.equal(arcs.length, 4); assert.ok(arcs.every(a => a.color === PALETTE6.anger && a.outline > 0));
  const awe = faceItems6('awe'); assert.equal(awe.filter(i => i.role === 'glint').length, 4); assert.equal(awe.filter(i => i.role === 'sparkle' && i.pts).length, 3);
  assert.ok(awe.filter(i => i.role === 'sparkle' && i.pts).every(i => i.fill === '#FFFFFF'));
});

test('life: blinks every 3–5 s for 2 frames, a 1-frame blink and an 8 % squash on a change, settled after 4 frames', () => {
  const fps = 24, closed = []; for (let f = 0; f < 30 * fps; f++) if (blinkAt6(7, f / fps, {fps})) closed.push(f);
  const starts = closed.filter((f, i) => i === 0 || closed[i - 1] !== f - 1), runs = starts.map(s => closed.filter(f => f >= s && f < s + 5).length);
  assert.ok(runs.every(r => r === 2)); for (let i = 1; i < starts.length; i++) { const g = (starts[i] - starts[i - 1]) / fps; assert.ok(g >= 3 - 1 / fps && g <= 5 + 1 / fps, `gap ${g}`); }
  assert.ok(blinkAt6(7, 10.5, {fps, changes: [10.5]}));
  assert.deepEqual(popAt6(10.5, [10.5], {fps}).map(v => +v.toFixed(3)), [1.04, .92, 1.04]);
  assert.deepEqual(popAt6(10.5 + 5 / fps, [10.5], {fps}), [1, 1, 1]); assert.deepEqual(popAt6(3, [], {fps}), [1, 1, 1]);
  assert.deepEqual([blinkAt6(3, 12.3, {fps}), popAt6(11, [10.9])], [blinkAt6(3, 12.3, {fps}), popAt6(11, [10.9])]);
});
