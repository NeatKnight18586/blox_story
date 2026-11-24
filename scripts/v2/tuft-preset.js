// scripts/v2/tuft-preset.js — tuft 2B: writes beasts/TUFT.json (data; the rig is engine/beast.js 'puff'). Palm-sized moon-white puffball
// (≈ 0.95 studs: fits an R6 kid's cupped hands, rides in the hero's hood), big glossy eyes (the only big-eyed beast), small feet, fluff
// = layered faceted quill clusters (6 segments: they ripple and extend on a puff), every quill tipped BLUE → GOLD (#7FB8FF → #FFD36B,
// reserved: nothing else in the world uses it). Seeded, so the file is reproducible. Usage: node scripts/v2/tuft-preset.js
import {writeFileSync} from 'node:fs';

let sd = 9173; const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
const R = .3, parts = [], P = {
  note: 'tuft 2B TUFT (scripts/v2/tuft-preset.js): palm-sized moon-white puffball, big glossy eyes, small feet, layered faceted quill clusters tipped BLUE → GOLD (#7FB8FF → #FFD36B, reserved for Tuft). States idle tremble sneeze hide run puff; `puff:` scales it (engine/puff.js).',
  name: 'TUFT', rig: 'puff', tiers: ['hero'], reservedOwner: true, glow: '#7FB8FF', eyeGlow: '#FFF6DE', glowHDR: 1.4, blobR: .32,
  colors: {body: '#EFECE4', shade: '#D9D5CC', quill: '#F7F5EF', eye: '#0C0D12', shine: '#FFFFFF', foot: '#C9C3B8'},
  dims: {bodyY: .38, footX: .12, footH: .07, footZ: .04}, gait: {runHz: 4.5, runSpeed: 3.2, walkSpeed: 1.2}, parts};
const a = p => parts.push(p);
// core: two offset faceted gems (not a smooth sphere) + fluff tufts
a({seg: 'body', shape: 'gem', size: [2 * R, 1.9 * R, 2 * R], facets: 8, rings: 4, color: 'body'});
for (let i = 0; i < 10; i++) { const th = 2 * Math.PI * i / 10, ph = .35 + .9 * rnd(), d = R * .82;
  a({seg: 'body', shape: 'gem', size: [.2, .17, .2], offset: [+(Math.sin(th) * Math.sin(ph) * d).toFixed(3), +(Math.cos(ph) * d).toFixed(3), +(Math.cos(th) * Math.sin(ph) * d).toFixed(3)], facets: 5, rings: 1, color: i % 2 ? 'body' : 'shade'}); }
// eyes: big, glossy (dark gem + two white shines), on the front face
for (const k of [1, -1]) { a({seg: 'body', shape: 'gem', size: [.2, .24, .09], offset: [k * .115, .05, R * .93], facets: 8, rings: 2, color: 'eye'});
  a({seg: 'body', shape: 'gem', size: [.065, .065, .03], offset: [k * .115 + .035, .1, R * .93 + .045], facets: 5, rings: 1, color: 'shine', glow: 'all', glowGroup: 'eye', glowK: .5});
  a({seg: 'body', shape: 'gem', size: [.03, .03, .02], offset: [k * .115 - .04, .0, R * .93 + .045], facets: 4, rings: 1, color: 'shine'}); }
// feet
for (const s of ['L', 'R']) a({seg: 'foot' + s, shape: 'box', size: [.11, .06, .15], offset: [0, -.03, .03], color: 'foot'});
// quill clusters: 6 sectors (azimuth), 9 quills each, avoiding the eyes (front) and the underside
for (let c = 0; c < 6; c++) for (let q = 0; q < 9; q++) {
  const az = 2 * Math.PI * (c + rnd()) / 6, el = -.25 + 1.65 * Math.pow(rnd(), .8), x = Math.cos(el) * Math.sin(az), y = Math.sin(el), z = Math.cos(el) * Math.cos(az);
  if (z > .55 && y < .55 && Math.abs(x) < .6) { q--; continue; }   // keep the face clear
  const L0 = R * .72, L1 = R * (1.25 + .3 * rnd()), Lb = L1 + .055, Lt = Lb + .085, p = l => [+(x * l).toFixed(3), +(y * l).toFixed(3), +(z * l).toFixed(3)];
  a({seg: 'q' + c, shape: 'strip', from: p(L0), to: p(L1), r: .042, taper: .7, facets: 4, color: 'quill'});
  a({seg: 'q' + c, shape: 'strip', from: p(L1), to: p(Lb), r: .03, taper: .8, facets: 4, color: 'quill', glow: 'all', glowColor: '#7FB8FF'});
  a({seg: 'q' + c, shape: 'strip', from: p(Lb), to: p(Lt), r: .024, taper: .05, facets: 4, color: 'quill', glow: 'all', glowColor: '#FFD36B'}); }
// solve the uniform scale per puff size so the whole height (quills extended, idle at rest breath) hits the target (engine/puff.js SIZES)
const B = await import('../../engine/beast.js'), PF = await import('../../engine/puff.js'), g = B.buildGeometry(P);
const heightAt = k => { const s = B.sampleBeast(P, [{t: 0, state: 'idle'}], 0, {geo: g, scale: k}), v = B.worldVerts(s, g); let y0 = 1e9, y1 = -1e9; for (let i = 1; i < v.length; i += 3) { y0 = Math.min(y0, v[i]); y1 = Math.max(y1, v[i]); } return y1 - y0; };
const h0 = heightAt(1); P.puffK = {}; for (const [n, H] of Object.entries(PF.SIZES.tuft)) { let k = H / h0; for (let i = 0; i < 30; i++) k *= H / heightAt(k); P.puffK[n] = +k.toFixed(4); }
writeFileSync('beasts/TUFT.json', JSON.stringify(P, null, 1) + '\n'); console.log('wrote beasts/TUFT.json', parts.length, 'parts');
