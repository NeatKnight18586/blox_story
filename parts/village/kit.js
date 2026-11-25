// parts/village/kit.js — tuft P3 BEAST VILLAGE kit, the pure side (no three, no DOM, no clock, no Math.random; every choice seeded).
// A house is DATA: housePreset(name | params, seed) → params; houseParts(h, tier) → a list of primitives in house-local studs
// (front = +z, ground at y 0): {k: 'box', size, at, rotY?, rotX?, rotZ?, mat} · {k: 'gable', w, d, h, at, mat, roof: id} (ridge along x) ·
// {k: 'disc', r, t, at, rotY?, mat, n} (round attic window / lantern) — the three side (parts/village/build.js) turns them into merged or
// instanced meshes. Materials are keys: plaster timber roof stone moss cobble wood door winLit winDark frame flower* hay iron lantern rope.
// Tiers: 'hero' (every beam, frame, flower box, perch) · 'mid' (walls, beams, roof, windows only) · 'far' (block + roof, window dots).
// Also: streets (catenary lantern strings, wall runs), seeded layouts (row of houses along a street, terraced hillside rooftops) and the
// night windows rule (≥ 60 % lit, seeded per window).
export function rng(seed = 1) { let s = (Math.floor(seed) >>> 0) || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hashSeed = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// ---- palette (cream plaster, dark timber, slate-blue roofs, mossy stone) ------------------------------------------------------------
export const PALETTE = {plaster: '#EFE3C8', plaster2: '#E8D6B4', plaster3: '#F2E8D8', timber: '#3B2A20', roof: '#4F6684', roof2: '#5C7393', roof3: '#435A78', stone: '#8A8B84', moss: '#5E7A3A',
  cobble: '#8E8A80', wood: '#7A5232', door: '#5A3B26', winLit: '#FFC46E', winDark: '#26303C', frame: '#3B2A20', flowerR: '#D8434A', flowerP: '#E07BB0', flowerY: '#F2C230', leaf: '#4E7A32',
  hay: '#D9B65A', iron: '#2C2E33', lantern: '#FFB04A', rope: '#2A2420', dirt: '#8B7A5C', grass: '#6E9A48', chalk: '#2F4A3A', slate: '#3E4650'};
export const STOREY = 4.2, GROUND_STOREY = 5.6, FOUND = .9, BEAST_DOOR = [3.6, 4.6];   // studs (R6 kid ≈ 4.35; beast-sized doors fit BOULDER)

// ---- house presets (data) -------------------------------------------------------------------------------------------------------
export const HOUSES = {
  hero:    {storeys: 3, w: 11, d: 10, pitch: .9, gable: 'front', chimney: 1, beams: 'cross', cols: 3, round: true, flowers: true, perch: true, jetty: .45, plaster: 'plaster', roof: 'roof'},
  tall:    {storeys: 3, w: 9, d: 9, pitch: 1.0, gable: 'front', chimney: 1, beams: 'grid', cols: 2, round: true, flowers: true, perch: false, jetty: .4, plaster: 'plaster3', roof: 'roof2'},
  wide:    {storeys: 2, w: 14, d: 10, pitch: .75, gable: 'side', chimney: 2, beams: 'diag', cols: 4, round: false, flowers: true, perch: true, jetty: .35, plaster: 'plaster2', roof: 'roof'},
  cottage: {storeys: 2, w: 9, d: 8, pitch: .95, gable: 'front', chimney: 1, beams: 'cross', cols: 2, round: true, flowers: true, perch: false, jetty: .3, plaster: 'plaster', roof: 'roof3'},
  barn:    {storeys: 2, w: 13, d: 12, pitch: .8, gable: 'front', chimney: 0, beams: 'grid', cols: 2, round: true, flowers: false, perch: true, jetty: 0, plaster: 'plaster2', roof: 'roof3', barnDoor: true},
  school:  {storeys: 3, w: 30, d: 14, pitch: .7, gable: 'side', chimney: 2, beams: 'grid', cols: 7, round: true, flowers: false, perch: true, jetty: 0, plaster: 'plaster3', roof: 'roof', tall: true}};
export const MID_PRESETS = ['tall', 'wide', 'cottage', 'barn'];
export function housePreset(p, seed = 1) {
  const base = typeof p === 'string' ? HOUSES[p] : {...HOUSES[p.preset ?? 'cottage'], ...p}; if (!base) throw Error('unknown house preset ' + p);
  const r = rng(seed), j = (v, a) => +(v * (1 + a * (2 * r() - 1))).toFixed(3);
  return {...base, w: j(base.w, .06), d: j(base.d, .05), pitch: j(base.pitch, .08), seed, flip: r() < .5, flowerMat: ['flowerR', 'flowerP', 'flowerY'][Math.floor(r() * 3)]}; }
export const houseHeight = h => FOUND + GROUND_STOREY + (h.storeys - 1) * STOREY;
export const roofTop = h => houseHeight(h) + h.pitch * (h.gable === 'front' ? h.w : h.d) / 2 + .2;

// ---- the parts of one house ---------------------------------------------------------------------------------------------------
export function houseParts(h, tier = 'hero', {lit = null, roofId = 0} = {}) {
  const out = [], B = (size, at, mat, ex = {}) => out.push({k: 'box', size, at, mat, ...ex}), hero = tier === 'hero', far = tier === 'far';
  const H = houseHeight(h), w = h.w, d = h.d, fz = d / 2, r = rng(h.seed * 7 + 3), wallMat = h.plaster ?? 'plaster';
  if (far) { B([w, H, d], [0, H / 2, 0], wallMat); out.push({k: 'gable', w: h.gable === 'front' ? d : w, d: h.gable === 'front' ? w : d, h: h.pitch * (h.gable === 'front' ? w : d) / 2, at: [0, H, 0], rotY: h.gable === 'front' ? Math.PI / 2 : 0, mat: h.roof, roof: roofId}); return out; }
  B([w + .5, FOUND, d + .5], [0, FOUND / 2, 0], 'stone');   // mossy stone foundation
  if (hero) B([w + .55, .18, d + .55], [0, FOUND + .02, 0], 'moss');
  // storeys: ground storey tall (beast doors), uppers jettied out at the front
  let y = FOUND, wins = [];
  for (let s = 0; s < h.storeys; s++) { const sh = s === 0 ? GROUND_STOREY : STOREY, jet = s === 0 ? 0 : h.jetty * s, dz = jet / 2;
    B([w, sh, d + jet], [0, y + sh / 2, dz], wallMat);
    // timber frame: corner posts, sill + head plates, then the beam pattern per bay
    const zf = fz + jet + .06, bays = h.cols, bw = w / bays, T = .28;
    for (const x of [-w / 2 + T / 2, w / 2 - T / 2]) B([T, sh, T], [x, y + sh / 2, zf - .1], 'timber');
    B([w + .1, T, T], [0, y + T / 2, zf - .08], 'timber'); B([w + .1, T * 1.2, T + .1], [0, y + sh - T * .6, zf - .06], 'timber');
    if (!far) for (let b = 0; b < bays; b++) { const x0 = -w / 2 + b * bw, cx = x0 + bw / 2;
      if (b > 0) B([T * .8, sh, T * .8], [x0, y + sh / 2, zf - .1], 'timber');
      if (hero || b % 2 === 0) { const L = Math.hypot(bw * .5, sh * .45), a = Math.atan2(sh * .45, bw * .5);
        if (h.beams === 'cross' && !(s === 0 && b === Math.floor(bays / 2))) { B([L, T * .7, T * .6], [cx - bw * .25, y + sh * .25, zf - .12], 'timber', {rotZ: a}); B([L, T * .7, T * .6], [cx + bw * .25, y + sh * .25, zf - .12], 'timber', {rotZ: -a}); }
        else if (h.beams === 'diag') B([L, T * .7, T * .6], [cx, y + sh * .25, zf - .12], 'timber', {rotZ: (b % 2 ? 1 : -1) * a});
        else B([T * .6, sh * .9, T * .6], [cx, y + sh * .45, zf - .12], 'timber'); }
      // windows: upper storeys every bay; ground storey every bay except the door bay
      const doorBay = s === 0 && b === Math.floor(bays / 2);
      if (!doorBay) { const ww = Math.min(bw * .5, h.tall ? 1.9 : 1.6), wh = h.tall ? sh * .62 : sh * .42, wy = y + sh * (h.tall ? .48 : .56);
        const on = lit ? lit(wins.length) : false; wins.push(on);
        B([ww, wh, .14], [cx, wy, zf + .02], on ? 'winLit' : 'winDark', {window: 1, lit: on});
        if (hero || !far) { B([ww + .3, .2, .3], [cx, wy - wh / 2 - .1, zf + .1], 'frame'); B([ww + .3, .18, .22], [cx, wy + wh / 2 + .09, zf + .08], 'frame'); B([.14, wh, .2], [cx, wy, zf + .1], 'frame'); }
        if (hero && h.flowers && s > 0 && r() < .75) { B([ww + .2, .35, .45], [cx, wy - wh / 2 - .35, zf + .3], 'wood'); B([ww, .3, .38], [cx, wy - wh / 2 - .05, zf + .32], h.flowerMat, {rotX: .1}); } } }
    // back + side windows (mid/hero, so night houses glow from every side the camera may see)
    if (!far) for (const sx of [-1, 1]) { const on = lit ? lit(wins.length) : false; wins.push(on); B([.14, sh * .4, 1.4], [sx * (w / 2 + .02), y + sh * .55, 0], on ? 'winLit' : 'winDark', {window: 1, lit: on}); }
    y += sh; }
  // beast-sized door (or barn door) in the middle bay of the ground storey
  const [dw, dh] = h.barnDoor ? [6.2, 5.0] : BEAST_DOOR;
  B([dw, dh, .2], [0, FOUND + dh / 2, fz + .08], 'door'); B([dw + .5, .4, .4], [0, FOUND + dh + .2, fz + .12], 'timber');
  if (hero) { for (const x of [-dw / 2 - .15, dw / 2 + .15]) B([.3, dh, .35], [x, FOUND + dh / 2, fz + .12], 'timber'); B([dw * .9, .18, .1], [0, FOUND + dh * .55, fz + .22], 'iron'); if (h.barnDoor) B([.2, dh * .95, .1], [0, FOUND + dh / 2, fz + .22], 'timber', {rotZ: Math.atan2(dw, dh) * .9}); }
  // roof (gable, slate blue): ridge along x for side gables, along z for front gables (the gable triangle faces the street)
  const jetT = h.jetty * (h.storeys - 1), rw = h.gable === 'front' ? w : d, rd = h.gable === 'front' ? d + jetT : w, rh = h.pitch * rw / 2;
  out.push({k: 'gable', w: rw + 1.0, d: rd + 1.0, h: rh, at: [0, H, jetT / 2], rotY: h.gable === 'front' ? Math.PI / 2 : 0, mat: h.roof, roof: roofId, wall: h.gable === 'front' ? wallMat : null, wallW: rw, wallD: rd});
  if (h.gable === 'front' && h.round) { const ry = H + rh * .38, rz = fz + jetT + .08;   // round attic window (+ frame ring)
    out.push({k: 'disc', r: rh * .26, t: .16, at: [0, ry, rz + .02], mat: lit && lit(wins.length) ? 'winLit' : 'winDark', window: 1, n: hero ? 16 : 8, round: true}); wins.push(!!(lit && lit(wins.length)));
    out.push({k: 'disc', r: rh * .26 + .22, t: .12, at: [0, ry, rz - .02], mat: 'frame', n: hero ? 16 : 8}); }
  if (h.chimney) for (let c = 0; c < h.chimney; c++) { const cx = (c ? -1 : 1) * w * .28 * (h.flip ? -1 : 1), cz = h.gable === 'front' ? -d * .15 : 0; B([1.2, rh * .9 + 1.6, 1.2], [cx, H + rh * .45 + .5, cz], 'stone'); if (hero) B([1.45, .3, 1.45], [cx, H + rh * .9 + 1.4, cz], 'stone'); }
  if (h.perch && !far) { const px = h.gable === 'front' ? 0 : w * .2, ph = H + rh;   // beast perch: a timber beam out over the street with a platform
    B([.5, .5, 3.2], [px, ph - .3, fz + jetT + 1.4], 'timber'); if (hero) { B([2.0, .25, 1.6], [px, ph - .02, fz + jetT + 2.6], 'wood'); B([.35, 2.0, .35], [px, ph - 1.2, fz + jetT + .4], 'timber', {rotX: -.6}); } }
  return out; }
export const windowsOf = parts => parts.filter(p => p.window);

// ---- night windows: seeded, ≥ 60 % lit -----------------------------------------------------------------------------------------
export const LIT_SHARE = .72;
export const litFn = (seed, share = LIT_SHARE) => i => rng(seed * 131 + i * 977 + 1)() < share;
export function litShare(list) { const w = list.filter(p => p.window); return w.length ? w.filter(p => p.lit || p.mat === 'winLit').length / w.length : 0; }

// ---- lantern strings: catenary between two posts; lanterns every ~2.4 studs -----------------------------------------------------
export function lanternString(a, b, {sag = 1.4, every = 2.4} = {}) {
  const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.round(L / every)), pts = [], lan = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u), a[2] + (b[2] - a[2]) * u]); }
  for (let i = 1; i < n; i++) { const u = i / n; lan.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - sag * 4 * u * (1 - u) - .35, a[2] + (b[2] - a[2]) * u]); }
  return {pts, lanterns: lan}; }

// ---- layouts ---------------------------------------------------------------------------------------------------------------------
// a row of mid houses facing a street: along the polyline `line` (x, z pairs) on side ±1, gap seeded; returns [{preset, at, rotY, seed}]
export function rowAlong(line, side, {seed = 1, presets = MID_PRESETS, gap = [1.2, 3.0], setback = 2, skip = []} = {}) {
  const r = rng(seed), out = []; let i = 0;
  for (let k = 0; k < line.length - 1; k++) { const [x0, z0] = line[k], [x1, z1] = line[k + 1], L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, nx = -uz * side, nz = ux * side;
    let s = gap[0];
    while (s < L) { const name = presets[Math.floor(r() * presets.length)], h = housePreset(name, seed * 1000 + i), half = h.w / 2;
      if (s + h.w > L) break; const c = s + half, off = setback + h.d / 2, at = [x0 + ux * c + nx * off, 0, z0 + uz * c + nz * off];
      if (!skip.some(([sx, sz, rr]) => Math.hypot(at[0] - sx, at[2] - sz) < rr)) out.push({preset: name, at, rotY: Math.atan2(-nx, -nz), seed: seed * 1000 + i});
      s += h.w + gap[0] + r() * (gap[1] - gap[0]); i++; } }
  return out; }
// terraced hillside: rows of far rooftops climbing a slope behind the town (rows at increasing distance + height), seeded jitter
export function terraces({seed = 1, centre = [0, 0], dir = 0, rows = 6, from = 60, step = 16, rise = 7, span = 220, density = 1} = {}) {
  const r = rng(seed), out = [], cd = Math.cos(dir), sd = Math.sin(dir);
  for (let k = 0; k < rows; k++) { const dist = from + k * step, y = k * rise, width = span * (1 + k * .08); let s = -width / 2;
    while (s < width / 2) { const name = MID_PRESETS[Math.floor(r() * MID_PRESETS.length)], h = housePreset(name, seed * 7919 + out.length), lx = s + h.w / 2, lz = -(dist + r() * step * .5);
      out.push({preset: name, at: [centre[0] + lx * cd + lz * sd, y, centre[1] - lx * sd + lz * cd], rotY: dir + (r() - .5) * .25, seed: seed * 7919 + out.length, row: k}); s += (h.w + 1 + r() * 4) / density; } }
  return out; }
// the far hillside height under the terraces (smooth ramp; flat town core): used by groundY and to sit the terrace houses
export function hillY(dist, {from = 50, step = 16, rise = 7} = {}) { if (dist <= from - 8) return 0; const u = (dist - (from - 8)) / step; return Math.max(0, u * rise); }

// ---- TITAN's mountain: a dark faceted peak with a cave mouth (pure vertices; the three side makes the mesh) -----------------------
export function mountain({seed = 11, r = 150, h = 210, rings = 7, around = 18} = {}) {
  const R = rng(seed), V = [], ring = [];
  for (let i = 0; i <= rings; i++) { const u = i / rings, rr = r * (1 - u) ** 1.15, y = h * (1 - (1 - u) ** 1.6) * (i === rings ? 1 : 1), row = [];
    for (let j = 0; j < around; j++) { const a = 2 * Math.PI * j / around + (i % 2) * .08, n = i === rings ? 0 : 1 + (R() - .5) * .35; row.push([Math.sin(a) * rr * n, y * (1 + (R() - .5) * .06 * (i < rings ? 1 : 0)), Math.cos(a) * rr * n]); }
    ring.push(row); }
  for (let i = 0; i < rings; i++) for (let j = 0; j < around; j++) { const a = ring[i][j], b = ring[i][(j + 1) % around], c = ring[i + 1][j], d = ring[i + 1][(j + 1) % around]; V.push(a, b, d, a, d, c); }
  return V; }   // triangles (front = +z side holds the cave mouth: see CAVE)
export const CAVE = {u: .18, w: 34, h: 26};   // the cave mouth on the mountain's +z face at height u × h, size w × h (studs)
export const flatten = parts => parts.reduce((n, p) => n + (p.k === 'box' ? 12 : p.k === 'gable' ? 8 + (p.wall ? 2 : 0) : p.k === 'disc' ? 4 * (p.n ?? 8) : 0), 0);   // tris
