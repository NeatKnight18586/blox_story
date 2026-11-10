// Town kit + crowd: real Three.js modules, no browser needed.
import assert from 'node:assert/strict';
import * as T from 'three';
import * as K from '../studio/town/kit.js';
import {createExtra} from '../studio/characters/characters.js';

const tris = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
const MODULES = {shopFront: 12000, house: 12000, clockTower: 6000, street: 2000, plaza: 1000, grassField: 100, tree: 600, bush: 100, lampPost: 1500, bench: 2500, hydrant: 500, marketStall: 3000, fountain: 600, skylineBlock: 50};
for (const [name, budget] of Object.entries(MODULES)) {
  const g = K[name](); g.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(g, true), n = tris(g);
  assert.ok(n > 0 && n <= budget, `${name}: ${n} triangles (budget ${budget})`);
  assert.ok(box.min.y > -.2, `${name}: sits on the ground (min y ${box.min.y.toFixed(2)})`);
  // Facades are camera-facing shells: front at z≈0, depth behind, only trim/awnings in front.
  if (['shopFront', 'house', 'clockTower'].includes(name)) assert.ok(box.max.z < 4 && box.min.z > -10, `${name}: shallow facade z ${box.min.z.toFixed(1)}…${box.max.z.toFixed(1)}`);
}
// Crowd extras are seeded: same seed → same outfit and hair; different seeds vary.
const a = createExtra(7), b = createExtra(7), c = createExtra(8);
assert.equal(a.hair.name, b.hair.name); assert.equal(a.root.scale.x, b.root.scale.x);
const looks = new Set(Array.from({length: 20}, (_, i) => createExtra(i).hair.name));
assert.ok(looks.size >= 5, `crowd variety: ${looks.size} hair options across 20 extras`);
console.log(`PASS studio town: ${Object.keys(MODULES).length} modules within triangle budgets, grounded, shallow facades; seeded crowd (${looks.size} hair options in 20 extras)`);
