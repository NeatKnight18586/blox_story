// stories/egg/world.js — Season 1 episode 01 `egg` (card 01, stories/egg/beats.md). Grown from the A4 look test
// (engine/fixtures/looktest/egg.js): a base town at night. A round square (clock tower at 11:59 + town hall with a dragon
// weathervane = clue 1, the scoreboard on its front) ringed by 12 themed bases; claw marks on the clock-tower roof = clue 2.
// Nine original eggs (parts/eggs.js), one kind per base; the mayor's observatory keeps the only Cosmic egg; Kit's base is
// a mat and a sorry note. Off-map sets: Dax's bedroom (empty bed, one giant feather) and the cloudtop nest the size of the
// town (money shot), high in the north sky. No labels (SEASON_1.md §2c): the only text is on the scoreboard and the note.
// Ground plan: square centre (0,0) r 18, ring road r 33, bases on r 47, pond (52,44); north = −z; bedroom at (160,0,160);
// nest at (0,118,-240). Palette: plaster cream, slate roofs, team colours on doors/pads, egg colours as the night's lights.
// World state (spec.worldState): board 'race' | 'hatched' · clock '1159' | '12' · nestKids true/false.
import * as T from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {eggMesh, nestMesh, EGGS, EGG_R, eggRadius} from '../../parts/eggs.js';

export const TEAM = ['#e4574a', '#f2b632', '#2f80d1', '#9b59b6', '#1fb5a8', '#ff7aa8', '#7fc241', '#ff8c2e', '#4ad8ff', '#c0392b', '#f2e14a', '#8a6be8'];
// base i → egg design (base 0 = Kit's empty base, south; base 6 = the mayor's observatory, north)
export const BASE_EGG = ['plain', 'ember', 'frost', 'moss', 'tide', 'geode', 'cosmic', 'storm', 'sprinkle', 'ember', 'frost', 'sprinkle'];
export const LOOK = {fog: {color: '#2f5a86', near: 90, far: 380, height: {base: 0, falloff: 5, amount: .26, near: 30}}, envPreset: 'nightBright', envIntensity: .5, cloudCover: .55, moon: {az: 110, el: 18, size: 3.2}, starDensity: 1.6};
export const LAYER = {plaza: .14, road: .1};
const DIM = .6, SQ = 18, ROAD = 33, BASE_R = 47, POND = [52, 44], ROOM = [160, 0, 160], NEST = [0, 118, -240];
export const basePos = i => { const a = (i + .5) / 12 * Math.PI * 2; return {i, a, x: Math.sin(a) * BASE_R, z: Math.cos(a) * BASE_R, yaw: a + Math.PI}; };

let halo = null;
function haloTex() {
  if (halo || typeof document === 'undefined') return halo; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.4, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); halo = new T.CanvasTexture(c); return halo;
}
const glow = (color, s) => { const m = new T.Sprite(new T.SpriteMaterial({map: haloTex(), color, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false})); m.scale.setScalar(s); m.renderOrder = 3; return m; };
// In-world text (scoreboard, note): a canvas on a plane, redrawn only when its text changes.
function textPanel(w, h, px = 64) {
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null; if (c) { c.width = w * px; c.height = h * px; }
  const tex = c ? new T.CanvasTexture(c) : null; if (tex) tex.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({map: tex, toneMapped: false}));
  let last = null; return {mesh, draw(key, fn) { if (!c || key === last) return; last = key; fn(c.getContext('2d'), c.width, c.height); tex.needsUpdate = true; }};
}

export function build(scene, {P, B, A, M, PR, TR, BI, V, W, look, spec}) {
  const state = {};
  const R = B.rng(11), anchors = {}, movers = [], hero = new T.Group(); hero.name = 'hero';
  const dim = (c, k = DIM) => '#' + new T.Color(c).multiplyScalar(k).getHexString(), DIMMED = ['plaster', 'concrete', 'cobble', 'asphalt', 'brick'];
  const mt = (pattern, color, o = {}) => M.std(pattern, DIMMED.includes(pattern) ? dim(color) : color, o);
  const bases = Array.from({length: 12}, (_, i) => basePos(i));
  // ---- ground: suburb terrain, pads under every base, the pond --------------------------------------------------------
  const bio0 = BI.biome('suburb'), bio = {...bio0, terrain: {...bio0.terrain, layers: bio0.terrain.layers.map(l => ({...l, color: dim(l.color)}))}};
  const controls = [{type: 'noise', amp: 1.2, scale: 45, octaves: 3}, {type: 'hill', at: [-120, -60], r: 90, h: 22}, {type: 'hill', at: [130, -40], r: 80, h: 18}, {type: 'ridge', from: [-200, -170], to: [200, -150], w: 70, h: 26},
    {type: 'hill', at: [-90, 110], r: 70, h: 12}, {type: 'pad', x0: -SQ - 2, x1: SQ + 2, z0: -SQ - 8, z1: SQ + 2, y: 0, blend: 14}, {type: 'pad', x0: ROOM[0] - 14, x1: ROOM[0] + 14, z0: ROOM[2] - 14, z1: ROOM[2] + 14, y: 0, blend: 6},
    ...bases.map(b => ({type: 'pad', x0: b.x - 8, x1: b.x + 8, z0: b.z - 8, z1: b.z + 8, y: .4 + (b.i % 3) * .3, blend: 8})),
    {type: 'valley', from: [POND[0] - 8, POND[1]], to: [POND[0] + 10, POND[1] + 6], w: 16, depth: 3.2}];
  const groundY = TR.heightFn({seed: 5, controls});
  scene.add(TR.buildTerrain({height: groundY, size: 660, chunk: 30, fine: 1.5, fullR: 30, focus: (spec.focus ?? [[0, 30], [12, 46], [-12, -46], [0, -24]]).concat([[ROOM[0], ROOM[2]]]),
    material: M.splatMaterial(bio.terrain.layers, {splat: bio.terrain, wetY: -1.1}), splat: bio.terrain}));
  const wat = W.water({height: groundY, x0: POND[0] - 22, x1: POND[0] + 24, z0: POND[1] - 14, z1: POND[1] + 18, y: -1.1, ...bio.water, sky: '#3a5aa0', foam: .1, envMap: look.envMap?.()}); scene.add(wat.mesh); movers.push(wat);
  const avoid = (x, z) => Math.hypot(x, z) < ROAD + 6 || bases.some(b => Math.hypot(x - b.x, z - b.z) < 11) || Math.hypot(x - POND[0], z - POND[1]) < 16 || (Math.abs(x - ROOM[0]) < 30 && Math.abs(z - ROOM[2]) < 30);
  const veg = V.vegetation({height: groundY, veg: {...bio.vegetation, flowerColors: ['#ffffff', '#9fc2ff', '#ffd23f']}, area: {x0: -150, x1: 150, z0: -150, z1: 130}, seed: 9, avoid, focus: [[0, 30], [12, 46]], nearR: 26, waterY: -1.1, shadowR: 30});
  scene.add(veg.group); movers.push(veg);
  const plaza = P.cylinder(SQ, .4, {seg: 40, mat: mt('cobble', '#a39d92'), name: 'plaza'}); plaza.position.set(0, groundY(0, 0) + LAYER.plaza - .2, 0); scene.add(plaza);
  const ring = new T.EllipseCurve(0, 0, ROAD, ROAD, 0, Math.PI * 2), road = new T.CatmullRomCurve3(ring.getPoints(64).map(p => new T.Vector3(p.x, 0, p.y)), true);
  scene.add(B.ribbon(road, 8, (x, z) => groundY(x, z) + LAYER.road, {material: mt('asphalt', '#5a5d66'), tile: 6}));
  for (const k of [0, 3, 6, 9]) { const a = (k + .5) / 12 * Math.PI * 2, c = new T.LineCurve3(new T.Vector3(Math.sin(a) * (SQ - 1), 0, Math.cos(a) * (SQ - 1)), new T.Vector3(Math.sin(a) * (ROAD - 3), 0, Math.cos(a) * (ROAD - 3))); scene.add(B.ribbon(c, 5, (x, z) => groundY(x, z) + LAYER.road + .02, {material: mt('concrete', '#a8a49a')})); }
  // ---- themed bases: house + door + lock ring + nest with its egg + rarity beam + one theme detail ---------------------
  const win = new T.MeshPhongMaterial({color: '#2a3550', emissive: '#ffc46b', emissiveIntensity: .7, shininess: 80}), locks = [], eggs = [], nestEggs = {}; let door10 = null;
  const theme = (g, kind, d) => {
    const at = (x, z) => [x, 0, d / 2 + z];
    const em = c => new T.MeshPhongMaterial({color: c, emissive: c, emissiveIntensity: 1.1, flatShading: true});
    if (kind === 'ember') for (let k = 0; k < 5; k++) { const r = new T.Mesh(new T.DodecahedronGeometry(.6 + R() * .4, 0), k ? mt('rock', '#3a3330') : em('#ff6a1a')); r.position.set(...at(-4 + k * .9, 2 + R())); r.position.y = .5; g.add(r); }
    if (kind === 'frost') { const s = P.block([7, .12, 4], {at: [0, .07, d / 2 + 2.6], mat: mt('snow', '#e8f2ff')}); g.add(s); for (let k = 0; k < 6; k++) { const c = new T.Mesh(new T.ConeGeometry(.12, .7, 4), em('#bfe6ff')); c.position.set(-3 + k * 1.2, 2.6, d / 2 + .5); c.rotation.x = Math.PI; g.add(c); } }
    if (kind === 'moss') for (let k = 0; k < 4; k++) { const st = P.cylinder(.12, .5, {at: [-3.6 + k * .7, .25, d / 2 + 3], mat: mt('plastic', '#efe6d0')}); const cap = new T.Mesh(new T.SphereGeometry(.4, 8, 4, 0, 6.3, 0, 1.6), em(k % 2 ? '#e24a4a' : '#ffb03a')); cap.position.set(-3.6 + k * .7, .55, d / 2 + 3); g.add(st, cap); }
    if (kind === 'tide') { g.add(P.block([7, .1, 4], {at: [0, .06, d / 2 + 2.6], mat: mt('sand', '#d9c79a')})); const pool = new T.Mesh(new T.CircleGeometry(1.2, 16), new T.MeshPhongMaterial({color: '#2a8fb0', emissive: '#1f6f93', emissiveIntensity: .6, shininess: 90})); pool.rotation.x = -Math.PI / 2; pool.position.set(-3, .14, d / 2 + 2.6); g.add(pool); }
    if (kind === 'geode') for (let k = 0; k < 5; k++) { const c = new T.Mesh(new T.OctahedronGeometry(.4, 0), em('#c45cff')); c.scale.set(1, 2 + R() * 1.5, 1); c.position.set(-4 + k * .5, .8, d / 2 + 2.5 + R()); c.rotation.z = (R() - .5) * .6; g.add(c); }
    if (kind === 'sprinkle') { for (let k = 0; k < 6; k++) g.add(P.block([1.1, .1, 4], {at: [-3 + k * 1.15, .06, d / 2 + 2.6], mat: mt('plastic', k % 2 ? '#ffffff' : '#ff7aa8')})); for (const sx of [-4.5, 4.5]) { g.add(P.cylinder(.08, 2.4, {at: [sx, 1.2, d / 2 + 4.6], mat: mt('plastic', '#ffffff')})); const pop = new T.Mesh(new T.SphereGeometry(.5, 10, 6), em('#ff5aa8')); pop.position.set(sx, 2.6, d / 2 + 4.6); g.add(pop); } }
    if (kind === 'storm') { const v = new T.Mesh(new T.BoxGeometry(2, .1, .4), em('#ffe14a')); v.position.set(0, 12.2, 0); v.name = 'spin'; g.add(v, P.cylinder(.06, 2, {at: [0, 11.2, 0], mat: mt('metal', '#3a3d44')})); movers.push({update: t => { v.rotation.y = Math.sin(t * .7) * 2; }}); }
    if (kind === 'plain') { g.add(P.block([2.4, .06, 1.6], {at: [0, .05, d / 2 + 2.2], mat: mt('plastic', '#8a6a4a')})); const note = textPanel(1.1, .8); note.draw('SORRY', (x, w, h) => { x.fillStyle = '#fbf6e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3a48'; x.font = `bold ${h * .38}px "Lilita One", Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SORRY', w / 2, h / 2); });
      note.mesh.rotation.x = -Math.PI / 2 + .25; note.mesh.position.set(.4, .14, d / 2 + 2.2); note.mesh.name = 'sorryNote'; g.add(note.mesh); }
  };
  function base(b) {
    const g = new T.Group(), c = TEAM[b.i], kind = BASE_EGG[b.i], w = 10 + (b.i % 3), d = 8, h = 6.5 + (b.i % 2) * 2;
    g.add(P.block([w + .6, .8, d + .6], {at: [0, .4, 0], mat: mt('concrete', '#9a978f'), cast: true}), P.block([w, h, d], {at: [0, .8 + h / 2, 0], mat: mt('plaster', '#efe4cf'), cast: true}));
    if (kind === 'cosmic') { const dome = new T.Mesh(new T.SphereGeometry(w / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mt('metal', '#7a86a8')); dome.position.y = .8 + h; dome.castShadow = true; g.add(dome);
      const slot = P.block([1.2, w / 2 - .3, .4], {at: [0, .8 + h + w / 4, w / 2 - .6], mat: new T.MeshBasicMaterial({color: '#0d0d24'})}); g.add(slot); }
    else { const roof = P.gableRoof(w, d, 3, {mat: mt('roofTile', '#5f7898'), cast: true}); roof.position.y = .8 + h; g.add(roof); }
    for (const sx of [-1, 1]) g.add(P.block([.6, h, .6], {at: [sx * w / 2, .8 + h / 2, d / 2], mat: mt('plastic', c)}));
    if (b.i === 10) {   // S07: a hinged door that slams, and a lock ring round the door frame that fills like a timer
      const hinge = new T.Group(); hinge.position.set(-1.8, 0, d / 2 + .1); hinge.add(P.block([3.6, 5, .3], {at: [1.8, 3.3, 0], mat: mt('woodPlanks', c), cast: true})); g.add(hinge);
      g.add(P.block([4.4, 5.6, .1], {at: [0, 3.1, d / 2 + .02], mat: new T.MeshBasicMaterial({color: '#151018'})}));   // dark doorway behind the door
      // owner pass 2: a real lock — a round brass dial on the door (its pointer sweeps like a 60 s timer) and a bolt that slides into the frame
      const brass = new T.MeshPhongMaterial({color: '#f2c45a', emissive: '#c8921e', emissiveIntensity: 1.0, shininess: 90});
      const dial = new T.Group(); dial.name = 'lockDial'; dial.position.set(2.7, 3.3, .3); hinge.add(dial);
      const face = new T.Mesh(new T.CylinderGeometry(.75, .75, .18, 24), brass); face.rotation.x = Math.PI / 2; dial.add(face);
      const face2 = new T.Mesh(new T.CircleGeometry(.58, 24), new T.MeshBasicMaterial({color: '#fff6dc'})); face2.position.z = .1; dial.add(face2);
      const ptr = new T.Mesh(new T.BoxGeometry(.1, .52, .04), new T.MeshBasicMaterial({color: '#1c1c22'})); ptr.geometry.translate(0, .26, 0); ptr.position.z = .13; dial.add(ptr);
      const bolt = new T.Mesh(new T.BoxGeometry(1.4, .32, .26), brass); bolt.position.set(3.0, 2.3, .32); hinge.add(bolt);
      const keep = P.block([.5, .7, .4], {at: [2.25, 2.3, d / 2 + .35], mat: brass}); g.add(keep);
      door10 = {hinge, ptr, bolt};
    } else g.add(P.block([3.6, 5, .3], {at: [0, 3.3, d / 2 + .1], mat: b.i === 4 ? mt('woodPlanks', '#e0b27a', {emissive: '#5a3a1a'}) : mt('woodPlanks', c), cast: true}));   // base 4: a natural wooden door for the claw marks
    for (const sx of [-1, 1]) { const m = new T.Mesh(new T.BoxGeometry(2, 2, .2), win); m.position.set(sx * (w / 2 - 2.2), 4.2, d / 2 + .12); g.add(m); }
    const lock = new T.Mesh(new T.RingGeometry(1.6, 2.3, 32, 1, 0, .01), new T.MeshBasicMaterial({color: c, toneMapped: false, side: T.DoubleSide})); lock.rotation.x = -Math.PI / 2; lock.position.set(0, .07, d / 2 + 3.2); g.add(lock); locks.push({lock, phase: b.i * .37});
    const er = eggRadius(kind), nest = nestMesh(er * 1.6); nest.position.set(3.2, .5, d / 2 + 1.8); g.add(nest);
    if (kind !== 'plain') { const e = eggMesh(kind, {r: er, beam: true}); e.position.set(3.2, .55 + er * 1.15, d / 2 + 1.8); e.name = 'nestEgg_' + kind; g.add(e); eggs.push(e); { const gl = glow(EGGS[kind].detail, 7); gl.position.set(3.2, .6 + er * 1.2, d / 2 + 1.8); g.add(gl); } }
    if (kind !== 'plain') nestEggs[b.i] = g.getObjectByName('nestEgg_' + kind);
    if ([1, 2, 4, 5, 7, 8, 11].includes(b.i)) {   // owner fix pass: nests on the rooftops, each with a glowing egg (S24 "the town is full of eggs")
      const rk = BASE_EGG[(b.i + 4) % 12] === 'plain' ? 'moss' : BASE_EGG[(b.i + 4) % 12], rn = nestMesh(EGG_R.nest * 1.7); rn.position.set(-w / 4, .8 + h + 2.3, 0); g.add(rn);
      const re = eggMesh(rk, {r: EGG_R.nest}); re.position.set(-w / 4, .8 + h + 2.4 + EGG_R.nest * 1.1, 0); re.name = 'roofEgg_' + b.i; g.add(re); eggs.push(re);
      const gl = glow(EGGS[rk].detail, 5); gl.position.copy(re.position); g.add(gl); }
    if (b.i === 4) {   // owner pass 2, clue 2: three deep gouges torn into the wooden door (dark inside, splintered light edges), a handle
      const cl = new T.Group(); cl.name = 'clawMarks'; const dark = new T.MeshBasicMaterial({color: '#160b05'}), lite = new T.MeshPhongMaterial({color: '#f4dcae', emissive: '#6a5030', emissiveIntensity: .4, flatShading: true});
      for (const [x, k] of [[-.95, 0], [0, 1], [.95, 2]]) { const gg = new T.Group(); gg.position.set(x, 3.4, d / 2 + .27); gg.rotation.z = .32;
        gg.add(P.block([.42, 3.4 - k * .25, .06], {at: [0, 0, 0], mat: dark}));
        for (const sx of [-1, 1]) { gg.add(P.block([.09, 3.3 - k * .25, .1], {at: [sx * .27, 0, .02], mat: lite})); for (let j = 0; j < 3; j++) { const sp = new T.Mesh(new T.ConeGeometry(.07, .5, 3), lite); sp.position.set(sx * .32, -1 + j * .9, .05); sp.rotation.z = sx * 1.1; gg.add(sp); } }
        cl.add(gg); }
      for (let k = 0; k < 7; k++) cl.add(P.block([3.5, .04, .02], {at: [0, 1.2 + k * .62, d / 2 + .26], mat: new T.MeshBasicMaterial({color: '#3a2412'})}));   // wood grain
      const knob = new T.Mesh(new T.SphereGeometry(.26, 12, 8), new T.MeshPhongMaterial({color: '#d9a640', emissive: '#5a3a10', emissiveIntensity: .5, shininess: 90})); knob.position.set(1.35, 2.9, d / 2 + .45); cl.add(knob);
      g.add(cl); }
    theme(g, kind, d);
    g.position.set(b.x, groundY(b.x, b.z), b.z); g.rotation.y = b.yaw; g.name = 'base_' + b.i + '_' + kind; return g;
  }
  // ---- clock tower (11:59, strikes twelve) + town hall (weathervane dragon, scoreboard) --------------------------------
  const hands = [];
  function clockTower() {
    const g = new T.Group(), H = 30; g.name = 'clockTower';
    g.add(P.block([8, 1.4, 8], {at: [0, .7, 0], mat: mt('concrete', '#8f8a82'), cast: true}), P.block([6.4, H, 6.4], {at: [0, 1.4 + H / 2, 0], mat: mt('brick', '#a86b55'), cast: true}));
    for (const y of [10, 20]) g.add(P.block([7, .6, 7], {at: [0, y, 0], mat: mt('concrete', '#c9c2b4')}));
    g.add(P.block([7.4, 6, 7.4], {at: [0, H - 1, 0], mat: mt('plaster', '#e9dfc9'), cast: true}));
    const face = new T.MeshPhongMaterial({color: '#fff6dc', emissive: '#ffe7a8', emissiveIntensity: .8}), hand = new T.MeshBasicMaterial({color: '#1c1c22'});
    for (let k = 0; k < 4; k++) {
      const f = new T.Group(); f.add(new T.Mesh(new T.CircleGeometry(2.4, 32), face));
      for (let q = 0; q < 12; q++) { const tk = new T.Mesh(new T.BoxGeometry(.12, .4, .03), hand); tk.position.set(Math.sin(q * Math.PI / 6) * 2.05, Math.cos(q * Math.PI / 6) * 2.05, .03); tk.rotation.z = -q * Math.PI / 6; f.add(tk); }
      const hh = new T.Mesh(new T.BoxGeometry(.3, 1.4, .05), hand); hh.geometry.translate(0, .7, 0); hh.position.z = .05; f.add(hh);
      const mh = new T.Mesh(new T.BoxGeometry(.2, 2.1, .05), hand); mh.geometry.translate(0, 1.05, 0); mh.position.z = .07; f.add(mh); hands.push({hh, mh});
      f.position.set(Math.sin(k * Math.PI / 2) * 3.75, H - 1, Math.cos(k * Math.PI / 2) * 3.75); f.rotation.y = k * Math.PI / 2; f.name = k === 0 ? 'clockFace' : 'clockFace' + k; g.add(f);
    }
    const roof = P.cone(5.6, 9, {seg: 4, mat: mt('roofTile', '#4f6688'), cast: true}); roof.position.y = H + 6.5; roof.rotation.y = Math.PI / 4; g.add(roof);
    return g;   // (owner pass 2: the claw marks moved to base 4's door)
  }
  const board = textPanel(8, 5.2, 48);
  function townHall() {
    const g = new T.Group(), w = 24, d = 12, h = 10; g.name = 'townHall';
    g.add(P.block([w + 2, 1.2, d + 2], {at: [0, .6, 0], mat: mt('concrete', '#a7a299'), cast: true}), P.block([w, h, d], {at: [0, 1.2 + h / 2, 0], mat: mt('plaster', '#e6dcc6'), cast: true}));
    for (let i = 0; i < 6; i++) g.add(P.cylinder(.7, h, {at: [-w / 2 + 2 + i * (w - 4) / 5, 1.2 + h / 2, d / 2 + 1.2], seg: 10, mat: mt('concrete', '#f0e9da'), cast: true}));
    const roof = P.gableRoof(w + 2, d + 3, 4, {mat: mt('roofTile', '#5f7898'), cast: true}); roof.position.set(0, 1.2 + h, .6); g.add(roof);
    const vane = new T.Shape([[0, 0], [1.2, .5], [2.2, 0], [2.6, .9], [1.9, 1.1], [2.2, 1.8], [1.2, 1.1], [.5, 1.6], [.7, .8], [-.6, .7]].map(p => new T.Vector2(...p)));   // clue 1: a dragon
    const vm = new T.Mesh(new T.ExtrudeGeometry(vane, {depth: .12, bevelEnabled: false}), mt('metal', '#3c3f46')); vm.scale.setScalar(1.6); vm.position.set(-2, 1.2 + h + 6.3, .6); vm.name = 'weathervane'; g.add(vm, P.cylinder(.08, 2.4, {at: [0, 1.2 + h + 5.2, .6], mat: mt('metal', '#3c3f46')}));
    g.add(P.block([2.6, 2.0, .1], {at: [0, 2.7, d / 2 + .06], mat: new T.MeshBasicMaterial({color: '#1a1420'})}), P.block([3.2, .35, .8], {at: [0, 1.6, d / 2 + .3], mat: mt('concrete', '#f0e9da')}), P.block([3.2, .3, .3], {at: [0, 3.85, d / 2 + .15], mat: mt('concrete', '#f0e9da')}));   // S09: a window lead lifts an egg through
    board.mesh.position.set(0, 7.2, d / 2 + 2.1); board.mesh.name = 'scoreboard'; g.add(board.mesh, P.block([8.6, 5.8, .3], {at: [0, 7.2, d / 2 + 1.9], mat: mt('metal', '#2a2d34')}));
    return g;
  }
  const drawBoard = mode => board.draw(mode, (x, w, h) => {
    x.fillStyle = '#2f56a8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffd24a'; x.lineWidth = h * .03; x.strokeRect(h * .02, h * .02, w - h * .04, h - h * .04); x.textBaseline = 'middle'; const f = s => `${h * s}px "Lilita One", Arial`;
    x.fillStyle = '#ffd24a'; x.font = f(.16); x.textAlign = 'center'; x.fillText(mode === 'hatched' ? 'HATCHED' : 'STOLEN', w / 2, h * .13);
    const rows = mode === 'hatched' ? [['KIT', 1], ['DAX', 0], ['MAYOR', 0], ['NAN', 0]] : [['DAX', 200], ['MAYOR', 41], ['NAN', 17], ['KIT', 0]];
    rows.forEach(([n, v], k) => { const y = h * (.34 + k * .18); x.fillStyle = k === 0 ? '#ffffff' : '#c8d0e0'; x.font = f(.13); x.textAlign = 'left'; x.fillText(n, w * .1, y); x.textAlign = 'right'; x.fillText(String(v), w * .9, y); });
  });
  drawBoard('race');
  const lamp = () => { const g = new T.Group(); g.add(P.cylinder(.16, 5, {at: [0, 2.5, 0], seg: 6, mat: mt('metal', '#2e3138')})); const l = new T.Mesh(new T.BoxGeometry(.7, .9, .7), new T.MeshPhongMaterial({color: '#fff1c8', emissive: '#ffc46b', emissiveIntensity: 1.4})); l.position.y = 5.3; g.add(l); return g; };
  // ---- placement --------------------------------------------------------------------------------------------------------
  for (const b of bases) hero.add(base(b));
  const ct = clockTower(); ct.position.set(0, groundY(0, -SQ - 4), -SQ - 4); hero.add(ct);
  const th = townHall(); th.position.set(-22, groundY(-22, -SQ - 10), -SQ - 12); th.rotation.y = .5; hero.add(th);
  for (let i = 0; i < 8; i++) { const a = (i + .25) / 8 * Math.PI * 2, l = lamp(); l.position.set(Math.sin(a) * (SQ + 1), groundY(Math.sin(a) * (SQ + 1), Math.cos(a) * (SQ + 1)), Math.cos(a) * (SQ + 1)); hero.add(l); }
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4, bch = PR.smallProp('bench', i); bch.position.set(Math.sin(a) * (SQ - 3), groundY(0, 0) + .1, Math.cos(a) * (SQ - 3)); bch.rotation.y = a; bch.name = i === 0 ? 'bench' : 'bench' + i; hero.add(bch); }
  const benchEgg = eggMesh('tide', {r: EGG_R.nest}); benchEgg.position.set(Math.sin(.4) * (SQ - 3), groundY(0, 0) + 1.2, Math.cos(.4) * (SQ - 3)); benchEgg.name = 'benchEgg'; benchEgg.visible = false; scene.add(benchEgg);
  for (const [x, z] of [[-3.5, 14], [4.5, 12]]) { const l = new T.PointLight('#ffc27a', 9, 11, 2); l.position.set(x, groundY(x, z) + 4.2, z); scene.add(l); }   // warm practicals over the square (≤ 4 real lights)
  const plainNest = nestMesh(EGG_R.nest * 1.6); plainNest.position.set(14, groundY(14, 2) + .25, 2); scene.add(plainNest);   // the egg nobody wanted: a garden nest at the square's edge
  const plainEgg = eggMesh('plain', {r: EGG_R.nest}); plainEgg.position.set(14, groundY(14, 2) + .3 + EGG_R.nest * 1.15, 2); plainEgg.name = 'plainEggNest'; scene.add(plainEgg);
  // hot potato: eggs arcing hand to hand over the square (visible only while the town plays)
  const flyers = new T.Group(); flyers.name = 'flyingEggs'; flyers.visible = false; scene.add(flyers);
  const arcs = Array.from({length: 9}, (_, k) => { const e = eggMesh(['ember', 'frost', 'geode', 'storm', 'sprinkle', 'tide', 'moss', 'ember', 'storm'][k], {r: EGG_R.nest, rim: false}); flyers.add(e); const a0 = R() * 6.28, a1 = a0 + 1 + R() * 2; return {e, p0: [Math.sin(a0) * 12, Math.cos(a0) * 12], p1: [Math.sin(a1) * 12, Math.cos(a1) * 12], ph: R()}; });
  movers.push({update: t => { for (const a of arcs) { const u = (t * .7 + a.ph) % 1, x = a.p0[0] + (a.p1[0] - a.p0[0]) * u, z = a.p0[1] + (a.p1[1] - a.p0[1]) * u; a.e.position.set(x, groundY(x, z) + 3 + Math.sin(u * Math.PI) * 6, z); a.e.rotation.z = t * 5; } }});
  movers.push({update: t => { for (const l of locks) { const f = ((t * .45 + l.phase) % 1.4) / 1.2; l.lock.geometry.dispose(); l.lock.geometry = new T.RingGeometry(1.6, 2.3, 32, 1, 0, Math.max(.01, Math.min(1, f)) * Math.PI * 2); } for (const e of eggs) e.rotation.y = t * .4; }});
  // ---- Dax's bedroom (off-map interior): empty bed, a feather longer than Kit, an open window -------------------------------
  const room = new T.Group(); room.name = 'bedroom'; const ry = groundY(ROOM[0], ROOM[2]);
  room.add(P.block([14, .4, 12], {at: [0, .2, 0], mat: mt('woodPlanks', '#8a6040')}), P.block([14, 9, .4], {at: [0, 4.6, -6], mat: mt('plaster', '#c9d4e8')}), P.block([.4, 9, 12], {at: [-7, 4.6, 0], mat: mt('plaster', '#c9d4e8')}));
  // owner fix pass: a real bed (posts, rails, headboard, footboard, mattress, pillow, a rumpled blanket) and a soft gold-orange
  // feather longer than Kit (5.6 vs her 4.35) lying across it
  const wood = mt('woodPlanks', '#7a4a2c'), bz = -1.6;
  for (const [x, z, hgt] of [[-2.3, bz - 3.7, 5.2], [2.3, bz - 3.7, 5.2], [-2.3, bz + 3.7, 2.6], [2.3, bz + 3.7, 2.6]]) room.add(P.block([.45, hgt, .45], {at: [x, .4 + hgt / 2, z], mat: wood, cast: true}));
  room.add(P.block([4.6, 2.6, .3], {at: [0, 3.3, bz - 3.7], mat: wood, cast: true}), P.block([4.6, 1.1, .3], {at: [0, 2.2, bz + 3.7], mat: wood, cast: true}));
  for (const x of [-2.3, 2.3]) room.add(P.block([.3, .6, 7.4], {at: [x, 1.3, bz], mat: wood}));
  room.add(P.block([4.2, .7, 7.1], {at: [0, 1.9, bz], mat: mt('plastic', '#f4f1ea'), cast: true}), P.block([2.6, .6, 1.3], {at: [0, 2.55, bz - 2.9], mat: mt('plastic', '#ffffff'), cast: true}));
  const blanket = P.block([4.5, .25, 4.6], {at: [0, 2.35, bz + 1.15], mat: mt('plastic', '#3f6fb8'), cast: true}); room.add(blanket); room.add(P.block([4.5, .32, .8], {at: [0, 2.42, bz - 1.2], rot: [-8, 0, 0], mat: mt('plastic', '#f2d16b')}), P.block([4.4, 1.1, .2], {at: [2.32, 1.8, bz + 1.6], rot: [0, 0, 14], mat: mt('plastic', '#3f6fb8')}));   // folded edge + a corner hanging off the side
  const windowHole = new T.Mesh(new T.PlaneGeometry(3.4, 3.4), new T.MeshBasicMaterial({color: '#1b2f5a'})); windowHole.position.set(3.5, 5.4, -5.78); room.add(windowHole);
  const feather = new T.Group(); feather.name = 'feather';
  { // owner pass 2: ONE long feather — an ivory quill down the middle, smooth soft vanes either side (gold at the quill → orange at the
    // edge), a gentle curve, laid across the bed and swaying a little
    const L = 5.6, vane = side => { const sh = new T.Shape(); sh.moveTo(0, .2); for (let k = 1; k <= 20; k++) { const u = k / 20, wdt = 1.05 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), .7) * (1 - .35 * u); sh.lineTo(side * wdt, .2 + u * (L - .4)); } sh.lineTo(0, L); sh.lineTo(0, .2); return sh; };
    for (const side of [-1, 1]) { const gg = new T.ShapeGeometry(vane(side), 2), pp = gg.attributes.position, cc = [];
      for (let i = 0; i < pp.count; i++) { const u = pp.getY(i) / L, x = Math.abs(pp.getX(i)), col = new T.Color('#ffe08a').lerp(new T.Color('#ff8a3a'), Math.min(1, x * .9 + u * .3)); cc.push(col.r, col.g, col.b); pp.setZ(i, .18 * Math.sin(u * Math.PI) - .12 * x * x); }
      gg.setAttribute('color', new T.Float32BufferAttribute(cc, 3)); gg.computeVertexNormals();
      const vm = new T.Mesh(gg, new T.MeshPhongMaterial({vertexColors: true, side: T.DoubleSide, emissive: '#ff9a3a', emissiveIntensity: .22, shininess: 20})); vm.rotation.x = -Math.PI / 2; vm.castShadow = true; feather.add(vm); }
    const quill = new T.Mesh(new T.CylinderGeometry(.035, .085, L + .6, 8), new T.MeshPhongMaterial({color: '#fff6dc', emissive: '#806a40', emissiveIntensity: .3})); quill.rotation.x = Math.PI / 2; quill.position.set(0, .06, -L / 2 + .1); feather.add(quill);
    movers.push({update: t => { feather.rotation.z = .05 * Math.sin(t * 1.3); feather.position.y = 2.62 + .04 * Math.sin(t * 1.7); }}); }
  feather.position.set(-.3, 2.62, bz + 2.2); feather.rotation.y = .42; room.add(feather);
  room.position.set(ROOM[0], ry, ROOM[2]); scene.add(room);
  // ---- cloudtop nest (money shot), rebuilt (owner fix pass): cloudtop biome at sunrise — three cloud layers to the horizon,
  // a large woven nest (thatch bowl + crossed sticks), the kids' ring inside (cast), hatched shells, warm sun ------------------
  const nest = new T.Group(); nest.name = 'cloudNest'; const cb = BI.biome('cloudtop');
  // owner pass 2: cloud puffs (clusters of blobs) with soft white tops and blue-grey undersides (vertex colour from the normal),
  // gaps between them showing the sky and the town far below, a warm sunrise wash on the sides
  const layer = (nc, r0, r1, y, size, seed) => { const RR = B.rng(seed), gs = [];
    for (let c = 0; c < nc; c++) { const a = RR() * Math.PI * 2, r = r0 + RR() * (r1 - r0), cx = Math.sin(a) * r, cz = Math.cos(a) * r, nb = 3 + Math.floor(RR() * 3);
      for (let i = 0; i < nb; i++) { const g0 = new T.IcosahedronGeometry(size * (.55 + RR() * .5), 2); g0.deleteAttribute('uv'); g0.deleteAttribute('normal'); const g = mergeVertices(g0);
        g.scale(1.5, .55 + RR() * .2, 1.5); g.translate(cx + (RR() - .5) * size * 2.2, y + RR() * size * .25, cz + (RR() - .5) * size * 2.2); gs.push(g); } }
    const geom = mergeGeometries(gs); geom.computeVertexNormals(); const nrm = geom.attributes.normal, cc = [], top = new T.Color('#ffffff'), side = new T.Color('#ffd6b4'), under = new T.Color('#8291b2');
    for (let i = 0; i < nrm.count; i++) { const ny = nrm.getY(i), c = ny >= 0 ? side.clone().lerp(top, Math.min(1, ny * 1.4)) : side.clone().lerp(under, Math.min(1, -ny * 1.3)); cc.push(c.r, c.g, c.b); }
    geom.setAttribute('color', new T.Float32BufferAttribute(cc, 3));
    const m = new T.Mesh(geom, new T.MeshLambertMaterial({vertexColors: true, emissive: '#ffe6cc', emissiveIntensity: .12})); m.receiveShadow = true; return m; };
  nest.add(layer(9, 32, 70, -16, 8, 21), layer(14, 70, 170, -20, 16, 22), layer(16, 170, 340, -34, 30, 23));   // near, mid, far puffs
  // a woven (basket) texture for the nest: over/under strips, not scattered planks
  const weave = (() => { if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#3a2410'; x.fillRect(0, 0, 256, 256);
    const n = 8, q = 256 / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const hor = (i + j) % 2 === 0, gx = i * q, gy = j * q, gr = x.createLinearGradient(gx, gy, hor ? gx : gx + q, hor ? gy + q : gy);
      gr.addColorStop(0, '#5a3818'); gr.addColorStop(.5, '#a8743a'); gr.addColorStop(1, '#5a3818');   // darker: the kids stand out (check 3) x.fillStyle = gr; x.fillRect(gx + 2, gy + 2, q - 4, q - 4);
      x.strokeStyle = 'rgba(60,35,15,.6)'; x.lineWidth = 1.5; for (let k = 1; k < 4; k++) { x.beginPath(); if (hor) { x.moveTo(gx + 3, gy + k * q / 4); x.lineTo(gx + q - 3, gy + k * q / 4); } else { x.moveTo(gx + k * q / 4, gy + 3); x.lineTo(gx + k * q / 4, gy + q - 3); } x.stroke(); } }
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; return t; })();
  const weaveMat = rep => { const t = weave?.clone(); if (t) { t.needsUpdate = true; t.repeat.set(...rep); } return new T.MeshPhongMaterial({color: '#ffffff', map: t ?? null, side: T.DoubleSide, shininess: 6}); };
  const bowl0 = new T.CylinderGeometry(16, 10, 6, 40, 1, true); bowl0.translate(0, -1.5, 0);
  const bowl = new T.Mesh(bowl0, weaveMat([14, 2])); nest.add(bowl);
  const floorN = new T.Mesh(new T.CircleGeometry(10.5, 40), weaveMat([5, 5])); floorN.rotation.x = -Math.PI / 2; floorN.position.y = -4.4; nest.add(floorN);
  const rimN = new T.Mesh(new T.TorusGeometry(16, 2.6, 8, 56), weaveMat([24, 2])); rimN.rotation.x = Math.PI / 2; rimN.position.y = 1.4; rimN.castShadow = true; nest.add(rimN);
  // (owner pass 2: no scattered sticks; the weave carries the texture)
  for (let k = 0; k < 9; k++) { const s2 = eggMesh(['ember', 'frost', 'moss', 'tide', 'geode', 'storm', 'sprinkle', 'cosmic', 'plain'][k], {r: .5, rim: false}); const a = k / 9 * 6.28 + .3; s2.scale.set(1.1, .55, 1.1); s2.position.set(Math.sin(a) * 9.4, -4, Math.cos(a) * 9.4); s2.rotation.z = 1.2; s2.userData.egg = null; s2.name = 'shell'; nest.add(s2); }   // hatched shells
  const sun = new T.PointLight('#ffd08a', 40, 60, 1.2); sun.position.set(0, 18, 14); const sg = glow('#ffcf7a', 90); sg.position.set(-60, 30, 180); nest.add(sun, sg);
  nest.position.set(...NEST); scene.add(nest);
  scene.add(hero);
  // ---- owner fix pass: state-driven props (times come from spec.worldState) ---------------------------------------------
  const hot = eggMesh('ember', {r: EGG_R.held}); const hotGlow = glow('#ff3a1a', 4); hot.add(hotGlow); hot.visible = false; hot.name = 'hotEgg'; scene.add(hot);   // S03b: tossed away like it burns
  const cold = eggMesh('plain', {r: EGG_R.nest, warm: 0}); cold.visible = false; cold.name = 'coldEgg'; scene.add(cold);   // S15b: one cold egg left in an empty nest at dawn
  { const b4 = bases[4], g4 = hero.getObjectByName('base_4_tide'); g4.updateMatrixWorld(true); const e4 = nestEggs[4], p = e4.getWorldPosition(new T.Vector3()); cold.position.copy(p); }
  const grassEgg = eggMesh('geode', {r: EGG_R.nest}); grassEgg.visible = false; grassEgg.name = 'grassEgg'; scene.add(grassEgg);   // S17: the egg Kit found in the grass
  const note5 = textPanel(1.1, .8); note5.draw('SORRY', (x, w, h) => { x.fillStyle = '#fbf6e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3a48'; x.font = `bold ${h * .38}px "Lilita One", Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SORRY', w / 2, h / 2); });
  note5.mesh.visible = false; note5.mesh.name = 'returnNote'; scene.add(note5.mesh);
  { const g5 = hero.getObjectByName('base_5_geode'); g5.updateMatrixWorld(true); const n5 = nestEggs[5].getWorldPosition(new T.Vector3()), out = new T.Vector3(-Math.sin(bases[5].a), 0, -Math.cos(bases[5].a));
    note5.mesh.position.copy(n5).addScaledVector(out, 1.6).setY(groundY(n5.x, n5.z) + .62); note5.mesh.rotation.set(-Math.PI / 2 + .3, 0, 0); note5.mesh.rotation.order = 'YXZ'; note5.mesh.rotation.y = bases[5].a + Math.PI;
    const ge = n5.clone().addScaledVector(out, 7).add(new T.Vector3(2.5, 0, 0)); grassEgg.position.set(ge.x, groundY(ge.x, ge.z) + .45, ge.z); grassEgg.rotation.z = 1.1; }
  const fence = new T.Group(); fence.name = 'vaultFence'; for (let k = 0; k < 3; k++) { const f = PR.smallProp('fence', k); f.position.set(0, 0, (k - 1) * 3.2); fence.add(f); } fence.rotation.y = Math.PI / 2; fence.position.set(-12, groundY(-12, 9), 9); fence.visible = false; scene.add(fence);   // S19
  const spot = new T.SpotLight('#cfe0ff', 0, 160, .5, .4, 1); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.camera.near = 20; spot.shadow.camera.far = 170; scene.add(spot, spot.target);   // S29b: the shadow sweep
  const coldFly = eggMesh('plain', {r: EGG_R.held * 1.3, warm: 0}); coldFly.visible = false; coldFly.name = 'coldFly'; scene.add(coldFly);   // the proof match cut: a cold egg flying hand to hand
  // owner pass 2: a large moon to backlight the mother (S37b), and the warm light of Kit's egg on faces (S36, S39)
  const moonTex = (() => { if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,250,1)'); g.addColorStop(.42, 'rgba(240,246,255,1)'); g.addColorStop(.5, 'rgba(200,220,255,.55)'); g.addColorStop(1, 'rgba(160,190,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const bigMoon = new T.Sprite(new T.SpriteMaterial({map: moonTex, color: '#ffffff', fog: false, depthWrite: false, toneMapped: false, transparent: true})); bigMoon.visible = false; bigMoon.renderOrder = -2; bigMoon.name = 'bigMoon'; scene.add(bigMoon);
  const eggLight = new T.PointLight('#ffc46b', 0, 12, 1.4); scene.add(eggLight);
  movers.push({update: t => {
    const bm = state.bigMoon; bigMoon.visible = !!bm; if (bm) { bigMoon.position.set(...bm.pos); bigMoon.scale.setScalar(bm.size); }
    const el = state.eggLight; eggLight.intensity = el ? el.i : 0; if (el) eggLight.position.set(...el.pos);
    const ct = state.coldToss; coldFly.visible = !!ct && t >= ct.t0 && t < ct.t1;
    if (coldFly.visible) { const k = (t - ct.t0) / .8, leg = Math.floor(k), u = k - leg, [f, q] = leg % 2 ? [ct.b, ct.a] : [ct.a, ct.b]; coldFly.position.set(f[0] + (q[0] - f[0]) * u, f[1] + (q[1] - f[1]) * u + Math.sin(u * Math.PI) * 1.8, f[2] + (q[2] - f[2]) * u); coldFly.rotation.z = t * 7; }
    const ht = state.hotToss; hot.visible = !!ht && t >= ht.t0 && t < ht.t0 + 3;
    if (hot.visible) { const u = Math.min(1, (t - ht.t0) / .9), f = ht.from, q = ht.to; hot.position.set(f[0] + (q[0] - f[0]) * u, f[1] + (q[1] - f[1]) * u + Math.sin(u * Math.PI) * 3, f[2] + (q[2] - f[2]) * u); hot.rotation.z = t * 9; hotGlow.scale.setScalar(3 + 2.2 * Math.abs(Math.sin(t * 9))); }
    if (door10) { const sl = state.slam ?? -99, k = Math.min(1, Math.max(0, (t - sl + .14) / .14)); door10.hinge.rotation.y = 1.55 * (1 - k * k);
      const b = Math.min(1, Math.max(0, (t - sl - .1) / .25)); door10.bolt.position.x = 3.0 + 1.0 * b;   // the bolt shoots across into the keeper
      door10.ptr.rotation.z = -Math.min(1, Math.max(0, (t - sl - .3) / 1.5)) * Math.PI * 1.5; }
    const sp = state.moonSpot; spot.intensity = sp ? sp.i ?? 1.6 : 0; spot.decay = 0; if (sp) { spot.position.set(...sp.pos); spot.target.position.set(...sp.target); spot.angle = sp.angle ?? .5; }
  }});
  movers.push(A.birds({centre: [10, 46, -40], n: 0, r: 30, seed: 3}));   // no birds: "nobody has ever seen a bird"
  for (const m of movers) if (m.group || m.object) scene.add(m.group ?? m.object);
  // ---- anchors (positions for cast offsets; cameras for wide stills) --------------------------------------------------------
  const kitBase = bases[0], kb = [kitBase.x - Math.sin(kitBase.a) * 9, 0, kitBase.z - Math.cos(kitBase.a) * 9];
  anchors.square = {position: [0, groundY(0, 0), 0], camera: {position: [0, 24, 76], target: [0, 9, -12], fov: 50}};
  for (const b of bases) { const fx = -Math.sin(b.a), fz = -Math.cos(b.a), x = b.x + fx * 9, z = b.z + fz * 9; anchors['base' + b.i] = {position: [x, groundY(x, z), z], camera: {position: [x + fx * 10, groundY(x, z) + 4, z + fz * 10], target: [b.x, 3, b.z], fov: 45}}; }
  anchors.kitBase = {position: [kb[0], groundY(kb[0], kb[2]), kb[2]]};
  anchors.hall = {position: [-22 + Math.sin(.5) * 12, groundY(-16, -24), -SQ - 12 + Math.cos(.5) * 12]};
  anchors.bedroom = {position: [ROOM[0], ry + .4, ROOM[2]], camera: {position: [ROOM[0] + 5, ry + 7, ROOM[2] + 9], target: [ROOM[0], ry + 2, ROOM[2] - 2], fov: 45}};
  anchors.nest = {position: [NEST[0], NEST[1] - .2, NEST[2]], camera: {position: [NEST[0], NEST[1] + 30, NEST[2] + 70], target: [NEST[0], NEST[1], NEST[2]], fov: 50}};
  anchors.wide = {position: [0, 0, 0], camera: {position: [-60, 60, 150], target: [0, 10, -40], fov: 50}};
  Object.assign(state, {board: 'race', clock: '1159', flyers: false, benchEgg: false, plainEgg: true});
  const setClock = c => { for (const {hh, mh} of hands) { hh.rotation.z = c === '12' ? 0 : .02; mh.rotation.z = c === '12' ? 0 : 2 * Math.PI / 60; } };
  setClock('1159');
  return {anchors, groundY, update(t) { for (const m of movers) m.update?.(t); },
    setState(k, v) { state[k] = v; if (k === 'board') drawBoard(v); if (k === 'clock') setClock(v); if (k === 'flyers') flyers.visible = !!v; if (k === 'benchEgg') benchEgg.visible = !!v; if (k === 'plainEgg') plainEgg.visible = !!v;
      if (k === 'coldBase') { cold.visible = !!v; nestEggs[4].visible = !v; } if (k === 'geodeAway') nestEggs[5].visible = !v; if (k === 'grassEgg') { grassEgg.visible = !!v; if (Array.isArray(v)) grassEgg.position.set(v[0], groundY(v[0], v[1]) + .45, v[1]); } if (k === 'returnNote') note5.mesh.visible = !!v; if (k === 'fence') fence.visible = !!v; if (k === 'nestSet') nest.visible = !!v; }};
}
