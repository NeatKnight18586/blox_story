import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyAppearance} from '../appearance/appearance.js';
import {normalizeWardrobe} from '../appearance/wardrobe.js';
import {SKIN_TONES,skinColor} from '../appearance/v2-skin.js';
import {HAIR_STYLES,HAIR_COLORS,makeV2Hair} from '../appearance/v2-hair.js';
import {applyToonV2} from '../appearance/v2-toon.js';
import {createV2Backlot} from '../production/assets/v2-backlot.js';

const expected=['neat_side_part','soft_textured_crop','low_bun','shoulder_length'];
assert.deepEqual([...HAIR_STYLES],expected);
assert.equal(Object.keys(SKIN_TONES).length,8);assert.equal(Object.keys(HAIR_COLORS).length,8);
assert.throws(()=>skinColor('not-real'));
for(const unsupported of ['bacon','sculpt_swept','spiky','long_straight']){
 assert.throws(()=>normalizeWardrobe({hair:unsupported}));
}
assert.equal(normalizeWardrobe({hair:'bob'}).hair,'bob');
assert.throws(()=>normalizeWardrobe({hair:'low_bun',cosmetic:'cap'}));
assert.equal(normalizeWardrobe({hair:'shoulder_length',hairColorId:'auburn'}).hairColor,HAIR_COLORS.auburn);

const a=createBaseAvatar(),parts=Object.values(a.parts),pivots=Object.values(a.pivots);
const initialGeometries=parts.map(o=>o.geometry);
for(const hair of expected){
 const appearance={skinToneId:'tan',hair,hairColorId:'espresso',
  pieces:{torso:0x41607a,leftArm:0x41607a,rightArm:0x41607a,leftLeg:0x263447,rightLeg:0x263447}};
 applyAppearance(a,appearance);
 const layer=a.hairLayer;
 assert.equal(layer.name,'hair_'+hair);
 assert.equal(layer.parent,a.pivots.head);
 assert.equal(layer.userData.attachment,'HairAttachment');
 assert(layer.children.length>=4&&layer.children.length<=12);
 let tris=0;
 layer.traverse(o=>{
  if(!o.isMesh)return;
  assert.equal(o.material.transparent,false);
  assert.equal(o.material.isMeshStandardMaterial,true);
  assert(o.geometry.getAttribute('normal'));
  tris+=o.geometry.index?o.geometry.index.count/3:o.geometry.getAttribute('position').count/3;
 });
 assert(tris<4500,`${hair} too expensive: ${tris}`);
 applyAppearance(a,appearance);assert.equal(a.hairLayer,layer,'hair must be reused not rebuilt');
 assert.equal(a.parts.head.material.color.getHex(),SKIN_TONES.tan);
 assert.equal(a.v2Hands.length,2);assert(a.v2Hands.every(m=>m.parent));
 assert.deepEqual(Object.values(a.parts).map(o=>o.geometry),initialGeometries);
 assert.deepEqual(Object.values(a.pivots),pivots);
}
const cachedHands=a.v2Hands;
applyAppearance(a,{color:0x888888});
assert(cachedHands.every(m=>!m.parent));
applyAppearance(a,{skinToneId:'deep',hair:'low_bun',hairColorId:'black'});
assert.equal(a.v2Hands,cachedHands);assert(cachedHands.every(m=>m.parent));
assert.equal(a.parts.head.material.color.getHex(),SKIN_TONES.deep);
const b=createBaseAvatar();applyAppearance(b,{skinToneId:'fair',hair:'shoulder_length'});
assert.notEqual(b.parts.head.material.color.getHex(),a.parts.head.material.color.getHex());
const world=new THREE.Group();
assert.equal(createV2Backlot(world,{palette:'sunrise',layout:'homecoming'}).parent,world);
assert.throws(()=>createV2Backlot(world,{palette:'not-real'}));
const old=a.parts.head.material,look=applyToonV2(a.root);
assert(look.converted>0);assert(a.parts.head.material.isMeshToonMaterial);
assert.equal(a.parts.head.material.gradientMap.minFilter,THREE.NearestFilter);
look.restore();assert.equal(a.parts.head.material,old);
console.log('PASS final V2 four-hair catalog: fit geometry, stable casts, legacy bob, skin tones, toon and backlot');
