import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRules, checkCampaign, tapOffset, tapStartFor, isCampaign, TAP} from '../../engine/tapcap.js';

const rules = parseRules(readFileSync('campaigns/tapcap/RULES.md', 'utf8'));
test('RULES.md parses: 7 hard rules, TC-01…TC-07 with params', () => {
  assert.equal(rules.hard.length, 7);
  assert.deepEqual(Object.keys(rules.qa), ['TC-01', 'TC-02', 'TC-03', 'TC-04', 'TC-05', 'TC-06', 'TC-07']);
  assert.equal(rules.qa['TC-01'].params.cover, .15); assert.equal(rules.qa['TC-03'].params.signs.length, 4);
});
test('campaign path detection', () => { assert.ok(isCampaign('campaigns/tapcap/ep01-rarity/build/episode.json')); assert.ok(!isCampaign('stories/x/episode.json')); });
test('tap: 3 down, 2 hold, 4 up with overshoot, back to rest', () => {
  assert.equal(TAP.depth, .03); assert.equal(tapOffset(0), 0); assert.equal(tapOffset(3), -TAP.depth); assert.equal(tapOffset(5), -TAP.depth); assert.equal(tapOffset(9), 0);
  assert.ok(tapOffset(1) < 0 && tapOffset(1) > -TAP.depth);
  const peak = Math.max(...[6, 7, 8, 8.5].map(f => tapOffset(f)));
  assert.ok(peak > 0 && peak < TAP.depth * .25, `overshoot ${peak}`);
  assert.equal(tapStartFor(36.15, 24) + TAP.clickFrame, Math.round(36.15 * 24));
});
test('TC-05 / TC-06 / TC-07 checks', () => {
  const fps = 24, cues = {words: [{word: 'Click.', start: 36.15, end: 36.45}, {word: 'one.', start: 74.9, end: 75.16}]};
  const cam = {pos: [0, 1, 2], look: [0, 0, 0], fov: 30};
  const camEnd = {pos: [0, 1, 1.5], look: [0, 0, 0], fov: 30};
  const shots = [{id: 'S1', start: 0, frames: 1800, move: 'push', cam: {first: cam, last: camEnd}, taps: [{start: tapStartFor(36.15, fps)}]},
    {id: 'S40', start: 1800, frames: 4, move: 'push', cam: {first: {...cam}, last: {...camEnd}}}];
  const ok = checkCampaign({rules, shots, cues, fps, end: 75.16, measured: {frame1Cover: .3, textFound: ['TRADES'], proportions: {pass: true}}});
  assert.deepEqual(ok.errors.filter(e => !e.startsWith('TC-07: average')), []);
  shots[0].taps[0].start += 2; shots[1].cam.last = {...camEnd, pos: [0, 1, 1.5000001]};   // any non-zero diff fails
  const bad = checkCampaign({rules, shots, cues, fps, end: 75.6, measured: {frame1Cover: .1, textFound: ['SALE']}});
  for (const id of ['TC-01', 'TC-02', 'TC-03', 'TC-05', 'TC-06', 'TC-07']) assert.ok(bad.errors.some(e => e.startsWith(id)), id);
  assert.equal(bad.manual.length, 1);
});
import {measure, judge} from '../../campaigns/tapcap/assets/slimeguy/measure.js';
import {BANDS} from '../../campaigns/tapcap/assets/slimeguy/presets.js';
test('slime guy proportion measure: synthetic front silhouette at spec bands passes, shifted bands fail', () => {
  const W = 300, H = 400, px = 380, top = 10;   // 380 px per H
  const mk = (bands) => { const g = Array.from({length: H}, () => Array(W).fill(null)); let y = top;
    for (const [part, f, wid] of bands) { const n = Math.round(f * px); for (let k = 0; k < n; k++, y++) for (let x = Math.round(W / 2 - wid * px / 2); x < Math.round(W / 2 + wid * px / 2); x++) g[y][x] = part; }
    const hy = top + Math.round(BANDS.head * px * .44), eh = Math.round(.22 * BANDS.head * px), ew = Math.round(eh / 3);   // eyes above head mid, .5 head width apart
    for (const cx of [W / 2 - .225 * px / 2, W / 2 + .225 * px / 2]) for (let yy = hy - eh / 2; yy < hy + eh / 2; yy++) for (let x = cx - ew / 2; x < cx + ew / 2; x++) g[Math.round(yy)][Math.round(x)] = 'eye';
    const nh = Math.round(.12 * BANDS.base * px), nw = Math.round(.3 * .4 * px); for (let yy = y - nh; yy < y; yy++) for (let x = W / 2 - nw / 2; x < W / 2 + nw / 2; x++) g[yy][Math.round(x)] = null;
    return g; };
  const good = judge(measure(mk([['head', BANDS.head, .45], ['torso', BANDS.torso, .48], ['switch', BANDS.switch, .24], ['base', BANDS.base, .40]]), px));
  assert.ok(good.checks.bands.head.pass && good.checks.bands.switch.pass && good.checks.bands.base.pass, JSON.stringify(good.failures));
  assert.ok(good.checks.eye.hOfHead.pass && good.checks.notch.wOfBase.pass && good.checks.notch.hOfBase.pass, JSON.stringify(good.failures));
  const bad = judge(measure(mk([['head', .40, .45], ['torso', .22, .48], ['switch', .04, .24], ['base', .33, .40]]), px));
  assert.ok(!bad.pass && !bad.checks.bands.head.pass);
});
