// Small final production catalog. The original "bob" is retained in wardrobe.js for old films.
import {FINAL_HAIR_STYLES,makeFinalHair} from './v2-final-hair.js';
export const HAIR_STYLES=FINAL_HAIR_STYLES;
export const HAIR_COLORS=Object.freeze({
 black:0x24252b,espresso:0x372820,brown:0x6b4932,chestnut:0x935e3b,
 blonde:0xd4ad65,platinum:0xe7d5aa,auburn:0x9d4c35,blue_black:0x2b344b
});
export function hairColor(id){
 if(!Object.hasOwn(HAIR_COLORS,id))throw new Error(`Unknown hair color: ${id}`);
 return HAIR_COLORS[id];
}
export function makeV2Hair(id){return makeFinalHair(id);}
