// parts/sets4/toyhouse_all.js — composite location (format v5, Phase 3b): the hall AND the dawn street in one world, for an
// episode that cuts between outside and inside. The street module supplies the facade; the hall skips its own front wall.
// Anchors: every hall anchor, plus the street's (street, facade, truck, lamp) and `outside` (the street's view of the shutter).
// setState: shutter (both shutters), clock, truck.
import * as Hall from './toyhouse.js';
import * as Street from './toyhouse_street.js';
export {ZONES, TRACK, PRACTICALS, railCurve, trackPoint} from './toyhouse.js';
export const groundY = (x, z) => z < 35 ? Hall.groundY(x, z) : 0;
export const ANCHORS = {...Hall.ANCHORS, street: Street.ANCHORS.street, facade: Street.ANCHORS.facade, truck: Street.ANCHORS.truck, lamp: Street.ANCHORS.lamp, outside: Street.ANCHORS.shutter};
// format v5 3b-R: async assets before the (synchronous) build — the box-art atlas (disk cache or generated once)
export {preload} from './toyhouse.js';
export function build(scene, opts = {}) {
  const hall = Hall.build(scene, {...opts, front: false}), street = Street.build(scene, opts); let shut = 0;
  const anchors = {...hall.anchors, street: street.anchors.street, facade: street.anchors.facade, truck: street.anchors.truck, lamp: street.anchors.lamp, outside: street.anchors.shutter};
  return {...hall, anchors, groundY, lights: [...hall.lights, ...street.lights], bakeGroups: [{root: hall.root, preset: 'toy', lights: hall.lights}, {root: street.root, preset: 'dawn', lights: street.lights}], stats: {hall: hall.stats, street: street.stats},
    // 3b-R: inside the hall (z < 35, under the ceiling) the street is behind solid walls; outside at street level with the shutter
    // down the hall interior is hidden behind the facade. Top cameras (above the ceiling) see both.
    onCamera([x, y, z]) { hall.onCamera([x, y, z]); const above = y > 36, inside = z < 35.2; street.root.visible = above || !inside; hall.root.visible = above || inside || shut > .02; },
    setState(k, v) { if (k === 'shutter') shut = v; hall.setState(k, v); street.setState(k, v); }, update(t) { hall.update(t); street.update(t); }};
}
