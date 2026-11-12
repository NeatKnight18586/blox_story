// avatar-style/tools.js — hand-held tools (docs/V2_BRIEF.md §6.4): sword, stone-hammer, torch, bread.
// A tool rides the right shoulder pivot at the fist. Grip styles:
//   'extend' (sword, hammer): the tool continues the arm, so in the classic toolHold pose (arm straight
//            forward, 90°) it points straight ahead, like the block game's classic sword.
//   'upright' (torch): stays vertical when the arm is raised to toolHold.
//   'hold' (bread): rests across the fist.
// The stone-hammer is the episode's twist prop: the sword's hilt and a short stub of blade, sunk in a
// giant block of rock. Scale it boldly.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const TOOLS = ['sword', 'hammer', 'torch', 'bread'];
export const HAND = [0, -1.84, 0];                         // fist centre in shoulder-pivot coordinates
const cache = new Map();
const c = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const mat = (col, extra = {}) => c('m:' + col + JSON.stringify(extra), () => new T.MeshPhongMaterial({color: col, shininess: 40, specular: '#555555', flatShading: true, ...extra}));
const put = (p, g, m, at, rot = [0, 0, 0]) => { const x = new T.Mesh(g, m); x.position.set(...at); x.rotation.set(...rot); x.castShadow = true; p.add(x); return x; };

// Sword parts, built along -Y from the fist (grip at 0).
function swordParts(grp, {blade = 2.6, steel = '#d7dde6'} = {}) {
  put(grp, c('hilt', () => new T.CylinderGeometry(.09, .09, .5, 6)), mat('#6b4428'), [0, .05, 0]);
  put(grp, c('pommel', () => new T.IcosahedronGeometry(.13, 0)), mat('#f2c230'), [0, .33, 0]);
  put(grp, c('guard', () => new T.BoxGeometry(.16, .13, .8)), mat('#f2c230'), [0, -.26, 0]);
  if (blade > 0) {
    put(grp, c('blade' + blade, () => new T.BoxGeometry(.06, blade, .26)), mat(steel), [0, -.33 - blade / 2, 0]);   // flat of the blade faces sideways, so a held sword reads in profile
    put(grp, c('tip', () => { const g = new T.ConeGeometry(.17, .34, 4); g.rotateZ(Math.PI); g.rotateY(Math.PI / 4); g.scale(.35, 1, 1); return g; }), mat(steel), [0, -.33 - blade - .16, 0]);
  }
}

// A chunky, faceted boulder (one merged mesh), grey-blue stone.
function boulderGeometry() {
  return c('boulder', () => {
    const core = new T.BoxGeometry(1.7, 1.5, 1.5), chunks = [];
    const add = (w, h, d, at, rot) => { const b = new T.BoxGeometry(w, h, d); b.rotateX(rot[0]); b.rotateY(rot[1]); b.rotateZ(rot[2]); b.translate(...at); chunks.push(b); };
    add(1.2, .9, 1.2, [.3, .55, .2], [.2, .3, .1]); add(1.0, 1.0, .9, [-.45, -.3, .35], [-.15, .5, .2]); add(.9, .8, 1.0, [.2, -.5, -.4], [.3, -.2, -.25]);
    const g = mergeGeometries([core, ...chunks].map(x => x.toNonIndexed())); g.computeVertexNormals(); return g;
  });
}

const BUILD = {
  sword: o => { const grp = new T.Group(); swordParts(grp, o); grp.userData.grip = 'extend'; return grp; },
  hammer: o => {
    const grp = new T.Group(); swordParts(grp, {blade: .5});
    put(grp, boulderGeometry(), mat(o.stone ?? '#7f8a99'), [0, -1.55, 0], [.1, .4, .05]).scale.setScalar(o.scale ?? 1);
    grp.userData.grip = 'extend'; return grp;
  },
  torch: () => {
    const grp = new T.Group();
    put(grp, c('torch_stick', () => new T.BoxGeometry(.16, 1.3, .16)), mat('#6b4428'), [0, .35, 0]);
    put(grp, c('torch_cup', () => new T.CylinderGeometry(.22, .14, .22, 6)), mat('#3b3f46'), [0, 1.0, 0]);
    put(grp, c('torch_flame', () => new T.ConeGeometry(.2, .55, 5)), mat('#ffb02e', {emissive: '#ff7a00', emissiveIntensity: .9}), [0, 1.34, 0]);
    grp.userData.grip = 'upright'; return grp;
  },
  bread: () => {
    const grp = new T.Group();
    const loaf = put(grp, c('loaf', () => { const g = new T.CapsuleGeometry(.24, .62, 2, 6); g.rotateZ(Math.PI / 2); return g; }), mat('#d9984a'), [0, -.12, .18]);
    for (const x of [-.2, 0, .2]) put(loaf, c('score', () => new T.BoxGeometry(.05, .04, .3)), mat('#a8692e'), [x, .23, 0], [0, .4, 0]);
    grp.userData.grip = 'hold'; return grp;
  },
};

export function attachTool(actor, name, opts = {}) {
  if (!BUILD[name]) throw Error('unknown tool ' + name);
  if (actor.tool) actor.tool.removeFromParent();
  const t = BUILD[name](opts); t.name = 'tool_' + name; t.position.set(...HAND);
  // 'upright' tools are authored vertical; in toolHold the arm is rotated -90° about x, so pre-rotate.
  if (t.userData.grip === 'upright') t.rotation.x = Math.PI / 2;
  actor.pivots.rightShoulder.add(t); actor.tool = t; actor.toolName = name; return t;
}
