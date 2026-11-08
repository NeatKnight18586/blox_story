import {normalizeWardrobe,applyWardrobe} from './wardrobe.js';
import * as THREE from 'three';
import {block} from '../avatar/baseAvatar.js';
export function applyAppearance(avatar,{color,pieces={},cosmetic=null,hair=null,hairColor,clothing=null,clothingColor}={}){
 const wardrobe={hair,hairColor,clothing,clothingColor,cosmetic};normalizeWardrobe(wardrobe);
 if(cosmetic!==null&&cosmetic!=='cap')throw new Error('Unknown cosmetic');
 for(const key of Object.keys(pieces))if(!avatar.parts[key])throw new Error(`Unknown body piece: ${key}`);
 if(color!==undefined)for(const m of Object.values(avatar.parts))m.material.color.set(color);
 for(const [key,value] of Object.entries(pieces))avatar.parts[key].material.color.set(value);
 if(avatar.cosmetic)avatar.cosmetic.removeFromParent();avatar.cosmetic=null;
 if(cosmetic){
 if(!avatar.cosmeticCache.has('cap')){const cap=new THREE.Group();cap.name='cap';const crown=block('cap_crown',[1.33,.25,1.18],0x425b78,.06);crown.position.set(0,1.15,0);const brim=block('cap_brim',[1.38,.065,.58],0x425b78,.02);brim.position.set(0,1.04,.61);cap.add(crown,brim);avatar.cosmeticCache.set('cap',cap);}
 avatar.cosmetic=avatar.cosmeticCache.get('cap');avatar.pivots.head.add(avatar.cosmetic);
 }applyWardrobe(avatar,wardrobe);return avatar;
}
