import * as T from 'three';
import {makeExpression} from '../../appearance/expressions.js';
import {headFrontZ} from '../../avatar/headGeometry.js';

// Leo-only cached acting choices. The public face catalog and pilot stay intact.
export function makeLeoFaces(){
 const focus=makeExpression('thoughtful'),surprise=makeExpression('startled');
 const annoyed=makeExpression('thoughtful');annoyed.name='leo_annoyed';
 for(const sign of [-1,1]){
  const brow=annoyed.getObjectByName(`brow_${sign<0?'left':'right'}`);
  const points=[[sign*.07,.83],[sign*.14,.858],[sign*.22,.89]];
  brow.geometry.dispose();brow.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x,y,headFrontZ(x)+.012))),24,.014,8,false);
 }
 const mouth=annoyed.getObjectByName('mouth');mouth.geometry.dispose();
 const points=[[-.18,.335],[-.10,.36],[.08,.36],[.18,.335]];
 mouth.geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points.map(([x,y])=>new T.Vector3(x,y,headFrontZ(x)+.014))),24,.016,8,false);
 return {focus,surprise,annoyed};
}
