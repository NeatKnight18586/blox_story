// P4: scripts/v2/brief2spec.js on the _fixture6 Brief: columns → spec fields, word-anchored times, clear errors that name the row, missing library items listed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBrief, briefToSpec} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';
import {checkMoods} from '../../engine/plancheck6.js';
import {layoutShots} from '../../engine/timeline.js';

const md = readFileSync('stories/_fixture6/BRIEF.md', 'utf8'), cues = JSON.parse(readFileSync('stories/_fixture6/cues.json', 'utf8')), lib = loadLibrary('.');
const run = (edit = s => s) => briefToSpec(parseBrief(edit(md)), cues, lib, {slug: '_fixture6'});

test('parse: 12 rows, 11 columns, two cast lines', () => {
  const b = parseBrief(md); assert.equal(b.rows.length, 12); assert.equal(b.rows[2].vo, 'Then I *dropped* her cake'); assert.equal(b.rows[2].move, 'crashZoom'); assert.deepEqual(b.cast.map(c => c.slot), ['HERO', 'SECOND']); assert.equal(b.world.locations, 'street');
});
test('spec: format 6, moods, body v6, faceStyle v6, acting 6; every column lands in a field', () => {
  const {spec, errors, missing} = run(); assert.deepEqual(errors, []); assert.deepEqual(missing, {locations: [], props: []});
  assert.deepEqual([spec.format, spec.moods, spec.body, spec.faceStyle, spec.acting, spec.hero], [6, true, 'v6', 'v6', 6, 'hero']); assert.equal(spec.end, +(cues.duration + .85).toFixed(3)); assert.equal(spec.world, 'engine/fixtures/v4look/world.js');
  const s = spec.shots, w = Object.fromEntries(cues.lines.flatMap(l => l.words).map(x => [x.w, x.start]));
  assert.equal(s.length, 12); assert.deepEqual(s[2].cue, [3.7, 5.3]); assert.equal(s[2].mood, 'comedy'); assert.equal(s[2].size, 'medium'); assert.equal(s[2].move, 'crashZoom'); assert.equal(s[2].subject, 'hero'); assert.equal(s[2].gag, 1);
  assert.equal(s[0].loopOpen, 'lie'); assert.equal(s[10].loopClose, 'lie'); assert.ok(s[7].twist); assert.equal(s[4].size, 'close'); assert.ok(s[4].ecu); assert.equal(s[4].impact, +(w.everything - s[4].at).toFixed(3));   // impact lands on the emphasised word
  assert.deepEqual(s[1].pair, ['hero', 'friend']); assert.equal(s[1].actions[0].actor, 'friend'); assert.equal(s[0].openHit, true);
  assert.deepEqual(s[2].actions[0].at, {word: 'dropped', nth: 1, line: 3}); assert.equal(s[2].actions[1].face, 'shock');   // verb on the emphasised word, face on its word
  assert.deepEqual(spec.emphasis6.map(e => e.word), ['dropped', 'smashed', 'everything', 'thanked', 'gathered', 'hugged']); assert.equal(spec.emphasis6[0].t, w.dropped);
  for (const x of s) assert.ok(cues.lines.some(l => l.words.some(y => Math.abs(y.start - x.at) < 1e-6)) || x.at === 0, `${x.id} cut on a word onset`);
});
test('the fixture fires exactly checks b, c and d once (a, e, f, g pass; h warns)', () => {
  const {spec} = run(), shots = layoutShots(spec), r = checkMoods({shots, cues, spec, fps: spec.fps});
  assert.deepEqual(Object.fromEntries(Object.entries(r.checks).map(([k, c]) => [k, c.level])), {a: 'PASS', b: 'FAIL', c: 'FAIL', d: 'FAIL', e: 'PASS', f: 'PASS', g: 'PASS', h: 'WARN', m: 'WARN', t: 'PASS'});
  assert.deepEqual(['b', 'c', 'd'].map(k => r.checks[k].items.length), [1, 1, 1]);
});
test('errors name the row and the value', () => {
  const bad = (edit, re) => { const {errors} = run(edit); assert.ok(errors.some(e => re.test(e)), errors.join(' | ')); };
  bad(s => s.replace('| fun | medium | track | hero | look_around', '| silly | medium | track | hero | look_around'), /row 1 \(mood\): unknown mood "silly"/);
  bad(s => s.replace('| comedy | close | snap |', '| comedy | tiny | snap |'), /row 4 \(size\): unknown size "tiny"/);
  bad(s => s.replace('| close | push | hero | look_around', '| close | glide | hero | look_around'), /row 9 \(move\): unknown move "glide"/);
  bad(s => s.replace('| hero | flinch | shock @ cake', '| ghost | flinch | shock @ cake'), /row 3 \(subject\): unknown subject "ghost"/);
  bad(s => s.replace('| flinch | shock @ cake', '| backflip | shock @ cake'), /row 3 \(action verb\): unknown action verb "backflip"/);
  bad(s => s.replace('shock @ cake', 'bewildered @ cake'), /row 3 \(expression\): unknown expression "bewildered"/);
  bad(s => s.replace('shock @ cake', 'shock @ banana'), /row 3 \(expression\): word "banana" is not spoken/);
  bad(s => s.replace('| 3.7–5.3 |', '| 3.9–x |'), /row 3 \(cue\)/);
  bad(s => s.replace('| comedy | medium | crashZoom | hero | flinch | shock @ cake | crash |', '| comedy | medium | push | hero | flinch | shock @ cake | crash |'), /row 3 \(effect\): crash needs move crashZoom/);
  bad(s => s.replace('gag 1', 'gag 7'), /row 3 \(notes\): gag 7/); bad(s => s.replace('loopOpen: lie', 'loopOpen'), /row 1 \(notes\)/);
  bad(s => s.replace('| 19.8–21.8 |', '| 19.2–21.8 |'), /row 11 \(cue\): start 19.2 s is/);   // > 0.5 s from any word onset
  bad(s => s.replace('friend → SECOND', 'friend → MIDDLE'), /CAST friend: unknown troupe slot "MIDDLE"/);
});
test('missing locations and props are listed, not invented', () => {
  const {missing} = run(s => s.replace('- locations: street', '- locations: street, moonbase').replace('- props: crate', '- props: crate, laserHat')); assert.deepEqual(missing, {locations: ['moonbase'], props: ['laserHat']});
  assert.ok(run(s => s.replace('- locations: street', '- locations: moonbase')).errors.some(e => /^WORLD: no world module/.test(e)));
  assert.deepEqual(run(s => s.replace('loopOpen: lie', 'loc: nowhere')).missing.locations, ['nowhere']);
});

test('_fixture6_pass: checks a–g PASS, zero FAIL (h may WARN under 30 s)', () => {
  const md2 = readFileSync('stories/_fixture6_pass/BRIEF.md', 'utf8'), c2 = JSON.parse(readFileSync('stories/_fixture6_pass/cues.json', 'utf8'));
  const {spec, errors} = briefToSpec(parseBrief(md2), c2, lib, {slug: '_fixture6_pass'}); assert.deepEqual(errors, []);
  const r = checkMoods({shots: layoutShots(spec), cues: c2, spec, fps: spec.fps}), lv = Object.fromEntries(Object.entries(r.checks).map(([k, c]) => [k, c.level]));
  for (const k of 'abcdefg') assert.equal(lv[k], 'PASS', k); assert.ok(['PASS', 'WARN'].includes(lv.h)); assert.equal(r.errors.length, 0);
});

// P5: the proof reel's blocking + effect combos (stories/proof6)
test('proof6: place / cycle marks, verb list, effect combo, prop insert, per-shot look', () => {
  const md6 = readFileSync('stories/proof6/BRIEF.md', 'utf8'), cues6 = JSON.parse(readFileSync('stories/proof6/cues.json', 'utf8'));
  const {spec, errors, missing} = briefToSpec(parseBrief(md6), cues6, lib, {slug: 'proof6'}); assert.deepEqual(errors, []); assert.deepEqual(missing, {locations: [], props: []});
  const s = spec.shots, h = spec.cast.hero;
  assert.deepEqual(h.marks[0], [0, {at: 'street', offset: [0, 0, -8], yaw: 0}]);   // place: hero 0 -8 yaw 0
  const walk = h.marks.find(m => m[1].travel); assert.deepEqual(walk[1].travel.dir, [0, 1]); assert.equal(walk[1].travel.speed, 1.7);
  const cyc = s[0].actions.find(a => a.cycle); assert.equal(cyc.cycle, 'walk'); assert.ok(cyc.until < s[0].at + 1.7 && cyc.until > 0.3);   // walks until just before the first verb
  assert.equal(s[2].impact, 0.9); assert.deepEqual(s[2].freeze, [0.9, 4]); assert.equal(s[2].zoomAt, 0.73);   // crash+freeze: zoom lands on the impact word
  assert.deepEqual(s[10].actions.filter(a => a.verb).map(a => a.verb), ['jump', 'land']);   // `a; b`: the i-th verb on the i-th marked word
  assert.equal(s[6].actions.find(a => a.verb).target, 'little');   // partner verb takes the other subject as target
  assert.equal(s[5].prop, 'prop_streetLamp'); assert.deepEqual(spec.props[0].visible, [[0, false], [7.6, true], [9.05, false]]);
  assert.deepEqual(s.map(x => x.look ?? 'day').slice(4, 7), ['storm', 'storm', 'goldenHour']);
});
