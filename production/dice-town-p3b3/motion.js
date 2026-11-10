import {ease} from '../dice-town-p2a/motion.js';
// Local proof only; editorial D03 [169,255), D04 [255,337) remain untouched.
export function sample(frame){
 if(!Number.isInteger(frame)||frame<0||frame>=96)throw Error('Outside baker proof');
 const t=frame/30,grip=ease((t-.12)/.42),rise=ease((t-.65)/1.05),insert=frame>=57;
 const slip=ease((t-1.92)/1.05);
 return{frame,time:t,shot:insert?'D04':'D03',grip,rise,armAngle:.32+(.91-.32)*grip-(.91-.43)*rise,slip,headPitch:-.13*grip+.23*rise,shoeDrop:.44*slip,shoeForward:.28*slip};
}
