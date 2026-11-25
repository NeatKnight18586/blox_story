// scripts/v2/segments.js — multi-location episodes by SEGMENTS (tuft 4A). A spec with `locations: [..]` is NOT one merged world:
// each location is its own page (spec.location = L, its own baked light) and renders only the frames whose shot.loc === L into the
// shared frames dir (same names, same cache). render / stability / read / bench all go through `segmentPlan`.
// A spec without `locations` has exactly one segment = the spec file itself (nothing changes for it).
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {layoutShots} from '../../engine/timeline.js';

// Pure: the spec as seen by the page of location `loc`. `data` = parts/locations/<loc>.json. Everything addressed to another
// location (anchors, props, markers) is dropped: it is never on screen in this page.
export function segmentSpec(spec, loc, data = {}, {fps = spec.fps ?? 30} = {}) {
  const shots = layoutShots(spec);
  const mine = t => { const s = shots.findLast(q => t >= q.start / fps - 1e-6); return !s || (s.loc ?? spec.locations[0]) === loc; };
  const anchors = new Set(Object.keys(data.anchors ?? {}));
  const out = {...spec, location: loc, look4: spec.locationLook4?.[loc] ?? spec.look4, look: spec.locationLook4?.[loc] ?? spec.look, skyDist: data.skyDist ?? 650, ...(data.puffBall ? {puffBall: data.puffBall} : {})};
  delete out.locations; delete out.locationLook4;
  out.shots = spec.shots.map(sh => (sh.loc ?? spec.locations[0]) === loc ? sh : {...sh, ...(sh.beasts ? {beasts: sh.beasts.map(({to, ...b}) => b)} : {})});
  for (const k of ['props2b', 'props']) if (spec[k]) out[k] = spec[k].filter(p => !p.loc || p.loc === loc);
  if (spec.story6) {
    const s6 = {...spec.story6}, keep = q => mine(q.t) && (!q.anchor || anchors.has(q.anchor));
    for (const k of ['hand', 'tumbles', 'splashes']) if (s6[k]) s6[k] = s6[k].filter(keep);
    if (s6.crowd) s6.crowd = {...s6.crowd, steps: s6.crowd.steps.filter(keep), startAt: s6.crowd.startAt && anchors.has(s6.crowd.startAt) ? s6.crowd.startAt : null};
    out.story6 = s6;
  }
  return out;
}

// Node side: [{loc, specPath, shotIds: Set | null}]. null shotIds = every shot (the spec has no `locations`).
export function segmentPlan(specPath, {root = '.'} = {}) {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  if (!spec.locations?.length) return {spec, segments: [{loc: null, specPath, shotIds: null}]};
  const dir = path.join(path.dirname(specPath), 'build', 'segments'); mkdirSync(dir, {recursive: true});
  const segments = spec.locations.map(loc => {
    const f = `${root}/parts/locations/${loc}.json`, data = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
    const p = path.join(dir, `${path.basename(specPath, '.json')}.${loc}.json`);
    writeFileSync(p, JSON.stringify(segmentSpec(spec, loc, data), null, 1) + '\n');
    return {loc, specPath: p, shotIds: new Set(spec.shots.filter(s => (s.loc ?? spec.locations[0]) === loc).map(s => s.id))};
  }).filter(s => s.shotIds.size);
  return {spec, segments};
}
