// scripts/v2/titan-preset.js — tuft 2B: writes beasts/TITAN.json (data on the QUAD rig, engine/beast.js). The heavy rig at ×12 kid height:
// stone + moss facets (big, readable from far), MOLTEN-ORANGE crack seams, two great curled horns, glowing molten eyes, CHAINS on the
// legs (extra segments `chainFL…` so a break-out can drop them: segment scale 0 after the snap). States: caged (breathing, molten pulse),
// roar, break (chains snap), stomp (camera-shake footfalls), flinch, flee, ignite (eyes fade up in darkness). Usage: node scripts/v2/titan-preset.js
import {writeFileSync} from 'node:fs';
import * as B from '../../engine/beast.js';

const parts = [], a = p => parts.push(p), P = {
  note: 'tuft 2B TITAN (scripts/v2/titan-preset.js): quad heavy rig ×12 kid height, stone + moss facets, MOLTEN-ORANGE crack seams, two great curled horns, molten eyes, chains on the legs (break-out drops them). States caged roar break stomp flinch flee ignite.',
  name: 'TITAN', rig: 'quad', tiers: ['hero'], glow: '#FF4A0E', mouthGlow: '#FF7A1F', eyeGlow: '#FFB02E', glowHDR: 3.0, blobR: 2.6,
  colors: {body: '#585C61', dark: '#3A3D42', moss: '#4C6A2E', bone: '#E6DCC4', iron: '#2A2C30'},
  dims: {legH: 2.6, bodyH: 3.3, bodyL: 5.2, bodyW: 3.3, neckL: 1.5, neckUp: -6, headLevel: .9, headL: 2.0, headH: 1.7, headW: 1.9, tailL: 2.0, tailUp: -35, tail2Up: -20, jawMax: .55, ears: false, legX: .34, legZ: .33, hipDrop: .28},
  gait: {walkHz: .42, runHz: .8, walkSpeed: 4.5, runSpeed: 11, breath: 4.2},
  extraSegs: ['FL', 'FR', 'BL', 'BR'].map(l => ({name: 'chain' + l, parent: 'leg' + l + '2', pivot: [0, -.7, 0]})), parts};
// body: a hunched mass of big stone facets + shoulder hump + moss
a({seg: 'body', shape: 'gem', size: [3.3, 3.3, 5.2], facets: 7, rings: 3, color: 'body'});
a({seg: 'body', shape: 'gem', size: [3.6, 4.6, 3.0], offset: [0, 2.6, 1.6], facets: 6, rings: 2, color: 'body'});   // bison-like shoulder hump
a({seg: 'body', shape: 'gem', size: [2.6, 1.8, 2.4], offset: [0, .9, -1.4], facets: 6, rings: 2, color: 'dark'});
a({seg: 'body', shape: 'gem', size: [2.6, .9, 2.4], offset: [0, 4.75, 1.5], facets: 6, rings: 1, color: 'moss'});
a({seg: 'body', shape: 'gem', size: [2.0, .7, 2.2], offset: [0, 1.6, -1.5], facets: 6, rings: 1, color: 'moss'});
a({seg: 'body', shape: 'gem', size: [1.2, 1.4, 1.6], offset: [1.45, .1, .6], facets: 5, rings: 1, color: 'dark', mirror: true});
// molten cracks (zigzag strips) on flanks, hump, haunch
const zig = (pts, r = .07, mirror = true, seg = 'body') => { for (let i = 0; i < pts.length - 1; i++) a({seg, shape: 'strip', from: pts[i], to: pts[i + 1], r, glow: 'all', mirror}); };
zig([[1.62, .9, 2.0], [1.7, .2, 1.4], [1.66, .6, .6], [1.7, -.3, -.2], [1.62, .2, -1.2], [1.55, -.5, -2.0]]);
zig([[1.1, 2.3, 2.1], [1.3, 1.7, 1.4], [1.15, 2.0, .6]], .06);
zig([[0, 2.6, -.4], [.3, 2.4, -1.1], [0, 2.2, -1.9]], .06, false);
// neck + head: low-slung, heavy brow, glowing molten eyes, two great curled horns (3 cones each, curling back-down-forward)
a({seg: 'neck', shape: 'prism', axis: 'z', len: 1.4, r: [1.2, 1.15], taper: .9, facets: 6, offset: [0, 0, -.2], color: 'body'});
a({seg: 'head', shape: 'gem', size: [1.9, 1.7, 2.0], offset: [0, 0, .5], facets: 6, rings: 2, color: 'body'});
a({seg: 'head', shape: 'box', size: [1.5, .9, .9], offset: [0, -.45, 1.45], color: 'dark'});
a({seg: 'head', shape: 'box', size: [2.0, .38, .7], offset: [0, .55, 1.15], rot: [20, 0, 0], color: 'dark'});
a({seg: 'head', shape: 'gem', size: [.42, .26, .3], offset: [.58, .22, 1.42], facets: 5, rings: 1, glow: 'all', glowGroup: 'eye', glowBase: false, color: 'iron', mirror: true});   // dark until they ignite
a({seg: 'head', shape: 'box', size: [1.0, .06, .7], offset: [0, -.92, 1.45], glow: 'all', glowGroup: 'mouth'});
zig([[.25, .9, .9], [.45, .4, 1.3]], .05, true, 'head');
for (const [len, r, off, rot] of [[1.6, .55, [.85, .6, .4], [0, -10, 30]], [1.5, .46, [2.2, 1.45, .2], [0, 40, -40]], [1.3, .38, [2.6, .9, -.9], [0, 130, -100]], [1.1, .3, [2.05, -.15, -.6], [0, 200, -150]]])
  a({seg: 'head', shape: 'prism', axis: 'x', len, r: [r, r], taper: .75, offset: off, rot, color: 'bone', facets: 6, mirror: true});   // great curled horns (ram curl, out to the sides)
a({seg: 'jaw', shape: 'box', size: [1.4, .3, .9], offset: [0, -.1, .45], color: 'dark'});
a({seg: 'jaw', shape: 'box', size: [1.0, .04, .7], offset: [0, .08, .45], glow: 'all', glowGroup: 'mouth'});
// tail: short, heavy, mossy tip
a({seg: 'tail1', shape: 'prism', axis: '-z', len: 1.1, r: [.45, .45], taper: .7, facets: 5, color: 'body'});
a({seg: 'tail2', shape: 'prism', axis: '-z', len: 1.0, r: [.32, .32], taper: .6, facets: 5, color: 'dark'});
a({seg: 'tail2', shape: 'gem', size: [.7, .6, .8], offset: [0, 0, -1.1], facets: 5, rings: 1, color: 'moss'});
// legs: pillars with crack stripes, big flat feet; chains (iron links) around each ankle + a short hanging run
const up = (P.dims.legH + P.dims.bodyH / 2 - P.dims.bodyH * P.dims.hipDrop) / 2;
for (const [L, k] of [['F', 1], ['B', 1.1]]) {
  a({seg: `leg${L}L1`, shape: 'prism', axis: '-y', len: up, r: [.9 * k, .95 * k], taper: .9, facets: 6, mirror: true, color: 'body'});
  a({seg: `leg${L}L2`, shape: 'prism', axis: '-y', len: up, r: [.78 * k, .82 * k], taper: .95, facets: 6, mirror: true, color: 'body'});
  a({seg: `leg${L}L2`, shape: 'box', size: [1.85 * k, .5, 2.0], offset: [0, -up, .15], mirror: true, color: 'dark'});
  zig([[.85 * k, -.15, .3], [.9 * k, -.6, 0], [.85 * k, -1.0, .3]], .05, true, `leg${L}L1`);
  for (let i = 0; i < 8; i++) { const an = 2 * Math.PI * i / 8, R0 = .92 * k; a({seg: `chain${L}L`, shape: 'box', size: i % 2 ? [.16, .42, .3] : [.16, .3, .42], offset: [Math.sin(an) * R0, 0, Math.cos(an) * R0], rot: [0, an * 180 / Math.PI, 0], color: 'iron', mirror: true}); }
  for (let i = 0; i < 3; i++) a({seg: `chain${L}L`, shape: 'box', size: i % 2 ? [.16, .36, .26] : [.26, .36, .16], offset: [-.98 * k - .12 * i, -.3 - .28 * i, .25], rot: [0, 0, 18], color: 'iron', mirror: true}); }
// scale: the whole rig ×12 kid height (top of the horns / hump)
const g = B.buildGeometry({...P, scale: 1}), s = B.sampleBeast({...P, scale: 1}, [{t: 0, state: 'idle'}], 0, {geo: g}), v = B.worldVerts(s, g); let top = 0; for (let i = 1; i < v.length; i += 3) top = Math.max(top, v[i]);
P.scale = +(12 * B.KID_H / top).toFixed(4);
writeFileSync('beasts/TITAN.json', JSON.stringify(P, null, 1) + '\n'); console.log('wrote beasts/TITAN.json', parts.length, 'parts, scale', P.scale, 'tris', B.beastTris(P, 'hero'));
