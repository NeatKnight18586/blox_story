// FORMAT 7 (Phase 0B): end = voice + 0.5, hero by 10 s, 1.0 / 1.5 s dead-stretch window, voiceGap, brief flags; format 6 unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {endFor, DEFAULT_FORMAT, TAIL7, MAX_END7, layoutShots} from '../../engine/timeline.js';
import * as PC from '../../engine/plancheck.js';
import {checkMoods, windowFor, voiceGaps} from '../../engine/plancheck6.js';
import {parseBrief, briefToSpec} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';

const cues = dur => ({duration: dur, lines: [{words: [{w: 'a', start: 0, end: .5}, {w: 'b', start: 4, end: 4.9}, {w: 'b1', start: 8, end: 9}, {w: 'b1a', start: 10, end: 10.9}, {w: 'b1b', start: 11, end: 12}, {w: 'b2', start: 12.5, end: 30}, {w: 'b3', start: 40, end: 50}, {w: 'c', start: 60, end: dur}]}]});
const shot = (id, at, o = {}) => ({id, at, size: 'medium', see: ['x'], why: 'y', move: 'push', ...o});
const plan = (shots, dur, o = {}) => PC.checkPlan({shots: layoutShots({fps: 24, end: endFor(dur, 7), shots}), cues: cues(dur), fps: 24, format: 7, hero: 'HERO', ...o}).errors;
const ok = [shot('a', 0, {size: 'wide'}), shot('b', 4, {see: ['HERO']}), shot('c', 60, {size: 'close', see: ['HERO']})];

test('endFor(…, 7) = voice + 0.5 s; max end short 77 s, long 112 s; default format stays 6', () => {
  assert.equal(DEFAULT_FORMAT, 6); assert.equal(TAIL7, .5); assert.deepEqual(MAX_END7, {short: 77, long: 112});
  assert.equal(endFor(70, 7), 70.5); assert.equal(endFor(100, 7), 100.5); assert.equal(endFor(100, 6), 100.85); assert.equal(endFor(100, undefined), 122.5);
  assert.deepEqual(PC.lengthRule(7, 'short'), {voice: [0, 76.5], end: [0, 77], tail: .5});
  assert.deepEqual(PC.lengthRule(7, 'long'), {voice: [0, 111.5], end: [0, 112], tail: .5});
  assert.deepEqual(PC.lengthRule(6).end, [0, 125]);
});

test('format 7 length: ends voice + 0.5 (±1.5 frames), within the variant max', () => {
  assert.deepEqual(plan(ok, 76.5), []);
  assert.ok(plan(ok, 77.5).some(e => /77 s hard max \(format 7\)/.test(e)), 'short max 77');
  assert.deepEqual(plan(ok, 100, {lengthVariant: 'long'}), []);
  assert.ok(plan(ok, 112, {lengthVariant: 'long'}).some(e => /112 s hard max/.test(e)), 'long max 112');
  const held = PC.checkPlan({shots: layoutShots({fps: 24, end: 70.85, shots: ok}), cues: cues(70), fps: 24, format: 7, hero: 'HERO'}).errors;
  assert.ok(held.some(e => /want voice \+ 0.5 = 70.50 s \(format 7\)/.test(e)), 'a format-6 tail (0.85) fails in format 7');
});

test('format 7 hero by 10.0 s (format 6: 5.0 s)', () => {
  const at8 = [shot('a', 0, {size: 'wide'}), shot('b', 8, {see: ['HERO']}), shot('c', 60, {size: 'close'})];
  assert.deepEqual(plan(at8, 70), []);
  const f6 = PC.checkPlan({shots: layoutShots({fps: 24, end: endFor(70, 6), shots: at8}), cues: cues(70), fps: 24, format: 6, hero: 'HERO'}).errors;
  assert.ok(f6.some(e => /format 6: hero HERO first on screen at 8.00 s/.test(e)), 'the same plan fails format 6');
  const at11 = [shot('a', 0, {size: 'wide'}), shot('b', 11, {see: ['HERO']}), shot('c', 60, {size: 'close'})];
  assert.ok(plan(at11, 70).some(e => /format 7: hero HERO first on screen at 11.00 s in b \(≤ 10 s\)/.test(e)));
  assert.deepEqual(plan([shot('a', 0, {size: 'wide'}), shot('b', 10, {see: ['HERO']}), shot('c', 60, {size: 'close'})], 70), []);
});

test('format 7 final shot: not a wide, not a pull', () => {
  assert.ok(plan([...ok.slice(0, 2), shot('c', 60, {size: 'wide', see: ['HERO']})], 70).some(e => /format 7: final shot c is a wide/.test(e)));
  assert.ok(plan([...ok.slice(0, 2), shot('c', 60, {size: 'close', move: 'pull'})], 70).some(e => /final shot c pulls back/.test(e)));
});

// dead-stretch window: 1.0 s before 12.0 s, 1.5 s after, 3.0 s in emotion / awe shots
const mk = (mood, at, frames) => ({id: `S${at}`, start: at * 30, frames, mood, size: 'medium', move: 'static'});
const fill = to => Array.from({length: Math.floor(to / .9)}, (_, i) => ({at: +(i * .9 + .45).toFixed(2)}));   // an effect every 0.9 s up to `to`: no dead stretch before it
const dead = (shots, format, to = 0) => checkMoods({shots, cues: {duration: 30, lines: []}, spec: {format, effects: fill(to)}, fps: 30}).checks.b.items;
test('format 7 dead-stretch window switches 1.0 s → 1.5 s at 12.0 s; emotion keeps 3.0 s; format 6 stays 1.5 s', () => {
  assert.equal(windowFor(0, 7), 1); assert.equal(windowFor(11.99, 7), 1); assert.equal(windowFor(12, 7), 1.5); assert.equal(windowFor(5, 6), 1.5); assert.equal(windowFor(5, undefined), 1.5);
  const early = [mk('fun', 0, 36), mk('fun', 1.2, 36)], late = [mk('fun', 12, 42), mk('fun', 13.4, 30)];
  assert.ok(dead([mk('fun', 0, 40), mk('fun', 1.33, 40)], 7).length >= 1, '1.33 s gap before 12 s fails in format 7');
  assert.deepEqual(dead([mk('fun', 0, 40), mk('fun', 1.33, 40)], 6), [], '…and is fine in format 6 (1.5 s)');
  assert.deepEqual(dead([mk('fun', 0, 30), mk('fun', 1, 30), mk('fun', 2, 30)], 7), [], 'exactly 1.0 s is fine');
  assert.deepEqual(dead([mk('fun', 0, 360), mk('fun', 12, 42), mk('fun', 13.4, 40)], 7, 12), [], '1.4 s after 12 s is fine');
  assert.equal(dead([mk('fun', 0, 360), mk('fun', 12, 50), mk('fun', 13.7, 40)], 7, 12).length, 1, '1.67 s after 12 s fails');
  assert.deepEqual(dead([mk('emotion', 0, 80), mk('fun', 2.67, 40)], 7), [], 'emotion shots keep 3.0 s');
  void early; void late;
});

test('format 7 voiceGap: gaps between cue words > 0.4 s WARN with the time (format 6: no such check)', () => {
  const c = {duration: 10, lines: [{line: 1, words: [{w: 'a', start: 0, end: 1}, {w: 'b', start: 1.39, end: 2}]}, {line: 2, words: [{w: 'c', start: 2.6, end: 3}, {w: 'd', start: 3.9, end: 4}]}]};
  const g = voiceGaps(c); assert.equal(g.length, 2, '0.39 s is fine; 0.6 s and 0.9 s are not'); assert.equal(g[0].t, 2); assert.ok(Math.abs(g[0].gap - .6) < 1e-9); assert.equal(g[1].t, 3);
  const shots = [mk('fun', 0, 120)];
  const r7 = checkMoods({shots, cues: c, spec: {format: 7}, fps: 30}), r6 = checkMoods({shots, cues: c, spec: {format: 6}, fps: 30});
  assert.equal(r7.checks.v.level, 'WARN'); assert.match(r7.checks.v.items[0], /0\.60 s at 2\.00 s/); assert.ok(r7.warnings.some(w => /^v\. voiceGap: .*at 3\.00 s/.test(w)));
  assert.ok(!r7.errors.some(e => /voiceGap/.test(e))); assert.equal(r6.checks.v, undefined);
  assert.equal(checkMoods({shots, cues: {duration: 5, lines: [{words: [{w: 'a', start: 0, end: 1}, {w: 'b', start: 1.3, end: 2}]}]}, spec: {format: 7}, fps: 30}).checks.v.level, 'PASS');
});

test('brief SPEC FLAGS → spec format 7 + lengthVariant + captionStyle; no flags = format 6 as before', () => {
  const md = readFileSync('stories/_fixture7_pass/BRIEF.md', 'utf8'), cu = JSON.parse(readFileSync('stories/_fixture7_pass/cues.json', 'utf8')), lib = loadLibrary('.');
  const b = parseBrief(md); assert.deepEqual(b.flags, {format: '7', lengthVariant: 'short'});
  const {spec, errors} = briefToSpec(b, cu, lib, {slug: '_fixture7_pass'}); assert.deepEqual(errors, []);
  assert.deepEqual([spec.format, spec.lengthVariant, spec.captionStyle, spec.end], [7, 'short', 'pop-shorts-v7', +(cu.duration + .5).toFixed(3)]);
  assert.deepEqual(parseBrief(md.replace(/^- spec flags:.*$/m, '- spec flags: FORMAT=7, lengthvariant=long')).flags, {format: '7', lengthVariant: 'long'});
  const old = briefToSpec(parseBrief(md.replace(/^- spec flags:.*\n/m, '')), cu, lib, {slug: '_fixture7_pass'}).spec;
  assert.deepEqual([old.format, old.lengthVariant, old.captionStyle, old.end], [6, undefined, undefined, +(cu.duration + .85).toFixed(3)]);
  assert.ok(briefToSpec(parseBrief(md.replace('lengthVariant: short', 'lengthVariant: huge')), cu, lib, {slug: '_fixture7_pass'}).errors.some(e => /lengthVariant: huge/.test(e)));
});

test('_fixture7_pass spec: format 7, hero first at 8.4 s (> 5 s: format 6 would fail, ≤ 10 s: format 7 passes)', () => {
  const spec = JSON.parse(readFileSync('stories/_fixture7_pass/episode.json', 'utf8')), shots = layoutShots(spec);
  assert.equal(spec.format, 7); const h = PC.heroFirst(shots, 'hero', spec.fps); assert.ok(h.t > 5 && h.t <= 10, `hero at ${h.t}`);
  assert.deepEqual(PC.heroIssues(shots, 'hero', spec.fps, 7), []); assert.equal(PC.heroIssues(shots, 'hero', spec.fps, 6).length, 1);
});
