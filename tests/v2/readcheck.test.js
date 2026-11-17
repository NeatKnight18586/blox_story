// Owner readability checks (egg preview pass 2): pure rules on measured frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import {faceShown, nothingInFront, standsOut, objectReads, moves, motionThreshold, sameScale, backIssues, insideFrac, maskLuma, eggShaded, READ} from '../../engine/readcheck.js';

const head = (o = {}) => ({box: {x0: .4, x1: .6, y0: .2, y1: .35}, front: true, angle: 20, ...o});
test('face shown: angle, inside, head top, eyes', () => {
  assert.equal(faceShown({size: 'wide', move: 'push'}, head()), null, 'wides are not checked');
  assert.ok(faceShown({size: 'medium'}, head()).ok);
  assert.match(faceShown({size: 'medium'}, head({angle: 110})).msg, /turned 110/);
  assert.ok(faceShown({size: 'medium', back: true}, head({angle: 160})).ok, 'opt-out');
  assert.match(faceShown({size: 'medium'}, head({box: {x0: .4, x1: .6, y0: -.02, y1: .13}})).msg, /head top cut/);
  assert.ok(faceShown({size: 'close'}, head({box: {x0: .3, x1: .7, y0: -.05, y1: .4}})).ok, 'a close may crop the hair');
  assert.match(faceShown({size: 'close'}, head({box: {x0: .3, x1: .7, y0: -.2, y1: .2}})).msg, /eyes/);
  assert.match(faceShown({size: 'close'}, head({box: {x0: .8, x1: 1.2, y0: .2, y1: .4}})).msg, /50 % of the head/);
  assert.match(faceShown({size: 'medium'}, null).msg, /no subject/);
});
test('nothing in front, stands out, object reads, moves', () => {
  assert.ok(nothingInFront({frontFrac: .05, faceCover: 0}).ok); assert.ok(!nothingInFront({frontFrac: .11}).ok); assert.ok(!nothingInFront({frontFrac: 0, faceCover: .1}).ok);
  assert.ok(standsOut(.5, .3).ok); assert.ok(standsOut(.1, .3).ok, 'a dark silhouette on a bright sky stands out'); assert.ok(!standsOut(.3, .25).ok); assert.ok(!standsOut(null, .2).ok);
  assert.ok(objectReads({x0: .1, x1: .9, y0: .3, y1: .6, front: true}).ok);
  assert.match(objectReads({x0: -.3, x1: .7, y0: .3, y1: .6, front: true}).msg, /70 % of the object/);
  assert.match(objectReads({x0: .1, x1: .9, y0: .3, y1: .4, front: true}).msg, /10 % of frame height/);
  assert.equal(motionThreshold([.042, .09, .1]), .021); assert.ok(moves(.03, .021).ok); assert.ok(!moves(.01, .021).ok);
  assert.ok(Math.abs(insideFrac({x0: -.5, x1: .5, y0: 0, y1: 1}) - .5) < 1e-9);
});
test('same scale, back views, egg shading, mask luma', () => {
  assert.ok(sameScale(.2, .5, .45).ok); assert.match(sameScale(.6, .5, .45).msg, /167 %|\+?167/);
  const shots = [1, 2, 3, 4].map(k => ({id: 'S' + k, back: true, why: 'back view: she walks away'})); assert.match(backIssues(shots)[0], /4 shots/);
  assert.match(backIssues([{id: 'A', back: true, why: 'x'}])[0], /without a reason/);
  assert.ok(eggShaded(.2).ok); assert.ok(!eggShaded(.05).ok);
  const w = 10, h = 10, m = new Uint8Array(100), L = new Float32Array(100).fill(.2); for (let y = 4; y < 6; y++) for (let x = 4; x < 6; x++) { m[y * w + x] = 1; L[y * w + x] = .8; }
  const r = maskLuma(m, L, w, h, 1); assert.ok(Math.abs(r.subj - .8) < 1e-6 && Math.abs(r.ring - .2) < 1e-6 && r.n === 4);
  assert.equal(READ.contrast, .12);
});
