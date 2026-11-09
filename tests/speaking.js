import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBaseAvatar} from '../avatar/baseAvatar.js';
import {applyFace,FACE_NAMES} from '../appearance/faces.js';
import {compileSpeaking,sampleSpeaking,createSpeakingLayer} from '../appearance/speaking.js';
import {loadAssembly} from '../scripts/s4-story.js';
import {loadSpeechStory} from '../scripts/s5-story.js';
import {sampleShotList} from '../production/timeline.js';
const input=JSON.parse(await readFile('stories/names100/s5-speech.json')),p=compileSpeaking(input,new Set(['eli'])),a=createBaseAvatar();for(const f of FACE_NAMES)applyFace(a,f);const layer=createSpeakingLayer(a),refs=[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(layer.meshes),...Object.values(layer.meshes).map(m=>m.geometry),layer.material];
assert.equal(p.cues.length,4);assert.throws(()=>compileSpeaking({...input,actor:'missing'},new Set(['eli'])));assert.throws(()=>compileSpeaking({...input,cues:[{...input.cues[0],keys:[[1,1],[2,0],[3,0]]}]},new Set(['eli'])));assert.throws(()=>sampleSpeaking(p.cues,1.5));
const original=await loadAssembly(),speaking=await loadSpeechStory();let active=0;
for(let g=0;g<1641;g++){
 const sample=sampleSpeaking(p.cues,g);if(sample.amount>0){active++;assert(g>=776&&g<788||g>=1204&&g<1260);}
 for(const [lo,hi]of [[0,775],[789,1203],[1210,1227],[1236,1252],[1261,1270],[1278,1289],[1296,1641]])if(g>=lo&&g<=hi)assert.equal(sample.amount,0,`Forbidden speech${g}`);
 const b=original.blocks.find(b=>g>=b.start&&g<b.end),other=speaking.blocks.find(x=>x.id===b.id);assert.deepEqual(sampleShotList(b.plan,g-b.start),sampleShotList(other.plan,g-b.start));
}
function snapshot(g,face){applyFace(a,face);layer.apply(sampleSpeaking(p.cues,g));return {shape:Object.values(layer.meshes).map(m=>[m.visible,...m.scale.toArray()]),original:a.faceLayer.children.filter(o=>o.isMesh&&o.name==='mouth').map(m=>m.visible),visible:layer.group.visible};}
for(const face of FACE_NAMES){const expected=snapshot(780,face);snapshot(1600,'worried');assert.deepEqual(snapshot(780,face),expected);const sealed=snapshot(0,face);snapshot(1232,'nervous');assert.deepEqual(snapshot(0,face),sealed);}
applyFace(a,'startled');layer.apply(sampleSpeaking(p.cues,1529));assert(layer.meshes.closed.visible);assert(!a.faceLayer.getObjectByName('mouth').visible);assert(a.faceCache.get('startled').getObjectByName('mouth').geometry.type==='TubeGeometry');
layer.clear();assert(a.faceLayer.getObjectByName('mouth').visible);
applyFace(a,'nervous');layer.apply(sampleSpeaking(p.cues,1600));assert(!layer.group.visible&&a.faceLayer.getObjectByName('mouth').visible);assert(refs.every((o,i)=>o===[a.root,...Object.values(a.parts),...Object.values(a.pivots),...Object.values(layer.meshes),...Object.values(layer.meshes).map(m=>m.geometry),layer.material][i]));
console.log('PASS speech: sealed outside authored whisper/three irregular name cues; no spoken numbers,1641 unchanged story/body samples,three persistent shapes/cached expressions,blank/ghost-compatible hierarchy and reverse reset');
