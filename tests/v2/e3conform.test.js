// E3 conform pass (opt-in pieces): camera punch-in (engine/camera.js PUNCH), brief `punch @ word` / `punch: s`, `verb @ word`,
// a tag shows only inside its own shot (`until`), `hold:` reaches every fall verb in the row.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sampleCamera, punchScale, PUNCH} from '../../engine/camera.js';
import {parseBrief, briefToSpec} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';

const lib = loadLibrary('.'), J = p => JSON.parse(readFileSync(p, 'utf8'));
const md = readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8'), cues = J('stories/_fixture_e2/cues.json');
const run = edit => briefToSpec(parseBrief(edit(md)), cues, lib, {slug: '_fixture_e2'});
const shot = {move: 'push', duration: 2, from: {position: [0, 2, 10], target: [0, 2, 0], fov: 40}, to: {position: [0, 2, 9], target: [0, 2, 0], fov: 40}};

test('punch: lens narrows 8 % over 6 frames and holds; no punch = identical camera', () => {
  assert.equal(punchScale([1], .5), 1); assert.ok(Math.abs(punchScale([1], 1 + 6 / 30) - (1 - PUNCH.k)) < 1e-9); assert.ok(Math.abs(punchScale([1], 1.9) - .92) < 1e-9);
  const a = sampleCamera(shot, 1.5), b = sampleCamera({...shot, punch: [1]}, 1.5);
  assert.deepEqual(sampleCamera({...shot, punch: []}, 1.5), a); assert.ok(Math.abs(b.fov - a.fov * .92) < 1e-9); assert.deepEqual(b.position, a.position);
});
test('brief: punch @ word / punch: s land in shot.punch (s after the cut); verb @ word keys that word', () => {
  const R5 = '| 5 | 5.2–6.1 | Right into the pool | comedy | medium | static-drift | hero | - |';
  const {spec, errors} = run(s => s.replace(R5, R5.replace('| hero | - |', '| hero | flinch @ pool |')).replace('splash: big @ into;', 'splash: big @ into; punch @ pool; punch: .3;'));
  assert.deepEqual(errors, []); const s5 = spec.shots[4], w = cues.lines.flatMap(l => l.words).find(x => x.w.toLowerCase().startsWith('pool'));
  assert.deepEqual(s5.punch, [+(w.start - s5.at).toFixed(3), .3]); assert.equal(s5.actions[0].verb, 'flinch'); assert.equal(s5.actions[0].at.word, 'pool');
});
test('tag: shows only inside its own shot (until = the row end)', () => {
  const {spec} = run(s => s); assert.deepEqual(spec.story6.tags.map(t => t.until), [3.7]);
});
test('hold: reaches every fall verb in the row (both actors flop and stay down)', () => {
  const R16 = '| 16 | 20.8–21.8 | The dummies flopped down | comedy | wide | static-drift | hero | - |';
  const {spec, errors} = run(s => s.replace(R16, R16.replace('| hero | - |', '| hero+bitsy | hero:knees_collapse; bitsy:knees_collapse |')).replace('crowd: dummies 40 flop @ flopped;', 'crowd: dummies 40 flop @ flopped; hold: .6;'));
  assert.deepEqual(errors, []); assert.deepEqual(spec.shots[15].actions.filter(a => a.verb).map(a => a.hold), [.6, .6]);
});
