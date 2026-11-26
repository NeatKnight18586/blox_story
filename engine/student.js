// engine/student.js — E4 (unranked) STUDENT: the seeded academy-uniform crowd on the DUMMY slot (pure). `{troupe: 'DUMMY', costume:
// 'STUDENT', seed: n}` → a FULL-detail kid (youth build, real skin, our own hair, cream uniform with a trim colour, a birth symbol).
// Any 8 consecutive seeds differ in skin, hair style, hair colour and trim (odd strides over 8-entry tables); seeds past 8 shift the
// colour tables so a second ring of 8 does not repeat the first. Ranks spread over all five (D C B D A C B S).
import {RANK_LOOK} from '../avatar-style/symbol.js';

export const STUDENT_SKINS = ['#FBDCC0', '#EDBE94', '#D49A6A', '#B2744A', '#8D5A3B', '#6B4128', '#4D2E20', '#F7CDA6'];
export const STUDENT_HAIR_STYLES = ['spiky_crop', 'curly_top', 'wavy_bob', 'long_braids', 'shaggy_mop', 'curly_puffs', 'low_twintails', 'side_part'];
export const STUDENT_HAIR_COLORS = ['#2B1B14', '#5A3A22', '#8A5A2E', '#C98A3A', '#E8CE7A', '#B5452A', '#3A3F5C', '#4A6FA5'];
export const STUDENT_TRIMS = ['#D94452', '#8E5BD6', '#7FBF3F', '#E04FA0', '#2F7F5F', '#B5632A', '#8B2F4F', '#5C6B7A'];
export const STUDENT_RANKS = ['D', 'C', 'B', 'D', 'A', 'C', 'B', 'S'];
export const UNIFORM = {shirt: '#F1EAD6', shirtEdge: '#CFC6AE', trousers: '#232B52', skirt: '#2E3A78', shoes: '#2B2B2F'};
const m8 = n => ((n % 8) + 8) % 8;
// Colour regions of the academy uniform for a trim colour (pure): cream shirt with a trim tie + collar, trim cuffs, navy trousers (or a skirt over navy tights).
export function uniformRegions(trim, skin, {skirt = false} = {}) {
  return {torso: {main: UNIFORM.shirt, strip: trim, stripW: .24, lapel: UNIFORM.shirt, lapelW: .16, edge: trim, edgeW: .05, collarH: .16, back: true},
    arms: {upper: UNIFORM.shirt, lower: skin, cuff: trim, cuffH: .12, sleeve: 'wrist'},
    legs: {main: UNIFORM.trousers, shoes: UNIFORM.shoes}, ...(skirt ? {skirt: {color: UNIFORM.skirt, h: .7}} : {})};
}
export function studentLook(seed = 1) {
  const s = Math.max(1, Math.round(seed)), ring = Math.floor((s - 1) / 8), skin = STUDENT_SKINS[m8(3 * s + ring)], rank = STUDENT_RANKS[(s - 1) % 8], style = STUDENT_HAIR_STYLES[m8(5 * s + 2)];
  const trim = STUDENT_TRIMS[m8(3 * s + 2 + ring)], girl = ['wavy_bob', 'long_braids', 'low_twintails', 'curly_puffs'].includes(style), look = RANK_LOOK[rank];
  return {skin, scale: +(.8 + ((s * 5) % 4) * .03).toFixed(2), build: 'youth', age: 12, face: ['smile', 'smile', 'neutral', 'smile'][s % 4], faceStyle: 'v6', outfit: null, material: null,
    hair: {style, color: STUDENT_HAIR_COLORS[m8(7 * s + 4 + ring)], v: 4}, regions: uniformRegions(trim, skin, {skirt: girl && s % 2 === 0}), symbol: {shape: look.shape, color: look.color, rank}, trim, seed: s};
}
// Pure: how many distinct values 8 consecutive seeds (from `from`) take for a field of studentLook.
export const variety = (field, from = 1, n = 8) => new Set(Array.from({length: n}, (_, i) => { const l = studentLook(from + i); return field === 'hairStyle' ? l.hair.style : field === 'hairColor' ? l.hair.color : l[field]; })).size;
