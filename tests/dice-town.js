import assert from 'node:assert/strict';
import * as T from 'three';
import {makeLeoFaces} from '../production/dice-town/leo-faces.js';
import {makeFinalHair} from '../production/dice-town/hair.js';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyFace,FACE_NAMES} from '../appearance/faces.js';
const a=createBaseAvatar(),ids=Object.values(a.parts).map(m=>m.uuid),faces=makeLeoFaces();
assert.deepEqual(Object.keys(faces),['focus','surprise','annoyed']);assert(!FACE_NAMES.includes('annoyed'));
for(const name of ['surprise','annoyed','focus','annoyed']){
 if(a.faceLayer)a.faceLayer.removeFromParent();a.faceLayer=faces[name];a.pivots.head.add(a.faceLayer);
 assert.equal(a.faceLayer,faces[name]);assert.deepEqual(Object.values(a.parts).map(m=>m.uuid),ids);
}
const hair=makeFinalHair('soft_textured_crop');a.pivots.head.add(hair);a.root.updateMatrixWorld(true);
const bounds=new T.Box3().setFromObject(hair);assert(!bounds.isEmpty());assert(bounds.max.y<7&&bounds.min.y>4);
for(const part of [hair,...Object.values(faces)])part.traverse(m=>{if(m.isMesh){for(const v of m.geometry.attributes.position.array)assert(Number.isFinite(v));}});
hair.removeFromParent();applyFace(a,'classic_smile');assert.deepEqual(Object.values(a.parts).map(m=>m.uuid),ids);
console.log('PASS Dice Town: isolated three cached expressions, finite hair/face geometry, removable hair, preserved six-part identity and original face compatibility');
