import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {shots as mk, sampleCam, camTravel, FPS, END} from '../../campaigns/tapcap/previz/blocking.js';
import {TAP} from '../../engine/tapcap.js';

const CUES = 'stories/tapcap-ep01-rarity/build/cues.json';   // aligner output (build/ is not committed): synthetic cues when absent
const cues = existsSync(CUES) ? JSON.parse(readFileSync(CUES, 'utf8')) : {lines: Array.from({length: 35}, (_, i) => ({words: Array.from({length: 17}, (_, j) => ({w: i === 16 || i === 31 ? 'Click' : 'w', start: i * 2.1 + j * .11, end: i * 2.1 + j * .11 + .1}))}))};
const words = cues.lines.flatMap(l => l.words.map(w => w.start));
test('blocking: tiles 0 → 75.16 s, cuts on word starts (± 2 frames), average 1.5–2.2 s, every shot ≤ 3.5 s', () => {
  const {shots} = mk(cues); assert.equal(shots[0].start, 0); assert.equal(shots.at(-1).end, END);
  for (let i = 1; i < shots.length; i++) { assert.equal(shots[i].start, shots[i - 1].end); assert.ok(words.some(w => Math.abs(w - shots[i].start) * FPS <= 2 + 1e-9), shots[i].id); }
  const avg = END / shots.length; assert.ok(avg >= 1.5 && avg <= 2.2, `avg ${avg}`);
  if (existsSync(CUES)) for (const s of shots) assert.ok(s.frames / FPS <= 3.5, `${s.id} ${s.frames / FPS}`);
});
test('no locked-off shots; S40 replays S1 (last frames identical); clicks land on their onset frames', () => {
  const {shots, taps} = mk(cues);
  for (const s of shots) { if (s.cam.clixHead) continue; const t = camTravel(s); assert.ok(t.move >= .05 || t.turnDeg >= 1 || Math.abs(t.zoom - 1) >= .05, `${s.id} locked off`); }
  const a = sampleCam(shots.find(s => s.id === 'S1'), 1), b = sampleCam(shots.find(s => s.id === 'S40'), 1); assert.deepEqual(a, b);
  for (const t of taps) assert.equal(t.start + TAP.clickFrame, Math.round(t.onset * FPS));
  assert.deepEqual(shots.map(s => s.mood).filter((m, i, x) => m !== x[i - 1]), ['dawnHope', 'quietNight', 'dawnHope', 'rainNight', 'golden']);
});
