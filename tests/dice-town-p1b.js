import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeLeoFaces} from '../production/dice-town-p1b/leo-faces.js';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {sampleAction,applyActionSample} from '../avatar/actions.js';
const prefix='production/dice-town-p1b/assets/';
const source=JSON.parse(readFileSync(prefix+'SOURCE.json'));
for(const f of source.files)assert.equal(createHash('sha256').update(readFileSync(prefix+f.file)).digest('hex'),f.sha256);
assert.match(readFileSync(prefix+'License.txt','utf8'),/Creative Commons Zero, CC0/);
const b=readFileSync(prefix+'character-a.glb');assert.equal(b.readUInt32LE(0),0x46546c67);
const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(gltf.meshes.length,6);assert(!gltf.skins);
assert(gltf.animations.some(a=>a.name==='walk'));assert.equal(gltf.images[0].uri,'Textures/texture-a.png');
const faces=makeLeoFaces();assert.equal(new Set(Object.values(faces)).size,3);
const avatar=createBaseAvatar({torsoVariant:'tapered'}),ids=Object.values(avatar.parts).map(m=>m.uuid);
for(const name of ['idle','look_react','walk']){for(const t of [1,.3,0,1]){applyActionSample(avatar,sampleAction(name,t));assert.deepEqual(Object.values(avatar.parts).map(m=>m.uuid),ids);}}
console.log('PASS P1B: mirrored asset/texture hashes match source manifest, CC0 record, 6 rigid meshes/no skin, existing tapered rig action identity');
