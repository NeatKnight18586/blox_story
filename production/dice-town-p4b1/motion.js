import {ease} from '../dice-town-p2a/motion.js';
export const COUNTS={D27:54,D29:36,D30:42,D31:42};
export function sample(shot,frame){if(!Number.isInteger(frame)||frame<0||frame>=COUNTS[shot])throw Error('Outside bounded finale window');const u=frame/(COUNTS[shot]-1);let phi=null,arm=-Math.PI/2+.92,advance=0,headPitch=.18,headYaw=.08;
 if(shot==='D27'){advance=.6*ease(u/.32)*(1-ease((u-.58)/.36));arm=-Math.PI/2+.92*ease((u-.58)/.36);headPitch=.05+.24*ease((u-.36)/.22)-.11*ease((u-.76)/.24);headYaw=.08+.18*ease((u-.36)/.22);}
 if(shot==='D30'){const urge=ease(u/.28)*(1-ease((u-.45)/.40));arm=-Math.PI/2+.92-.50*urge;headPitch=.18-.30*urge;headYaw=.26;}
 if(shot==='D29')phi=1.05-.67*ease(u);
 if(shot==='D31'){const main=.38*(1-ease(u/.82));const settle=u>.82?.024*Math.sin((u-.82)/.18*Math.PI*2)*(1-ease((u-.82)/.18)):0;phi=main+settle;}
 return{shot,frame,u,phi,arm,advance,headPitch,headYaw};}
