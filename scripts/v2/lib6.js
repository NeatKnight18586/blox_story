// scripts/v2/lib6.js — the set library as brief2spec sees it (P4): which locations, anchors and props already exist.
//   locations: parts/sets4/anchors.json (module + anchor names), parts/locations/*.json (location files), parts/library6.json (extra
//   registered worlds, e.g. the v4look street); props: toy props (props4), PROPS5, and every `prop` placed by a location file.
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {TOY_PROPS} from '../../parts/sets4/props4.js';
import {PROPS5} from '../../parts/sets4/props5.js';

const J = p => JSON.parse(readFileSync(p, 'utf8'));
export function loadLibrary(root = '.') {
  const locations = {}, props = new Set([...TOY_PROPS, ...Object.keys(PROPS5)]);
  const A = `${root}/parts/sets4/anchors.json`;
  if (existsSync(A)) for (const [k, v] of Object.entries(J(A))) { locations[k] = {world: null, module: v.module, anchors: v.anchors ?? []}; for (const a of v.anchors ?? []) locations[a] ??= {world: null, module: v.module, anchors: [a], anchorOf: k}; }
  const D = `${root}/parts/locations`;
  if (existsSync(D)) for (const f of readdirSync(D).filter(f => f.endsWith('.json') && !f.startsWith('anchors'))) { const j = J(`${D}/${f}`), n = f.replace(/\.json$/, ''); locations[n] = {world: null, file: `parts/locations/${f}`, anchors: [n]}; for (const p of j.props ?? []) if (p.prop) props.add(p.prop); }
  const X = `${root}/parts/library6.json`;
  if (existsSync(X)) { const x = J(X); for (const [k, v] of Object.entries(x.locations ?? {})) locations[k] = {world: v.world, anchors: v.anchors ?? [k]}; for (const p of x.props ?? []) props.add(p); }
  return {locations, props};
}
