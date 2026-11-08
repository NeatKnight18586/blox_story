// Story-specific native-clock cues; no accumulated simulation or new action engine.
export const ENDING_COUNTER=[{at:945,value:99},{at:1210,value:52},{at:1236,value:18},{at:1261,value:3},{at:1278,value:1},{at:1529,value:0}];
export const S2_COUNTER=[ENDING_COUNTER[0],{at:1120,value:98},{at:1168,value:97},...ENDING_COUNTER.slice(1)];
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function compileEnding(input,plan){
 if(!input||Object.keys(input).some(k=>!['globalStart','globalEnd','clockFps','visuals'].includes(k))||input.globalStart!==945||input.globalEnd!==1641||input.clockFps!==30||plan.fps!==30||plan.frameCount!==696||plan.environment.kind!=='bedroom-window'||plan.cast.length!==2||!plan.cast.some(a=>a.id==='eli')||!plan.cast.some(a=>a.id==='mara')||plan.reveal)throw new Error('Ending requires the bounded native-clock Eli/Mara courtyard proof');
 if(input.visuals!==undefined&&input.visuals!=='s2')throw new Error('Unknown ending visual variant');
 return {...input};
}
export function sampleEnding(plan,frame){
 const globalFrame=plan.globalStart+frame,s2=plan.visuals==='s2';
 return {globalFrame,globalTime:globalFrame/30,counter:(s2?S2_COUNTER:ENDING_COUNTER).filter(c=>globalFrame>=c.at).at(-1).value,counterEmphasis:globalFrame>=1203&&globalFrame<1296||globalFrame>=1490&&globalFrame<1546,whisper:false,location:globalFrame<1096?'bedroom':'courtyard',doorOpen:ease((globalFrame-1054)/36),sunrise:ease((globalFrame-1296)/60),forgotten:ease((globalFrame-1529)/48),adultRestored:ease((globalFrame-(s2?1120:1210))/(s2?22:18)),childRestored:ease((globalFrame-(s2?1168:1236))/(s2?22:18))};
}
