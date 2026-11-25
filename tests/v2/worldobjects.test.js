// E3: `prop:<name>` subjects that name an object the world builds (parts/library6.json testPark `worldObjects`) resolve to that
// object: no insert copy in spec.props, camera from `cam:`, an error naming the row without one; legacy toy-prop subjects unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBrief, briefToSpec} from '../../scripts/v2/brief2spec.js';
import {loadLibrary} from '../../scripts/v2/lib6.js';
import {worldObjectErrors} from '../../engine/worldobjects.js';

const lib = loadLibrary('.'), J = p => JSON.parse(readFileSync(p, 'utf8'));
const md = readFileSync('stories/_fixture_e2/BRIEF.md', 'utf8'), cues = J('stories/_fixture_e2/cues.json');
const ROW3 = '| 3 | 2.8–3.7 | Everyone knows her name | comedy | medium | static-drift | bitsy |';
const run = edit => briefToSpec(parseBrief(edit(md)), cues, lib, {slug: '_fixture_e2'});

test('library: testPark lists the objects its world builds', () => {
  assert.deepEqual(lib.locations.testPark.worldObjects, ['wallSign', 'pool', 'launchTower', 'giantFan', 'boxingRing', 'spawnPad', 'healButton', 'coasterTrack', 'coasterCart', 'giantHand']);
});
test('world-object subject resolves to the world object: no insert copy, camera from cam:', () => {
  assert.ok(md.includes(ROW3));
  const {spec, errors} = run(s => s.replace(ROW3, ROW3.replace('| bitsy |', '| prop:wallSign |')));
  assert.deepEqual(errors, []);
  const s3 = spec.shots[2];
  assert.equal(s3.prop, 'wallSign'); assert.equal(s3.subject, undefined); assert.deepEqual(s3.see, ['wallSign']);
  assert.deepEqual(spec.worldObjects, ['wallSign']);
  assert.ok(!(spec.props ?? []).some(p => p.prop === 'wallSign' || p.id === 'wallSign'), 'no duplicate insert prop');
  assert.deepEqual(s3.from.position, [3, 3, 49]); assert.deepEqual(s3.from.target, [0, 2.4, 42]);
  const giant = run(s => s.replace(ROW3, ROW3.replace('| bitsy |', '| prop:giantHand |')));
  assert.deepEqual(giant.errors, []); assert.equal(giant.spec.shots[2].prop, 'giantHand');   // the story6 hand (named giantHand by the world)
});
test('a world-object subject without cam: is an error naming the row', () => {
  const {errors} = run(s => s.replace(ROW3, ROW3.replace('| bitsy |', '| prop:pool |')).replace('cam: 3 3 49 at 0 2.4 42', 'note'));
  assert.ok(errors.some(e => /^row 3 \(notes\): prop:pool is an object the world builds .* needs a cam: note/.test(e)), errors.join(' | '));
});
test('legacy toy-prop subjects are unchanged (proof6 spec byte-identical to the committed one)', () => {
  const b = parseBrief(readFileSync('stories/proof6/BRIEF.md', 'utf8')), {spec} = briefToSpec(b, J('stories/proof6/cues.json'), lib, {slug: 'proof6'});
  assert.equal(JSON.stringify(spec, null, 1), JSON.stringify(J('stories/proof6/episode.json'), null, 1));
  assert.equal(spec.worldObjects, undefined); assert.ok(spec.props.some(p => p.prop === 'streetLamp'));
});
test('renderer guard: exactly one scene object per world object, never also a spec prop', () => {
  const counts = {wallSign: 1, pool: 2, giantHand: 1};
  assert.deepEqual(worldObjectErrors(['wallSign', 'giantHand'], n => counts[n] ?? 0, []), []);
  assert.match(worldObjectErrors(['pool'], n => counts[n] ?? 0)[0], /2 scene objects named pool/);
  assert.match(worldObjectErrors(['launchTower'], n => counts[n] ?? 0)[0], /0 scene objects named launchTower/);
  assert.match(worldObjectErrors(['wallSign'], n => counts[n] ?? 0, [{id: 'wallSign', prop: 'wallSign'}])[0], /duplicate insert/);
});
