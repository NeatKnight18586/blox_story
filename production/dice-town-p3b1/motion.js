import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const supportVertices=new RoundedBoxGeometry(6.3,6.3,6.3,4,.23).attributes.position.array;
export const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export const HALF=3.15,PIVOT=[-1,4.6,0],RADIUS=.08;
export function dieCenter(phi){let min=Infinity;for(let i=0;i<supportVertices.length;i+=3)min=Math.min(min,supportVertices[i]*Math.sin(phi)+supportVertices[i+1]*Math.cos(phi));return [0,6.2-min,0];}
export function contactAngle(phi){const cy=dieCenter(phi)[1],t=Math.tan(phi),a=3+.123*t,b=.123-3*t,c=cy-HALF/Math.cos(phi)+t*PIVOT[0]-PIVOT[1];return Math.asin(c/Math.hypot(a,b))-Math.atan2(b,a);}
export function tip(theta){return[PIVOT[0]+3*Math.cos(theta)-.123*Math.sin(theta),PIVOT[1]+3*Math.sin(theta)+.123*Math.cos(theta),0];}
export function signedDieGap(theta,phi){const p=tip(theta),cy=dieCenter(phi)[1];return cy+Math.tan(phi)*p[0]-HALF/Math.cos(phi)-p[1];}
export function coupledOutput(input,pin){const bx=PIVOT[0]+.55*Math.cos(input),by=PIVOT[1]+.55*Math.sin(input);const engaged=Math.hypot(pin[0]-bx,pin[1]-by)<.04&&pin[2]-.45<=.81&&pin[2]+.65>=1.12;return engaged?input:0;}
export function sample(mode,frame){
 if(!['mechanism','handoff','disabled'].includes(mode)||!Number.isInteger(frame)||frame<0||frame>=(mode==='handoff'?72:48))throw Error('Invalid proof sample');
 const t=frame/30;let input=0,output=0,phi=1.0,pin=[-.45,4.6,1.05],owner='sleeve';
 if(mode==='mechanism'){
  const reach=ease(t/.55),kick=ease((t-.55)/.35),release=ease((t-1.15)/.4);phi=1.0-1.08*kick;output=(t<.55?contactAngle(1.0)*reach:contactAngle(phi))*(1-release);input=output;
  pin=[PIVOT[0]+.55*Math.cos(input),PIVOT[1]+.55*Math.sin(input),1.05];
 }else{
  const pull=ease(t/.55),carry=ease((t-.85)/.9);pin=[-.45+1.25*carry,4.6,1.05+1.2*pull+.75*ease(carry*1.8)];owner=t<.55?'extracting':t<1.75?'leo':'pip';
  if(mode==='disabled'){pin=[.8,4.6,3];input=contactAngle(1.0)*ease(t/.55);owner='pip';}
 }
 output=coupledOutput(input,pin);
 return{mode,frame,time:t,input,output,phi,pin,owner,contactGap:signedDieGap(output,phi),pinTailClearance:pin[2]-.45-1.5};
}
