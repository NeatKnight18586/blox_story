// engine/fixtures/kit1/world.js — Kit 1 demo world: the Phase R realism street (street-procedural.json) built by parts/location.js.
// An async street needs the renderer, so it is built in preload() (engine/episode.js calls it for v3 worlds that export it); build() only
// fits the actor shadow and returns the ground. Street runs along −z, ground y 0, facades at x = ±9.
import * as T from 'three';
import {buildLocation, mergeLocation} from '../../../parts/location.js';
export const LOOK = {fog: {}, clouds: false, envPreset: 'day'};
export const LAYER = {};
let L = null;
export async function preload(base, {scene, renderer}) {
  const json = async u => (await fetch(new URL(u, base))).json(), dir = 'engine/fixtures/realism/';
  let loc = await json(dir + 'street-procedural.json'); if (loc.extends) loc = mergeLocation(await json(dir + loc.extends), loc);
  L = await buildLocation(scene, renderer, loc, {base, manifest: {materials: {}, hdri: {}}});
}
export function build() { L.fit(new T.Vector3(0, 0, 2), 14); return {groundY: () => 0, anchors: {}, update() {}}; }
