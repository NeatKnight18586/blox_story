// parts/sets4/props4.js — Toy House small props (format v5, Phase 3b): bright toys, never realistic. Each ≤ 400 triangles.
//   toyProp(name, seed) → Group. Names: blaster, kart, gumball, hyperbox, key, hook, photoFrame, register, clock, cone, ballRack, foamBlock
import * as T from 'three';
import {box, cyl, plastic, textPlate, TOY, flat} from './common.js';

const SP = {
  // chunky foam blaster: rounded-ish body, fat barrel with a bright tip, hopper, handle (toy colours, orange tip)
  blaster(seed = 1) {
    const g = new T.Group(), c = TOY[seed % TOY.length], c2 = TOY[(seed + 3) % TOY.length];
    g.add(box(1.5, .7, .55, c, [0, 0, 0], {cell: 3}), box(1.1, .4, .5, c2, [-.1, .55, 0], {cell: 3}), box(.7, .9, .4, c2, [-.45, -.7, 0], {cell: 3}));
    const b = cyl(.28, 1.1, c2, [1.05, .1, 0], {seg: 8, cell: 3}); b.rotation.z = Math.PI / 2; const tip = cyl(.34, .25, '#ff8a00', [1.7, .1, 0], {seg: 8, cell: 3}); tip.rotation.z = Math.PI / 2; g.add(b, tip);
    g.name = 'blaster'; return g;
  },
  // go-kart: low tub, bumper, steering wheel, four chunky wheels
  kart(seed = 1) {
    const g = new T.Group(), c = TOY[seed % TOY.length];
    g.add(box(2.6, .5, 1.6, c, [0, .55, 0], {cell: 3}), box(.5, .6, 1.6, '#ffffff', [-.9, .85, 0], {cell: 3}), box(.5, .15, 1.9, '#2b2b2f', [1.35, .5, 0], {cell: 3}));
    g.add(cyl(.26, .08, '#2b2b2f', [.35, 1.25, 0], {seg: 8, cell: 3}));
    for (const [x, z] of [[-.9, .85], [-.9, -.85], [.9, .85], [.9, -.85]]) { const w = cyl(.42, .35, '#222226', [x, .42, z], {seg: 8, cell: 3}); w.rotation.x = Math.PI / 2; g.add(w); }
    g.name = 'kart'; return g;
  },
  gumball(seed = 1) { const m = new T.Mesh(new T.IcosahedronGeometry(.28, 0), plastic(TOY[seed % TOY.length])); m.name = 'gumball'; return m; },
  // the owner's box: HYPERBOX 9 (electric violet since 3b-R: a story prop, S ≥ .60) on its pedestal-ready crate, label on four sides (real in-world text)
  hyperbox(seed = 1) {
    const g = new T.Group(); g.add(box(3, 2.2, 2.2, '#4b22c9', [0, 1.1, 0], {cell: 3}), box(3.04, .3, 2.24, '#ffd542', [0, 2.3, 0], {cell: 3}), box(3.04, .25, 2.24, '#ffd542', [0, .15, 0], {cell: 3}));
    for (const [yaw, z, x] of [[0, 1.13, 0], [Math.PI, -1.13, 0], [Math.PI / 2, 0, 1.53], [-Math.PI / 2, 0, -1.53]]) {
      const p = textPlate('HYPERBOX 9', {w: yaw % Math.PI ? 1.9 : 2.7, h: 1.2, bg: '#4b22c9', fg: '#ffd542', lines: ['HYPER', 'BOX 9'], name: 'hyperboxLabel'}); p.position.set(x, 1.2, z); p.rotation.y = yaw; g.add(p); }
    g.name = 'hyperbox'; return g;
  },
  key(seed = 1) {
    const g = new T.Group(), r = new T.Mesh(new T.TorusGeometry(.32, .08, 5, 12), plastic('#ffd542')); r.position.y = .6; g.add(r, box(.12, 1.0, .1, '#ffd542', [0, -.15, 0], {cell: 3}), box(.35, .12, .1, '#ffd542', [.2, -.5, 0], {cell: 3}), box(.28, .12, .1, '#ffd542', [.17, -.28, 0], {cell: 3}));
    g.name = 'key'; return g;
  },
  hook() { const g = new T.Group(); g.add(box(1.4, .3, .15, '#6b4428', [0, 0, 0], {cell: 3}), cyl(.07, .5, '#cfd3da', [0, -.05, .25], {seg: 6, cell: 3})); g.children[1].rotation.x = Math.PI / 2; g.name = 'hook'; return g; },
  photoFrame() {
    const g = new T.Group(); g.add(box(2.4, 3.0, .18, '#6b4428', [0, 0, 0], {cell: 3}));
    let map = null; if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 256; c.height = 320; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 320);
      gr.addColorStop(0, '#d9c19a'); gr.addColorStop(1, '#a98a5e'); x.fillStyle = gr; x.fillRect(0, 0, 256, 320); x.fillStyle = '#5a4630';   // sepia: two blocky figures + a doorway
      x.fillRect(40, 210, 70, 110); x.fillRect(48, 150, 54, 56); x.fillRect(150, 230, 60, 90); x.fillRect(156, 180, 48, 48); x.fillStyle = '#7a6244'; x.fillRect(110, 60, 36, 40);
      map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; }
    const ph = new T.Mesh(new T.PlaneGeometry(1.9, 2.4), new T.MeshBasicMaterial({map, color: map ? '#ffffff' : '#c9ac80'})); ph.position.z = .1; ph.name = 'photo'; ph.userData.live = true; g.add(ph); g.name = 'photoFrame'; return g;
  },
  register() { const g = new T.Group(); g.add(box(2.4, 1.0, 1.8, '#d8d2c8', [0, .5, 0], {cell: 3}), box(2.0, .8, .3, '#3a3f48', [0, 1.45, -.6], {cell: 3}), box(1.6, .15, 1.0, '#7bd850', [0, 1.05, .1], {cell: 3}));
    const d = textPlate('$', {w: .9, h: .5, bg: '#2ec4b6', fg: '#fff', name: 'registerDisplay'}); d.position.set(0, 1.5, -.43); g.add(d); g.name = 'register'; return g; },
  cone() { const m = new T.Mesh(new T.ConeGeometry(.45, 1.0, 8), plastic('#ff8a00')); m.position.y = .5; m.name = 'cone'; return m; },
  foamBlock(seed = 1) { const g = new T.Group(); g.add(box(1.6, 1.6, 1.6, TOY[seed % TOY.length], [0, .8, 0], {cell: 3})); g.name = 'foamBlock'; return g; },
};
export const TOY_PROPS = Object.keys(SP);
export const toyProp = (name, seed = 1) => { if (!SP[name]) throw Error('unknown toy prop ' + name); return SP[name](seed); };
export const TOY_TRI_MAX = 400;
