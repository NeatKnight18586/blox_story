/** F1 structural smoke. Uses a tiny THREE API stub: NOT a WebGL/visual test. Node 18+. */
const fs=require('fs'); const path=require('path');const os=require('os');const assert=require('assert/strict');
const source=path.resolve(__dirname,'..'); const root=fs.mkdtempSync(path.join(os.tmpdir(),'blockstory-f1-'));
try {
 fs.mkdirSync(path.join(root,'node_modules','three'),{recursive:true});
 fs.writeFileSync(path.join(root,'node_modules','three','package.json'),JSON.stringify({name:'three',type:'module',exports:'./index.js'}));
 fs.writeFileSync(path.join(root,'node_modules','three','index.js'),`
 class V{constructor(){this.set(0,0,0)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
 class Obj{constructor(){this.children=[];this.position=new V();this.rotation=new V();this.scale=new V().set(1,1,1);this.userData={};this.name='';this.parent=null}add(child){this.children.push(child);child.parent=this}traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}}
 export class Group extends Obj{}
 export class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}}
 export class MeshStandardMaterial{constructor(args){this.color=args.color;this.roughness=args.roughness}}
 export class Shape{moveTo(){}lineTo(){}quadraticCurveTo(){}}
 export class ExtrudeGeometry{constructor(shape,args){this.shape=shape;this.args=args}translate(){}}
 export class SphereGeometry{constructor(...args){this.args=args}}
 `);
 for (const f of ['character.js','presets.js'])fs.copyFileSync(path.join(source,f),path.join(root,f));
 const url=require('url').pathToFileURL(path.join(root,'character.js'));
 (async()=>{
  const {createCharacter,applyPose,applyExpression}=await import(url.href);
  const kai=createCharacter('kai'),mira=createCharacter('mira');
  assert.equal(kai.id,'kai');assert.equal(mira.id,'mira');
  assert.notEqual(kai.preset.top,mira.preset.top);
  assert.notEqual(kai.preset.hair,mira.preset.hair);
  for (const c of [kai,mira]) {
   assert.equal(c.root.name,c.id);assert.equal(c.root.userData.characterId,c.id);
   for(const k of ['head','leftShoulder','rightShoulder','leftHip','rightHip'])assert.equal(c.pivots[k].name,k);
   let all=[];c.root.traverse(x=>all.push(x));
   const before=all.slice();const meshCount=all.filter(x=>x.isMesh).length;
   assert(meshCount>20 && meshCount<100,`Unexpected geometry count ${meshCount}`);
   const getPose=()=>Object.values(c.pivots).map(p=>[p.rotation.x,p.rotation.y,p.rotation.z]);
   applyPose(c,'neutral');const neutral=getPose();
   applyPose(c,'walk_demo',.25);const walk=getPose();assert.notDeepEqual(walk,neutral);
   applyPose(c,'look_down');const down=getPose();assert(down[0][0]>.1);
   applyPose(c,'walk_demo',.25);assert.deepEqual(getPose(),walk,'pose cycle must be deterministic');
   applyPose(c,'neutral');assert.deepEqual(getPose(),neutral,'neutral must reset all pivots');
   const face=()=>[...Object.values(c.parts).map(p=>[p.position.x,p.position.y,p.position.z,p.rotation.z,p.scale.x,p.scale.y])];
   applyExpression(c,'neutral');const neutralFace=face();
   applyExpression(c,'worried');assert.notDeepEqual(face(),neutralFace);
   applyExpression(c,'neutral');assert.deepEqual(face(),neutralFace);
   all=[];c.root.traverse(x=>all.push(x));assert.deepEqual(all,before,'poses/expressions cannot regenerate any part');
   const soles=all.filter(x=>x.name.endsWith('_sole'));
   assert.equal(soles.length,2);
   // With neutral hips, target sole bottom is y=0.
   for(const s of soles){const center=s.parent.position.y+s.position.y;assert(Math.abs(center-.0325)<.002,`Sole placement is below/above floor: ${center}`);}
   console.log(`${c.id}: PASS | ${meshCount} meshes, 5 pivots, 3 poses, 2 expressions`);
  }
  console.log('F1 STRUCTURAL SMOKE: PASS (no real Three.js or WebGL)');
 })().catch(e=>{console.error(e);process.exitCode=1});
} finally {process.on('exit',()=>fs.rmSync(root,{recursive:true,force:true}));}
