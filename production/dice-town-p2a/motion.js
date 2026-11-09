export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function compileProof(input){
 if(input?.scene!=='dice-town-p2a'||input.fps!==30||![180,360,720].includes(input.width)||input.height!==input.width*16/9||input.shots?.length!==2)throw Error('Invalid bounded Dice Town proof');
 if(input.shots[0].start!==0||input.shots[0].end!==75||input.shots[1].start!==75||input.shots[1].end!==120)throw Error('Expected exact 75/45 frame shots');
 for(const s of input.shots){for(const v of[s.camera.position,s.camera.target])if(v?.length!==3||!v.every(Number.isFinite))throw Error('Invalid camera');if(!(s.camera.fov>=20&&s.camera.fov<=65))throw Error('Invalid FOV');}
 return {...input,frameCount:120,duration:4};
}
export function sampleMotion(frame){
 if(!Number.isInteger(frame)||frame<0||frame>=120)throw Error('Frame outside proof');
 const t=frame/30,settle=Math.exp(-10*t)*(1-ease((t-.3)/.2));
 const people=[0,1,2].map(i=>{
  const u=t-.5-i*.09,prepare=ease(u/.23),lift=ease((u-.28)/1.2),height=[2.25,2.05,1.65][i]*lift+.10*lift*Math.sin(Math.min(1,Math.max(0,(u-.28)/1.7))*Math.PI);
  const recoil=Math.sin(Math.max(0,u-.2)*7)*Math.exp(-Math.max(0,u-.2)*2)*lift;
  return {height,lean:lift*.07*Math.sin(t*2+i),tilt:lift*[-.07,.065,-.05][i],pivots:{head:[-.09*prepare+.14*lift,(i-1)*.13*prepare,.035*recoil],leftShoulder:[[-.2,-.45,.25][i]*prepare,0,-[.9,.55,1.1][i]*prepare-.12*recoil],rightShoulder:[[-.65,-.8,-.4][i]*prepare,0,[.65,.22,.75][i]*prepare+.1*recoil],leftHip:[lift*[.32,-.22,.38][i],0,-.025*lift],rightHip:[lift*[-.22,.32,-.24][i],0,.025*lift]}};
 });
 const u=Math.max(0,t-2.5),surprise=ease(u/.22),irritation=ease((u-.60)/.60);
 return {die:[.035*settle*Math.sin(16*t+.6),.045*settle*Math.cos(17*t)],people,hero:{weights:[1-surprise,surprise*(1-irritation),surprise*irritation],head:[-.20*surprise+.14*irritation,.10+.15*surprise-.09*irritation,-.035*surprise+.055*irritation],shoulder:.11*surprise-.095*irritation}};
}
