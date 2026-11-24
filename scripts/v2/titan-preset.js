// scripts/v2/titan-preset.js — tuft 2B (P3 redesign): writes beasts/TITAN.json (data on the QUAD rig, engine/beast.js). The heavy rig at ×12 kid height:
// stone + moss facets (big, readable from far), MOLTEN-ORANGE crack seams, two great curled horns, glowing molten eyes, CHAINS on the
// legs (extra segments `chainFL…` so a break-out can drop them: segment scale 0 after the snap). States: caged (breathing, molten pulse),
// roar, break (chains snap), stomp (camera-shake footfalls), flinch, flee, ignite (eyes fade up in darkness). Usage: node scripts/v2/titan-preset.js
import {writeFileSync} from 'node:fs';
import * as B from '../../engine/beast.js';

const parts = [], a = p => parts.push(p), P = {
  note: 'tuft 3 TITAN redesign (scripts/v2/titan-preset.js): gorilla-bison colossus ×12 kid height: shoulder hump above the head, low heavy head with a jutting jaw, two great ram-spiral horns (thick arcs, tag horn), pillar forelegs + shorter hind legs (dims.hindK), long heavy tail, stone + moss in big planes, MOLTEN-ORANGE branching crack lines, molten eyes / mouth / chest; chains on the legs (break-out drops them). States caged roar break stomp flinch flee ignite.',
  name: 'TITAN', rig: 'quad', tiers: ['hero'], glow: '#FF4A0E', mouthGlow: '#FF7A1F', eyeGlow: '#FFB02E', glowHDR: 3.0, blobR: 2.6,
  colors: {body: '#5E6267', dark: '#3A3D42', moss: '#4C6A2E', bone: '#E3D6B8', horn2: '#B9AA88', iron: '#2A2C30'},
  dims: {legH: 3.0, bodyH: 3.2, bodyL: 5.6, bodyW: 3.4, hindK: .62, neckL: 1.3, neckUp: -38, neckY: .05, neckZ: .5, headLevel: .55, headL: 2.0, headH: 1.7, headW: 2.0, tailL: 4.6, tailUp: -24, tail2Up: 14, jawMax: .55, ears: false, legX: .36, legZ: .34, hipDrop: .3},
  gait: {walkHz: .42, runHz: .8, walkSpeed: 4.5, runSpeed: 11, breath: 4.2},
  extraSegs: ['FL', 'FR', 'BL', 'BR'].map(l => ({name: 'chain' + l, parent: 'leg' + l + '2', pivot: [0, -.7, 0]})), parts};
// body: a hunched mass of big stone planes; the shoulder hump rises well above the head; moss on the hump + back
a({seg: 'body', shape: 'gem', size: [3.4, 3.1, 5.4], facets: 7, rings: 3, color: 'body'});
a({seg: 'body', shape: 'gem', size: [4.0, 5.2, 3.6], offset: [0, 2.2, 1.3], facets: 7, rings: 3, color: 'body'});   // shoulder hump (bison / gorilla)
a({seg: 'body', shape: 'gem', size: [3.0, 2.2, 2.6], offset: [0, 3.3, .6], rot: [-18, 0, 0], facets: 6, rings: 2, color: 'dark'});
a({seg: 'body', shape: 'gem', size: [3.0, 1.1, 2.6], offset: [0, 4.4, 1.1], facets: 6, rings: 2, color: 'moss'});
a({seg: 'body', shape: 'gem', size: [2.4, .9, 2.6], offset: [0, 1.3, -1.4], facets: 6, rings: 2, color: 'moss'});
a({seg: 'body', shape: 'gem', size: [3.0, 2.4, 1.6], offset: [0, .2, 2.5], facets: 6, rings: 2, color: 'dark'});   // heavy chest
a({seg: 'body', shape: 'gem', size: [1.3, 1.6, 1.8], offset: [1.5, 1.0, 1.3], facets: 5, rings: 1, color: 'body', mirror: true});   // shoulder blocks
// molten CRACK LINES: thin jagged branching polylines (never patches) on flanks, hump, chest
const zig = (pts, r = .045, mirror = true, seg = 'body') => { for (let i = 0; i < pts.length - 1; i++) a({seg, shape: 'strip', from: pts[i], to: pts[i + 1], r, glow: 'all', mirror}); };
zig([[1.74, 1.2, 2.2], [1.82, .7, 1.7], [1.74, .9, 1.1], [1.8, .3, .6], [1.72, .5, -.1], [1.78, -.1, -.7], [1.66, .2, -1.4]]);
zig([[1.82, .7, 1.7], [1.86, .1, 1.95], [1.8, -.4, 1.6]], .035); zig([[1.8, .3, .6], [1.76, -.3, .9]], .035); zig([[1.72, .5, -.1], [1.62, 1.0, -.5]], .035);
zig([[1.5, 3.4, 1.9], [1.75, 2.7, 1.5], [1.6, 2.2, 1.9], [1.82, 1.6, 1.4]], .04); zig([[1.75, 2.7, 1.5], [1.62, 2.9, .8]], .035);
zig([[.35, .2, 3.25], [.6, -.25, 3.15], [.4, -.6, 3.05]], .045); zig([[.6, -.25, 3.15], [.95, -.1, 2.9]], .035); zig([[0, .6, 3.28], [.35, .2, 3.25]], .045, false);
// neck + head: low and heavy, under the hump; jutting underbite jaw; glowing molten eyes under a stone brow
a({seg: 'neck', shape: 'prism', axis: 'z', len: 1.3, r: [1.25, 1.2], taper: .9, facets: 6, offset: [0, 0, -.2], color: 'body'});
a({seg: 'head', shape: 'gem', size: [2.0, 1.6, 2.1], offset: [0, .05, .5], facets: 6, rings: 2, color: 'body'});
a({seg: 'head', shape: 'box', size: [2.2, .42, .8], offset: [0, .62, 1.2], rot: [14, 0, 0], color: 'dark'});   // brow
a({seg: 'head', shape: 'gem', size: [1.5, .9, 1.1], offset: [0, -.3, 1.45], facets: 6, rings: 1, color: 'dark'});   // muzzle
a({seg: 'head', shape: 'gem', size: [.4, .22, .26], offset: [.55, .34, 1.52], facets: 5, rings: 1, glow: 'all', glowGroup: 'eye', glowBase: false, color: 'iron', mirror: true});   // dark until they ignite
a({seg: 'head', shape: 'strip', from: [-.55, -.78, 1.92], to: [.55, -.78, 1.92], r: .05, glow: 'all', glowGroup: 'mouth'});
zig([[.3, .9, 1.0], [.5, .55, 1.25], [.42, .25, 1.6]], .035, true, 'head');
// two great RAM-SPIRAL horns: thick tapering arcs from the brow, up + back, curling down behind the cheek and forward again, flaring out
{ const N = 24, turns = 1.3, pts = [];
  for (let i = 0; i <= N; i++) { const u = i / N, th = 2 * Math.PI * turns * u, R = 2.0 * (1 - .5 * u);
    pts.push([.8 + 1.9 * Math.sin(Math.min(1, u * 1.4) * Math.PI / 2), .3 + 1.5 * (1 - .5 * u) * (Math.cos(th) - .25) + .55, .5 - R * Math.sin(th) - .1]); }
  for (let i = 0; i < N; i++) { const u = i / N, r = .5 * (1 - .62 * u) + .02; a({seg: 'head', shape: 'strip', from: pts[i], to: pts[i + 1], r, facets: 6, color: i % 4 === 3 ? 'horn2' : 'bone', mirror: true, tag: 'horn'}); } }
a({seg: 'jaw', shape: 'box', size: [1.7, .5, 1.9], offset: [0, -.15, 1.05], rot: [-8, 0, 0], color: 'dark'});   // jutting lower jaw (underbite)
a({seg: 'jaw', shape: 'strip', from: [-.6, .14, 1.95], to: [.6, .14, 1.95], r: .05, glow: 'all', glowGroup: 'mouth'});
for (const x of [.55, -.55]) a({seg: 'jaw', shape: 'cone', axis: 'y', len: .5, r: [.12, .12], facets: 4, offset: [x, .05, 1.9], color: 'bone'});   // tusks
// tail: long and heavy, mossy club tip
a({seg: 'tail1', shape: 'prism', axis: '-z', len: 2.4, r: [.8, .75], taper: .75, facets: 6, color: 'body'});
a({seg: 'tail2', shape: 'prism', axis: '-z', len: 2.4, r: [.6, .56], taper: .62, facets: 6, color: 'dark'});
a({seg: 'tail2', shape: 'gem', size: [1.1, .9, 1.3], offset: [0, 0, -2.4], facets: 6, rings: 2, color: 'moss'});
zig([[.3, .45, -.3], [.38, .2, -1.0], [.25, .35, -1.6]], .035, true, 'tail1');
// legs: thick pillar forelegs, shorter hind legs; big flat feet; cracks; chains (iron links) around each ankle + a short hanging run
const leg = (L, k) => (P.dims.legH + P.dims.bodyH / 2 - P.dims.bodyH * P.dims.hipDrop) / 2 * k;
for (const [L, k, w] of [['F', 1, 1.12], ['B', P.dims.hindK, .95]]) { const up = leg(L, k);
  a({seg: `leg${L}L1`, shape: 'prism', axis: '-y', len: up, r: [1.0 * w, 1.05 * w], taper: .92, facets: 6, mirror: true, color: 'body'});
  a({seg: `leg${L}L2`, shape: 'prism', axis: '-y', len: up, r: [.9 * w, .92 * w], taper: 1.05, facets: 6, mirror: true, color: 'body'});
  a({seg: `leg${L}L2`, shape: 'gem', size: [2.2 * w, .7, 2.4 * w], offset: [0, -up + .05, .2], facets: 7, rings: 1, mirror: true, color: 'dark'});
  zig([[.95 * w, -.1, .35], [1.0 * w, -.5 * k, .05], [.94 * w, -.95 * k, .3]], .035, true, `leg${L}L1`);
  for (let i = 0; i < 8; i++) { const an = 2 * Math.PI * i / 8, R0 = 1.02 * w; a({seg: `chain${L}L`, shape: 'box', size: i % 2 ? [.16, .42, .3] : [.16, .3, .42], offset: [Math.sin(an) * R0, 0, Math.cos(an) * R0], rot: [0, an * 180 / Math.PI, 0], color: 'iron', mirror: true}); }
  for (let i = 0; i < 3; i++) a({seg: `chain${L}L`, shape: 'box', size: i % 2 ? [.16, .36, .26] : [.26, .36, .16], offset: [-1.08 * w - .12 * i, -.3 - .28 * i, .25], rot: [0, 0, 18], color: 'iron', mirror: true}); }
// scale: the whole rig ×12 kid height (top of the horns / hump)
const g = B.buildGeometry({...P, scale: 1}), s = B.sampleBeast({...P, scale: 1}, [{t: 0, state: 'idle'}], 0, {geo: g}), v = B.worldVerts(s, g); let top = 0; for (let i = 1; i < v.length; i += 3) top = Math.max(top, v[i]);
P.scale = +(12 * B.KID_H / top).toFixed(4);
writeFileSync('beasts/TITAN.json', JSON.stringify(P, null, 1) + '\n'); console.log('wrote beasts/TITAN.json', parts.length, 'parts, scale', P.scale, 'tris', B.beastTris(P, 'hero'));
