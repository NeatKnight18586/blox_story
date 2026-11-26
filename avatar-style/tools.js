// avatar-style/tools.js — hand-held tools (docs/V2_BRIEF.md §6.4): sword, stone-hammer, torch, bread.
// A tool rides the right shoulder pivot at the fist. Grip styles:
//   'extend' (sword, hammer): the tool continues the arm, so in the classic toolHold pose (arm straight
//            forward, 90°) it points straight ahead, like the block game's classic sword.
//   'upright' (torch): stays vertical when the arm is raised to toolHold.
//   'hold' (bread): rests across the fist.
// The stone-hammer is the episode's twist prop: the sword's hilt and a short stub of blade, sunk in a
// giant block of rock. Scale it boldly.
import * as T from 'three';
import {eggMesh, EGG_R, EGG_HOLD} from '../parts/eggs.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {blasterTool} from '../parts/sets4/props5.js';
import {sword as propSword, heroStone as propHeroStone, classSword as propClassSword} from '../parts/props.js';

import {megaphone} from './governor.js';
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
  // Sword and hammer come from the shared prop builder (parts/props.js), so the hammer is visibly the same stone
  // and the same sword as the hero's stone in the field (A1 continuity). Guard just below the fist, grip in it.
  sword: o => { const grp = new T.Group(), s = propSword({tier: 'hero', blade: o.blade ?? 2.6}); s.position.y = -.26; grp.add(s); grp.userData.grip = 'extend'; return grp; },
  hammer: o => {
    const grp = new T.Group(), s = propSword({tier: 'hero', blade: .55}); s.position.y = -.26; grp.add(s);
    const k = o.scale ?? .8, st = propHeroStone({dirt: false}), rock = st.rock;   // socket at the blade's end
    rock.scale.setScalar(k); rock.position.set(0, -.26 - .5 - st.socketTop * k, .2 * k); grp.add(rock);
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

// A tool positioned at the fist, not yet attached (either hand's shoulder pivot can take it).
// Class swords (Amendment A3): tool name 'class:<cls>' or 'class:<cls>:bg' (background tier), held like the sword.
function classTool(name) {
  const [, cls, tier = 'hero'] = name.split(':'), grp = new T.Group(), s = propClassSword(cls, {tier});
  // flat face forward (a raised class blade shows its full silhouette to the viewer), 1.2× for phone-size reads
  s.position.y = -.26; s.rotation.y = Math.PI / 2; s.scale.setScalar(1.2); grp.add(s); grp.userData.grip = 'extend'; grp.userData.cls = cls; return grp;
}
// Eggs (Season 1 ep. 1, parts/eggs.js): tool name 'egg:<design>' or 'egg:<design>:<warm 0..1>' (the Plain egg's glow), held in the fist.
function eggTool(name) {
  // the tool rides the right fist; the egg is placed so that, in the eggHold pose, it sits centred between both fists
  // (actor x = 0), a little above them: the arm rotation is undone for that offset (pure trigonometry, see EGG_HOLD)
  const [, design, warm] = name.split(':'), grp = new T.Group(), e = eggMesh(design, {r: EGG_R.held, warm: warm === undefined ? null : +warm, rim: true});
  const {alpha, theta} = EGG_HOLD.eggHold, R = new T.Matrix4().makeRotationFromEuler(new T.Euler(-alpha, 0, -theta));
  const fist = new T.Vector3(...HAND).applyMatrix4(R).add(new T.Vector3(1.51, 4.02, 0));   // fist in actor space (right shoulder pivot)
  const want = new T.Vector3(0, fist.y + EGG_R.held * 1.15, fist.z + .1), d = want.sub(fist).applyMatrix4(R.clone().transpose());
  e.position.copy(d); grp.add(e); grp.userData.grip = 'hold'; return grp;
}
// An armful of eggs (opt-in, owner 2026-11-14): 'eggs:<d1>,<d2>,…' (2–5 designs): a heap at the eggHold spot, 0.8 × held size.
function eggsTool(name) {
  const designs = name.slice(5).split(','), grp = eggTool('egg:' + designs[0]), base = grp.children[0], r = EGG_R.held * .8, k = designs.length;
  base.scale.setScalar(.8); const at = base.position.clone();
  const spots = [[-.95, -.15, 0], [.95, -.15, 0], [0, -.4, 1.0], [0, .55, -.6], [.5, .3, .8]];   // a low heap: no egg above the chin (owner pass 2)
  designs.slice(1).forEach((d, i) => { const e = eggMesh(d, {r, rim: true}); const [x, y, z] = spots[i]; e.position.set(at.x + x * r * 1.4, at.y + y * r * 1.2, at.z + z * r); e.rotation.z = (i % 2 ? -.35 : .35); grp.add(e); });
  base.position.y -= r * .2; grp.userData.eggs = k; return grp;
}
BUILD.megaphone = megaphone;   // Phase 1F: the Governor's golden megaphone ('extend' grip)
export function buildTool(name, opts = {}) {
  if (!BUILD[name] && !name.startsWith('class:') && !name.startsWith('egg:') && !name.startsWith('eggs:') && !name.startsWith('blaster:')) throw Error('unknown tool ' + name);
  const t = name.startsWith('blaster:') ? blasterTool(+name.split(':')[1], +(name.split(':')[2] ?? 1)) : name.startsWith('class:') ? classTool(name) : name.startsWith('eggs:') ? eggsTool(name) : name.startsWith('egg:') ? eggTool(name) : BUILD[name](opts); t.name = 'tool_' + name; t.position.set(...HAND);
  // 'upright' tools are authored vertical; in toolHold the arm is rotated -90° about x, so pre-rotate.
  if (t.userData.grip === 'upright') t.rotation.x = Math.PI / 2;
  return t;
}
export function attachTool(actor, name, opts = {}) {
  if (actor.tool) actor.tool.removeFromParent();
  const t = buildTool(name, opts);
  actor.pivots.rightShoulder.add(t); actor.tool = t; actor.toolName = name; return t;
}
