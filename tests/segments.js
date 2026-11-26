// tests/segments.js — tuft 4A pure logic: segmentSpec (per-location page spec), SPEC FLAGS parsing, freeze-check base file.
import assert from 'node:assert/strict';
import {segmentSpec} from '../scripts/v2/segments.js';
import {parseBrief} from '../scripts/v2/brief2spec.js';
const spec = {fps: 30, location: 'a', look4: 'comedy', locations: ['a', 'b'], locationLook4: {a: 'comedy', b: 'moonlit'}, props2b: [{kind: 'spider', loc: 'a'}, {kind: 'toaster', loc: 'b'}],
  story6: {hand: [{t: .5, anchor: 'x'}, {t: 3, anchor: 'x'}], crowd: {startAt: 'x', steps: [{t: .5, anchor: 'x'}, {t: 3, anchor: 'y'}]}},
  shots: [{id: 'A', at: 0, loc: 'a', beasts: [{actor: 't', state: 'run', to: 'x'}]}, {id: 'B', at: 2, loc: 'b', beasts: [{actor: 't', state: 'run', to: 'y'}]}], end: 4};
const a = segmentSpec(spec, 'a', {anchors: {x: {}}}), b = segmentSpec(spec, 'b', {anchors: {y: {}}, skyDist: 700, puffBall: {key: 1}});
assert.equal(a.location, 'a'); assert.equal(b.look4, 'moonlit'); assert.equal(b.skyDist, 700); assert.deepEqual(b.puffBall, {key: 1}); assert.ok(!a.locations && !a.locationLook4);
assert.deepEqual(a.props2b.map(p => p.kind), ['spider']); assert.deepEqual(b.props2b.map(p => p.kind), ['toaster']);
assert.equal(a.shots[0].beasts[0].to, 'x'); assert.equal(a.shots[1].beasts[0].to, undefined);   // another location's anchor is dropped
assert.deepEqual(a.story6.hand.map(h => h.t), [.5]); assert.equal(b.story6.hand.length, 0); assert.deepEqual(b.story6.crowd.steps.map(q => q.anchor), ['y']); assert.equal(b.story6.crowd.startAt, null);
const br = parseBrief("# T\nSPEC FLAGS (all opt-in): `format: 6`, `rig: 'r6'`, `twos: true`, `bogus: 1`, night look `moonlit`.\n\n## META\n- slug: t\n");
assert.deepEqual(br.flags, {format: 6, rig: 'r6', twos: true, nightLook: 'moonlit'}); assert.equal(br.flagErrors.length, 1);
console.log('PASS segments: per-location spec (look4, props, anchors, markers), SPEC FLAGS parse + unknown flag error');
