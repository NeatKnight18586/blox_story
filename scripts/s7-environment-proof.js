// S7 art-direction PROOF ONLY: do not alter S6 native frames or runtime source.
// Genuine matching 720x1280 WebGL before/after captures using the approved S5 story.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {loadSpeechStory} from './s5-story.js';
import {blockFor,openBlock} from './names100.js';
import {startServer} from './pipeline/server.js';

const story=await loadSpeechStory();
const server=await startServer(process.cwd());
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const dir='renders/names100-s7-color-proof';await mkdir(dir,{recursive:true});
const checks=[];const errors=[];
const shots=[
 {g:35,look:'night',label:'opening-night'},
 {g:700,look:'bedroom',label:'bedroom'},
 {g:1392,look:'dawn',label:'reunion-sunrise'},
 {g:1600,look:'dawn',label:'final-isolation'}
];
try{
 for(const shot of shots){
  const b=blockFor(story,shot.g);
  const page=await openBlock(browser,server,b,720,1280);
  page.on('pageerror',e=>errors.push(e.message));
  const current=await page.evaluate(f=>{
    const p=window.__production;
    const state=p.renderFrame(f);
    return {storyShot:state.shot,identity:state.identity,canvas:[p.renderer.domElement.width,p.renderer.domElement.height]};
  },shot.g-b.start);
  assert(current.identity);assert.deepEqual(current.canvas,[720,1280]);
  await page.screenshot({path:path.join(dir,shot.label+'-before.png')});
  const result=await page.evaluate(async (look)=>{
    const THREE=await import('three'),p=window.__production;
    const scene=p.scene, courtyard=p.world?.courtyard;
    const isBedroom=look==='bedroom';
    // Night palette: keep deep navy above, gray/olive ground, warm localized windows.
    // Dawn palette: apricot horizon, soft teal upper sky, earth-gray path/home.
    const colors=isBedroom?{
      room_floor:0x51473f,courtyard:0x313943,side_wall:0x243742,window_wall:0x425763,
      sill_wall:0x475660,door:0x54453d,bed_base:0x333842,blanket:0x426174
    }:look==='night'?{
      street:0x53504a,path_stone:0x8c887c,home_wall:0x77796f,
      building:0x43535a,roof_edge:0x334451,roof_cap:0x374755,
      occupied_house:0x4f5c59,window_recess:0x283e43,
      window_sill:0x9b9183,home_door:0x524b42,stoop:0x817c70,
      step:0x7c766d,s1_sidewalk_edge:0x7b7e76,porch_post:0x79857f,
      door_trim:0x8f877c,door_trim_header:0x95897b,s4_neighbor_step:0x777b72
    }:{
      street:0x777168,path_stone:0xb0a79a,home_wall:0xa59d88,
      building:0x827f78,roof_edge:0x686f72,roof_cap:0x737276,
      occupied_house:0x928980,window_recess:0x555d5d,
      window_sill:0xc5b7a3,home_door:0x686354,stoop:0xa79b8a,
      step:0x9a8f84,s1_sidewalk_edge:0x98978e,porch_post:0xa69e8d,
      door_trim:0xb0a794,door_trim_header:0xb4a994,s4_neighbor_step:0x999186
    };
    let recolored=0;
    scene.traverse(o=>{
      if(!o.isMesh||!o.material?.isMeshStandardMaterial)return;
      const hex=colors[o.name];
      if(hex===undefined)return;
      if(o.name==='courtyard'&&o.parent?.name!=='ending_bedroom')return;
      o.material.color.setHex(hex);recolored++;
    });
    // Keep existing character palettes, shadows, cameras, animation and real light sources.
    if(courtyard){
      courtyard.sky.groundColor.setHex(look==='night'?0x4b443f:0x79675c);
      if(look==='night')courtyard.fill.color.setHex(0xa3c4cd);
    }
    if(scene.fog){scene.fog.color.setHex(isBedroom?0x303b44:look==='night'?0x404d54:0xd4ab96);
      scene.fog.density=isBedroom?.018:look==='night'?.008:.007;}
    // A few restrained ground joints on the home approach; avoid checkerboard floors.
    if(!isBedroom && courtyard){
      const ground=new THREE.Group();ground.name='s7_ground_relief_study';
      courtyard.group.add(ground);
      const seamMat=new THREE.MeshStandardMaterial({color:look==='night'?0x68645d:0x918a7f,roughness:.98});
      for(const [x,z,w] of [[-1,1.2,4.9],[.6,4.5,5.2],[2.8,7.2,5.7]]){
        const m=new THREE.Mesh(new THREE.BoxGeometry(w,.012,.06),seamMat);
        m.position.set(x,.008,z);m.castShadow=false;m.receiveShadow=false;ground.add(m);
      }
      const verge=new THREE.Mesh(new THREE.BoxGeometry(.72,.012,12),new THREE.MeshStandardMaterial({color:look==='night'?0x465349:0x777a62,roughness:1}));
      verge.position.set(-5.35,.008,1);verge.castShadow=false;ground.add(verge);
    }
    // Sky color is selected independently from road; simple vertex-color gradient, no custom post FX.
    const top=new THREE.Color(isBedroom?0x101c32:look==='night'?0x16273c:0x8ca8b7);
    const horizon=new THREE.Color(isBedroom?0x324756:look==='night'?0x67666a:0xefb99e);
    const radius=42,g=new THREE.SphereGeometry(radius,32,18),a=g.getAttribute('position'),verts=[];
    for(let i=0;i<a.count;i++){
      const y=a.getY(i)/radius;const t=THREE.MathUtils.smoothstep(y,-.45,.5);
      const col=horizon.clone().lerp(top,t);verts.push(col.r,col.g,col.b);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(verts,3));
    const sky=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false}));
    sky.name='s7_gradient_sky_study';sky.position.copy(p.camera.position);sky.renderOrder=-1000;scene.add(sky);
    p.renderer.render(scene,p.camera);
    return {recolored,gradient:!!sky,parent:sky.parent===scene};
  },shot.look);
  assert(result.recolored>=3);assert(result.gradient&&result.parent);
  await page.screenshot({path:path.join(dir,shot.label+'-after.png')});
  checks.push({globalFrame:shot.g,block:b.id,look:shot.look,source:b.file,...result});
  await page.close();
 }
 assert.deepEqual(errors,[]);
 await writeFile(path.join(dir,'proof.json'),JSON.stringify({status:'TECHNICAL PASS; ART APPROVAL PENDING',checks,errors},null,2));
 console.log('PASS S7: four identical-frame genuine native 720x1280 before/after WebGL look studies (no old films changed)');
}finally{await browser.close();await server.close();}
