// parts/sets4/toyhouse_all.js — composite location (format v5, Phase 3b): the hall AND the dawn street in one world, for an
// episode that cuts between outside and inside. The street module supplies the facade; the hall skips its own front wall.
// Anchors: every hall anchor, plus the street's (street, facade, truck, lamp) and `outside` (the street's view of the shutter).
// setState: shutter (both shutters), clock, truck.
import * as Hall from './toyhouse.js';
import * as Street from './toyhouse_street.js';
export {ZONES, TRACK, PRACTICALS, railCurve, trackPoint} from './toyhouse.js';
export const groundY = (x, z) => z < 35 ? Hall.groundY(x, z) : 0;
export const ANCHORS = {...Hall.ANCHORS, street: Street.ANCHORS.street, facade: Street.ANCHORS.facade, truck: Street.ANCHORS.truck, lamp: Street.ANCHORS.lamp, outside: Street.ANCHORS.shutter};
export function build(scene, opts = {}) {
  const hall = Hall.build(scene, {...opts, front: false}), street = Street.build(scene, opts);
  const anchors = {...hall.anchors, street: street.anchors.street, facade: street.anchors.facade, truck: street.anchors.truck, lamp: street.anchors.lamp, outside: street.anchors.shutter};
  return {...hall, anchors, groundY, lights: [...hall.lights, ...street.lights], bakeGroups: [{root: hall.root, preset: 'toy', lights: hall.lights}, {root: street.root, preset: 'dawn', lights: street.lights}], stats: {hall: hall.stats, street: street.stats},
    setState(k, v) { hall.setState(k, v); street.setState(k, v); }, update(t) { hall.update(t); street.update(t); }};
}
