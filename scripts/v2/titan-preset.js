// scripts/v2/titan-preset.js — tuft 2B (P3B rebuild, owner spec): writes beasts/TITAN.json (data on the QUAD rig, engine/beast.js). A bull-gorilla
// MOUNTAIN at ×12 kid height: a huge hunched HUMP over the shoulders is the highest point, sloping to small hips; barrel chest hangs low; the head
// hangs LOWER than the hump, pushed forward (flat brow, jutting underbite jaw, two short tusks); two RAM horns from the brow sides sweep back, curl
// down + forward round the ears and end in points beside the cheeks (10 tapered faceted segments each, bone-white with darker rings; never up);
// pillar forelegs on knuckle fists, short bent hind legs, a long heavy tail dragging; DARK basalt (value ≤ .35) + moss on the hump; thin jagged
// branching MOLTEN crack lines (#FF6A1A → #FFB347) on chest / shoulders / legs, molten eyes + mouth interior; chains on the forelegs.
// States caged roar break stomp flinch flee ignite (engine/beast.js). Usage: node scripts/v2/titan-preset.js
import {writeFileSync} from 'node:fs';
import * as B from '../../engine/beast.js';

const parts = [], a = p => (parts.push(p), p), P = {
  note: 'tuft 3B TITAN (scripts/v2/titan-preset.js, owner spec): bull-gorilla mountain ×12 kid: hunched hump = highest point, low forward head (flat brow, underbite jaw, two tusks), ram horns curling back-down-forward round the ears (10 faceted segments, bone + dark rings, never up), knuckle-walk pillar forelegs, short bent hind legs, dragging tail; dark basalt + moss hump; thin branching molten crack lines, molten eyes + mouth; chains on the forelegs. States caged roar break stomp flinch flee ignite.',
  name: 'TITAN', rig: 'quad', tiers: ['hero'], glow: '#FF6A1A', mouthGlow: '#FF8A2E', eyeGlow: '#FFB347', glowHDR: 4.0, blobR: 2.8, moonRim: false, material: {roughness: .85, metalness: 0, env: .25, fog: false},
  colors: {body: '#3C3A3B', dark: '#2A2829', moss: '#3F5826', bone: '#E6DCC4', ring: '#6E6352', iron: '#222428', eyeDark: '#1A1414'},
  dims: {legH: 3.2, bodyH: 3.0, bodyL: 5.6, bodyW: 3.4, hindK: .75, neckL: 1.4, neckUp: -55, neckY: .05, neckZ: .55, headLevel: .55, headL: 2.0, headH: 1.7, headW: 2.2,
    tailL: 6.0, tailUp: -30, tail2Up: 20, jawMax: .55, ears: false, legX: .36, legZ: .36, hipDrop: .3},
  gait: {walkHz: .42, runHz: .8, walkSpeed: 4.5, runSpeed: 11, breath: 4.2},
  extraSegs: ['FL', 'FR'].map(l => ({name: 'chain' + l, parent: 'leg' + l + '2', pivot: [0, -1.05, 0]})), parts};
// seeded jitter (data stays deterministic)
let sd = 9; const rnd = () => (sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648, jit = k => (rnd() - .5) * 2 * k;
const nrm = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
// point on a gem (ellipsoid) surface along direction (az about y from +z towards +x, el up), pulled in to sit on the facets
const onGem = (g, az, el, k = .95) => { const d = nrm([Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]), h = g.size.map(v => v / 2);
  const t = 1 / Math.hypot(d[0] / h[0], d[1] / h[1], d[2] / h[2]); return g.offset.map((o, i) => +(o + d[i] * t * k).toFixed(3)); };
const zig = (pts, r, seg, mirror = true, glowColor) => { for (let i = 0; i < pts.length - 1; i++) a({seg, shape: 'strip', from: pts[i], to: pts[i + 1], r, facets: 3, glow: 'all', mirror, glowBase: false, color: 'dark', ...(glowColor ? {glowColor} : {}), tag: 'crack'}); };
// a jagged branching crack on a gem: walk in (az, el) with jitter; branches leave at some nodes (thinner, hotter tip colour)
function crackOn(g, seg, az, el, dAz, dEl, n, r, mirror = true, depth = 0) { const pts = [onGem(g, az, el)];
  for (let i = 0; i < n; i++) { az += dAz + jit(Math.abs(dAz) * .9 + .05); el += dEl + jit(Math.abs(dEl) * .9 + .05); pts.push(onGem(g, az, el));
    if (depth < 1 && i > 0 && i < n - 1 && rnd() < .45) crackOn(g, seg, az, el, dAz * .4 + (rnd() < .5 ? .14 : -.14), dEl * .4 + jit(.12), 2 + (rnd() * 2 | 0), r * .7, mirror, depth + 1); }
  zig(pts, r, seg, mirror, depth ? '#FFB347' : undefined); }

// ---- body: core, small hips, HUGE hunched hump (tag hump), barrel chest hanging low, shoulder masses, moss on the hump -------------
const core = a({seg: 'body', shape: 'gem', size: [3.6, 3.0, 4.8], offset: [0, 0, .1], facets: 7, rings: 3, color: 'body'});
a({seg: 'body', shape: 'gem', size: [2.8, 2.4, 2.6], offset: [0, -.25, -2.3], facets: 6, rings: 2, color: 'body'});   // small hips
const hump = a({seg: 'body', shape: 'gem', size: [4.4, 4.8, 3.9], offset: [0, 2.2, 1.0], rot: [-8, 0, 0], facets: 8, rings: 3, color: 'body', tag: 'hump'});
a({seg: 'body', shape: 'gem', size: [3.4, 1.9, 2.8], offset: [0, 3.95, .7], facets: 7, rings: 2, color: 'body', tag: 'hump'});   // hump crest
a({seg: 'body', shape: 'gem', size: [3.3, .9, 2.7], offset: [0, 4.55, .6], facets: 7, rings: 2, color: 'moss', tag: 'hump'});   // big moss cap
a({seg: 'body', shape: 'gem', size: [1.0, 2.2, 2.4], offset: [1.85, 3.0, .7], rot: [0, 0, -18], facets: 6, rings: 2, color: 'moss', mirror: true});
a({seg: 'body', shape: 'gem', size: [2.4, .6, 2.2], offset: [0, 1.45, -1.5], rot: [-14, 0, 0], facets: 6, rings: 2, color: 'moss'});
const chest = a({seg: 'body', shape: 'gem', size: [3.4, 2.8, 2.4], offset: [0, -1.25, 2.3], facets: 7, rings: 3, color: 'dark'});   // barrel chest, hanging low
const shoulder = a({seg: 'body', shape: 'gem', size: [1.6, 2.4, 2.4], offset: [1.85, .7, 1.7], facets: 6, rings: 2, color: 'body', mirror: true});
// molten crack lines: chest front, shoulders / hump sides, flank
crackOn(chest, 'body', .25, .45, .05, -.32, 5, .055); crackOn(chest, 'body', -.08, .2, -.1, -.3, 4, .05, false);
crackOn(hump, 'body', 1.35, .55, .06, -.24, 5, .05); crackOn(shoulder, 'body', 1.1, .7, .08, -.38, 4, .05);
crackOn(core, 'body', 1.45, .35, -.22, -.08, 5, .045);

// ---- neck + head: low, forward; wide flat brow; muzzle set back over a jutting underbite jaw with two short tusks -----------------------
a({seg: 'neck', shape: 'prism', axis: 'z', len: 1.5, r: [1.4, 1.3], taper: .88, facets: 7, offset: [0, 0, -.25], color: 'body'});
const head = a({seg: 'head', shape: 'gem', size: [2.6, 1.9, 2.3], offset: [0, .05, .6], facets: 7, rings: 2, color: 'body'});
a({seg: 'head', shape: 'box', size: [2.9, .5, 1.1], offset: [0, .74, 1.15], rot: [12, 0, 0], color: 'dark'});   // wide flat brow
a({seg: 'head', shape: 'gem', size: [1.6, .8, 1.0], offset: [0, -.12, 1.55], facets: 6, rings: 1, color: 'dark'});   // muzzle (set back)
a({seg: 'head', shape: 'gem', size: [.46, .24, .22], offset: [.62, .3, 1.55], facets: 5, rings: 1, glow: 'all', glowGroup: 'eye', glowBase: false, color: 'eyeDark', mirror: true});
a({seg: 'head', shape: 'cone', axis: '-z', len: .55, r: [.32, .42], facets: 4, offset: [1.12, .15, -.05], color: 'dark', mirror: true});   // ear (the horn wraps it)
crackOn(head, 'head', .75, .35, .1, -.3, 3, .04);
// RAM horns: 10 tapered faceted segments on a spiral round the ear (centre C), from the brow side BACK, DOWN, FORWARD, tip out beside the cheek;
// darker ring bands at the joints. Path in head space: φ 40° → 340° (y = C + R sin φ, z = C + R cos φ), x flares outward.
{ const N = 10, C = [.15, -.05], ph0 = 40, ph1 = 340, pts = [];
  for (let i = 0; i <= N; i++) { const u = i / N, ph = (ph0 + (ph1 - ph0) * u) * Math.PI / 180, R = 1.05 + .3 * u;
    pts.push([+(1.0 + .95 * Math.sin(Math.min(1, u * 1.6) * Math.PI / 2) + .25 * u * u).toFixed(3), +(C[0] + R * Math.sin(ph)).toFixed(3), +(C[1] + R * Math.cos(ph)).toFixed(3)]); }
  for (let i = 0; i < N; i++) { const u = i / N, r = .46 * (1 - .82 * u) + .03, r2 = .46 * (1 - .82 * (i + 1) / N) + .03;
    a({seg: 'head', shape: 'strip', from: pts[i], to: pts[i + 1], r, taper: +(r2 / r).toFixed(3), facets: 6, color: 'bone', mirror: true, tag: 'horn'});
    if (i > 0 && i < N - 1) { const d = pts[i + 1].map((v, k) => v - pts[i][k]), q = pts[i].map((v, k) => +(v + d[k] * .02).toFixed(3)), e = pts[i].map((v, k) => +(v + d[k] * .16).toFixed(3));
      a({seg: 'head', shape: 'strip', from: q, to: e, r: +(r * 1.07).toFixed(3), facets: 6, color: 'ring', mirror: true, tag: 'horn'}); } } }
a({seg: 'jaw', shape: 'box', size: [2.0, .6, 2.0], offset: [0, -.2, 1.25], rot: [-6, 0, 0], color: 'dark'});   // jutting lower jaw (underbite)
a({seg: 'jaw', shape: 'box', size: [1.4, .14, 1.3], offset: [0, .1, 1.35], glow: 'all', glowGroup: 'mouth', glowBase: false, color: 'dark'});   // mouth interior
a({seg: 'jaw', shape: 'strip', from: [-.7, .14, 2.22], to: [.7, .14, 2.22], r: .06, glow: 'all', glowGroup: 'mouth', glowBase: false, color: 'dark'});
for (const x of [.68, -.68]) a({seg: 'jaw', shape: 'cone', axis: 'y', len: .6, r: [.15, .15], facets: 5, offset: [x, .08, 2.08], color: 'bone'});   // two short tusks

// ---- tail: long, heavy, dragging on the ground; mossy club ---------------------------------------------------------------------------
a({seg: 'tail1', shape: 'prism', axis: '-z', len: 3.0, r: [.95, .9], taper: .72, facets: 6, color: 'body'});
a({seg: 'tail2', shape: 'prism', axis: '-z', len: 3.0, r: [.68, .64], taper: .6, facets: 6, color: 'dark'});
a({seg: 'tail2', shape: 'gem', size: [1.2, .9, 1.4], offset: [0, .05, -3.0], facets: 6, rings: 2, color: 'moss'});
zig([[.55, .5, -.3], [.62, .2, -1.0], [.5, .45, -1.7], [.55, .15, -2.3]], .04, 'tail1');

// ---- legs: thick pillar forelegs on knuckle-walk fists (chains round the wrists); short bent hind legs -----------------------------
const up = (P.dims.legH + P.dims.bodyH / 2 - P.dims.bodyH * P.dims.hipDrop) / 2;
a({seg: 'legFL1', shape: 'prism', axis: '-y', len: up, r: [1.2, 1.25], taper: .9, facets: 7, mirror: true, color: 'body'});
a({seg: 'legFL1', shape: 'gem', size: [1.9, 2.0, 2.2], offset: [.15, -.3, 0], facets: 6, rings: 2, mirror: true, color: 'body'});   // forearm bulk
a({seg: 'legFL2', shape: 'prism', axis: '-y', len: up - .5, r: [1.1, 1.1], taper: 1.02, facets: 7, mirror: true, color: 'body'});
a({seg: 'legFL2', shape: 'gem', size: [2.3, 1.15, 2.0], offset: [0, -up + .5, .35], rot: [12, 0, 0], facets: 7, rings: 2, mirror: true, color: 'dark'});   // fist
for (let i = 0; i < 4; i++) a({seg: 'legFL2', shape: 'gem', size: [.5, .55, .5], offset: [-.72 + .48 * i, -up + .22, 1.18], facets: 5, rings: 1, mirror: true, color: 'dark'});   // knuckles
for (const [an0, n] of [[1.25, 8], [.55, 7]]) { const pts = []; let an = an0; for (let i = 0; i <= n; i++) { an += jit(.32); pts.push([+(1.16 * Math.sin(an)).toFixed(3), +(-.15 - (2 * up - .9) * i / n).toFixed(3), +(1.16 * Math.cos(an)).toFixed(3)]); }
  const h = Math.ceil(n / 2); zig(pts.slice(0, h + 1), .038, 'legFL1'); zig(pts.slice(h).map(p => [p[0], +(p[1] + up).toFixed(3), p[2]]), .038, 'legFL2');
  const b = pts[2], b2 = [+(1.16 * Math.sin(an0 + .5)).toFixed(3), +(b[1] - .35).toFixed(3), +(1.16 * Math.cos(an0 + .5)).toFixed(3)]; zig([b, b2], .028, 'legFL1', true, '#FFB347'); }
for (let i = 0; i < 10; i++) { const an = 2 * Math.PI * i / 10, R0 = 1.2; a({seg: 'chainFL', shape: 'box', size: i % 2 ? [.18, .46, .32] : [.18, .32, .46], offset: [+(Math.sin(an) * R0).toFixed(3), 0, +(Math.cos(an) * R0).toFixed(3)], rot: [0, +(an * 180 / Math.PI).toFixed(1), 0], color: 'iron', mirror: true}); }
for (let i = 0; i < 5; i++) a({seg: 'chainFL', shape: 'box', size: i % 2 ? [.18, .4, .3] : [.3, .4, .18], offset: [+(1.3 + .12 * i).toFixed(2), +(-.3 - .17 * i).toFixed(2), +(-.25 - .14 * i).toFixed(2)], rot: [0, 0, 12], color: 'iron', mirror: true});
const hk = P.dims.hindK, hu = up * hk;
a({seg: 'legBL1', shape: 'gem', size: [1.9, 2.4, 2.5], offset: [.1, -.35, .15], facets: 6, rings: 2, mirror: true, color: 'body'});   // thigh
a({seg: 'legBL1', shape: 'strip', from: [0, .1, 0], to: [0, -hu, .55], r: .95, taper: .9, facets: 6, mirror: true, color: 'body'});   // bent: knee forward
a({seg: 'legBL2', shape: 'strip', from: [0, 0, .55], to: [0, -hu + .4, -.15], r: .8, taper: .95, facets: 6, mirror: true, color: 'body'});   // shin back to the hock
a({seg: 'legBL2', shape: 'gem', size: [1.7, .65, 2.0], offset: [0, -hu + .3, .25], facets: 6, rings: 1, mirror: true, color: 'dark'});
zig([[.92, -.2, .45], [.98, -.6, .2], [.9, -1.0, .5]], .04, 'legBL1');

// scale: the whole rig ×12 kid height (the top of the hump)
const g = B.buildGeometry({...P, scale: 1}), s = B.sampleBeast({...P, scale: 1}, [{t: 0, state: 'idle'}], 0, {geo: g}), v = B.worldVerts(s, g); let top = 0; for (let i = 1; i < v.length; i += 3) top = Math.max(top, v[i]);
P.scale = +(12 * B.KID_H / top).toFixed(4);
writeFileSync('beasts/TITAN.json', JSON.stringify(P, null, 1) + '\n'); console.log('wrote beasts/TITAN.json', parts.length, 'parts, scale', P.scale, 'tris', B.beastTris(P, 'hero'));
