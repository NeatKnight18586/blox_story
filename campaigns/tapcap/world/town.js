// campaigns/tapcap/world/town.js — Slime Town plan from ONE seeded generator (pure: no three.js). Pass B revision.
//   layout() → fixed anchors (box, lane, Market Street, square, hill road, hill, S-path, stream, bridge, plinth, signpost)
//   planTown(seed, cams) → {buildings, props, crowd spots, skyline, zones} built FOR THE CAMERAS: an item is kept only if a camera
//   frustum sees it; within 5 H of a camera it is HERO (full detail), else MID (instanced); the skyline ring is FAR (always kept).
// Units = Slime Guy height H. Same seed + same cameras → identical town.
export const ZONE = {hero: 5, margin: .12};
export const ARCH = ['keycap', 'stacked', 'drip', 'tower'];
// the 9 TapCap colours (presets.js bodies) at 60 % of their saturation; heroes keep full saturation
const BODIES = ['#25BFFF', '#5A2A9C', '#FFA9D4', '#121217', '#FFE12E', '#FF781C', '#E3234E', '#B9875C', '#9A5CFF'];
export const PALETTE = BODIES.map(c => desat(c, .6));
export const rng = seed => { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

export function desat(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; s *= k;
  const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = l - C / 2;
  const [R, G, B] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
  return '#' + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ---------- fixed layout ----------
export const HILL = {at: [-24, -16], R: 10, h: 9, flat: 1.8};   // height:width = 9 : 20 ≈ 1 : 2.2
export const PLINTH = {base: {d: 1.8, h: .35}, top: {d: 1.4, h: .5, bevel: .08}, rim: {w: .02, color: '#2EE6D0'}};
export const hillY = (x, z) => { const r = Math.hypot(x - HILL.at[0], z - HILL.at[1]); if (r >= HILL.R) return 0; if (r <= HILL.flat) return HILL.h;
  const t = (r - HILL.flat) / (HILL.R - HILL.flat); return HILL.h * (1 - t * t * (3 - 2 * t)); };
export const TOWN_DIR = (() => { const x = -HILL.at[0], z = -HILL.at[1], l = Math.hypot(x, z); return [x / l, z / l]; })();   // hill → town
// S-curved path from the Hillside houses to the summit (polar around the hill centre, swinging ± 50°)
export function pathPoints(n = 80) {
  const a0 = Math.atan2(TOWN_DIR[1], TOWN_DIR[0]), out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, r = HILL.R + .8 - (HILL.R + .8 - .6) * t, a = a0 + .87 * Math.sin(2 * Math.PI * t) * (1 - t * .7);
    const x = HILL.at[0] + Math.cos(a) * r, z = HILL.at[1] + Math.sin(a) * r; out.push([x, hillY(x, z), z]); }
  return out;
}
export function pathSlope(pts = pathPoints()) {   // degrees: mean over the climb (rise / run along the path), and the steepest segment
  let run = 0, rise = 0, max = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]), h = pts[i][1] - pts[i - 1][1];
    run += d; rise += h; if (d > 1e-6) max = Math.max(max, Math.atan2(h, d) * 180 / Math.PI); }
  return {mean: +(Math.atan2(rise, run) * 180 / Math.PI).toFixed(1), max: +max.toFixed(1)};
}
export function layout() {
  const path = pathPoints(), sp = path[Math.round(path.length * .62)];
  return {
    box: {at: [0, 0], w: 16, d: 12, h: 5, door: {w: 3.6, h: 2.6}},
    lane: {x: [-2, 2], z: [6, 23]}, market: {z: [23, 29], x: [-30, 42]}, square: {at: [-9, 12], r: 4.2},
    hillRoad: [[-8.5, 3], [-16, -7.5]], hill: HILL, path,
    stream: Array.from({length: 26}, (_, i) => { const z = -34 + i * 4; return [22 + 2.2 * Math.sin(z * .09), z]; }),
    bridge: {at: [22 + 2.2 * Math.sin(26 * .09), 26], len: 7.4, w: 5},
    plinth: {at: [HILL.at[0], HILL.h, HILL.at[1]], top: [HILL.at[0], HILL.h + PLINTH.base.h + PLINTH.top.h, HILL.at[1]], face: TOWN_DIR},
    signpost: [sp[0], sp[1], sp[2]], trade: [12, 21.6],
    stalls: [[6, 21.6, 0], [28, 21.6, 0], [-6, 30.4, Math.PI], [16, 30.4, Math.PI], [33, 30.4, Math.PI]],
  };
}
// camera strings like "signpost+town:4.2,up:1.1" or "signpost"
export function resolveCam(c, L = layout()) {
  const pt = v => { if (Array.isArray(v)) return v; const [name, ...mods] = String(v).split('+'), b = [...{signpost: L.signpost, plinth: L.plinth.top}[name]];
    for (const m of mods.join('+').split(',').filter(Boolean)) { const [k, n] = m.split(':'), d = +n; if (k === 'town') { b[0] += TOWN_DIR[0] * d; b[2] += TOWN_DIR[1] * d; } if (k === 'up') b[1] += d; }
    if (name === 'signpost' && !mods.length) b[1] += 1.6; return b; };
  return {pos: pt(c.pos), look: pt(c.look), mm: c.mm, wide: !!c.wide};
}
// ---------- camera maths (pure) ----------
export const fovFor = mm => 2 * Math.atan(18 / mm);   // vertical, 9:16 frame on the 36 mm side
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export function camBasis(c) { const f = norm(sub(c.look, c.pos)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f); return {f, r, u, tv: Math.tan(fovFor(c.mm) / 2), th: Math.tan(fovFor(c.mm) / 2) * 9 / 16}; }
export function sees(c, p, rad = 0, margin = ZONE.margin) {   // bounding sphere (p, rad) inside the camera frustum (+ margin)
  const B = c._b ??= camBasis(c), v = sub(p, c.pos), z = dot(v, B.f); if (z < -rad || z > 400) return false;
  const zz = Math.max(z, .05), x = Math.abs(dot(v, B.r)) - rad, y = Math.abs(dot(v, B.u)) - rad;
  return x <= zz * B.th * (1 + margin) && y <= zz * B.tv * (1 + margin);
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// does a box footprint (centre, radius, top height) block the line from the camera to a target? (sightline corridors)
function blocks(c, target, at, rad, top) {
  const A = c.pos, d = sub(target, A), L2 = dot(d, d), t = Math.max(0, Math.min(1, ((at[0] - A[0]) * d[0] + (at[2] - A[2]) * d[2]) / (d[0] * d[0] + d[2] * d[2] || 1)));
  const px = A[0] + d[0] * t, pz = A[2] + d[2] * t, py = A[1] + d[1] * t; return L2 > 0 && Math.hypot(at[0] - px, at[2] - pz) < rad + .7 && top > py - .3;
}

// ---------- the town ----------
export function planTown(seed = 1102, cams = [], {sightlines = []} = {}) {
  const r = rng(seed), L = layout(), B = [], props = [];
  const box = L.box, inBox = (x, z, m = 0) => Math.abs(x - box.at[0]) < box.w / 2 + m && Math.abs(z - box.at[1]) < box.d / 2 + m;
  const onStreet = (x, z, m = 0) => (x > L.lane.x[0] - m && x < L.lane.x[1] + m && z > L.lane.z[0] - 1 && z < L.lane.z[1]) || (z > L.market.z[0] - m && z < L.market.z[1] + m)
    || Math.hypot(x - L.square.at[0], z - L.square.at[1]) < L.square.r + m || segDist([x, z], L.hillRoad[0], L.hillRoad[1]) < 2 + m;
  const nearStream = (x, z, m) => L.stream.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 2 + m);
  const nearPath = (x, z, m) => L.path.some(([px, , pz]) => Math.hypot(x - px, z - pz) < .9 + m);
  // frontage slots: [x, z, yaw (door → street), district]
  const slots = [];
  for (const s of [-1, 1]) for (let z = 8.0; z <= 21; z += 2.75) slots.push([s * 4.5, z, -s * Math.PI / 2, 'core']);
  for (const s of [-1, 1]) for (let z = 9.2; z <= 20; z += 3.4) slots.push([s * 8.6, z, -s * Math.PI / 2, 'core']);   // second row (rooftops over the first)
  for (const s of [-1, 1]) for (const z of [-3.6, 0, 3.6]) slots.push([s * 10.9, z, 0, 'core']);
  for (let x = -6.5; x <= 8.5; x += 3.6) slots.push([x, -9.4, Math.PI, 'core']);
  for (let x = -27; x <= 40; x += 3.3) { slots.push([x, 19.8, 0, 'market']); slots.push([x + 1.4, 32.2, Math.PI, 'market']); slots.push([x + .7, 36.4, Math.PI, 'market']); if (Math.abs(x) > 8) slots.push([x + .3, 16.0, 0, 'market']); }
  { const [a, b] = L.hillRoad, n = 8; for (let i = 0; i <= n; i++) { const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    for (const s of [-1, 1]) { const ox = -dz / l * 3.9 * s, oz = dx / l * 3.9 * s; slots.push([x + ox, z + oz, Math.atan2(-ox, -oz), 'hillroad']); } } }
  for (const [x, z] of [[-14.5, 9], [-14, 14.5], [-11, 17.4], [-5.5, 17.6], [-15.2, 5.2], [-13.6, 19.6], [-9.2, 20.4]]) slots.push([x, z, Math.atan2(L.square.at[0] - x, L.square.at[1] - z), 'square']);
  { const a0 = Math.atan2(TOWN_DIR[1], TOWN_DIR[0]); for (const [rr, n] of [[9.3, 9], [7.4, 6]]) for (let i = 0; i < n; i++) { const a = a0 - 1.25 + 2.5 * (i + .5) / n, x = HILL.at[0] + Math.cos(a) * rr, z = HILL.at[1] + Math.sin(a) * rr;
    slots.push([x, z, Math.atan2(Math.cos(a), Math.sin(a)), 'hillside']); } }
  for (let x = -40; x <= 52; x += 4.2) for (const z of [-26, -38, 44, 52]) slots.push([x + (z % 3), z, z > 0 ? Math.PI : 0, 'outer']);
  for (let z = -22; z <= 40; z += 4.2) for (const x of [-42, 48]) slots.push([x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, 'outer']);
  const camList = cams.map(c => c.pos ? c : resolveCam(c, L));
  for (const [x0, z0, yaw, district] of slots) {
    const x = x0 + (r() - .5) * .5, z = z0 + (r() - .5) * .5, scale = .85 + r() * .4, rad = 1.6 * scale;
    if (inBox(x, z, rad) || onStreet(x, z, rad - .4) || nearStream(x, z, rad) || (district === 'hillside' ? nearPath(x, z, rad) : false)) continue;
    let arch, color, tries = 0;
    do { arch = ARCH[Math.floor(r() * 4)]; color = Math.floor(r() * PALETTE.length); tries++; }
    while (tries < 40 && B.some(b => b.arch === arch && b.color === color && Math.hypot(b.x - x, b.z - z) < 5.2));   // no adjacent archetype + colour twin
    const floors = arch === 'tower' ? 3 + Math.floor(r() * 2) : arch === 'stacked' ? 2 + Math.floor(r() * 2) : 1;
    const height = scale * (arch === 'tower' ? floors * 1.45 + 1.1 : arch === 'stacked' ? [0, 2.2, 4.0, 5.4][floors] + .25 : arch === 'drip' ? 3.2 : 2.6);
    let roof; do roof = Math.floor(r() * PALETTE.length); while (roof === color);
    const yb = district === 'hillside' ? Math.max(...[[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 0]].map(([a, b]) => hillY(x + a * rad * .8, z + b * rad * .8))) + .05 : 0;
    const windows = 1 + Math.floor(r() * 3);
    const b = {id: B.length, arch, x: +x.toFixed(3), z: +z.toFixed(3), y: +yb.toFixed(3), yaw: +yaw.toFixed(4), scale: +scale.toFixed(3), color, roof, windows, floors, height: +height.toFixed(3), rad: +rad.toFixed(3), district};
    // build for the camera: kept only if some frustum sees it; hero within 5 H of a camera
    const ctr = [x, yb + height / 2, z], R = Math.hypot(rad, height / 2), seen = !camList.length || camList.some(c => sees(c, ctr, R));
    if (!seen) continue;
    if (camList.some(c => Math.hypot(c.pos[0] - x, c.pos[2] - z) < rad + 3.5 && c.pos[1] < yb + height + 2 && sees(c, ctr, R, 0))) continue;   // clearance: nothing fills a lens (in front of it only)
    if (sightlines.some(id => { const c = camList.find(k => k.id === id); return c && blocks(c, c.look, [x, 0, z], rad, yb + height); })) continue;   // keep hero sightlines to the hill clear
    b.zone = camList.some(c => dist(c.pos, ctr) - R <= ZONE.hero) ? 'hero' : 'mid'; B.push(b);
  }
  // street dressing (instanced): lamps every ~4 H, bunting across Market Street, fences, planters, crates
  const keep = (p, rad = .6) => !camList.length || camList.some(c => sees(c, p, rad));
  const add = (kind, x, z, yaw = 0, extra = {}) => { const y = hillY(x, z); const p = [x, y + .5, z]; if (inBox(x, z, .3) || !keep(p, 1.2) || (!extra.hero && camList.some(c => Math.hypot(c.pos[0] - x, c.pos[2] - z) < 2.2))) return;
    props.push({kind, x: +x.toFixed(3), y: +y.toFixed(3), z: +z.toFixed(3), yaw: +yaw.toFixed(4), zone: camList.some(c => dist(c.pos, p) <= ZONE.hero) ? 'hero' : 'mid', ...extra}); };
  for (let z = 7.5; z < 23; z += 4) for (const s of [-1, 1]) add('lamp', s * 2.45, z);
  for (let x = -28; x <= 40; x += 4) for (const zz of [L.market.z[0] - .3, L.market.z[1] + .3]) if (Math.abs(x - L.bridge.at[0]) > 4 && Math.abs(x) > 2.8) add('lamp', x + (zz > 26 ? 2 : 0), zz);
  { const [a, b] = L.hillRoad; for (let t = 0; t <= 1.001; t += .25) for (const s of [-1, 1]) add('lamp', a[0] + (b[0] - a[0]) * t + s * 1.9 * .82, a[1] + (b[1] - a[1]) * t + s * 1.9 * .57); }
  L.path.forEach((p, i) => { if (i % 16 === 8 && Math.hypot(p[0] - HILL.at[0], p[2] - HILL.at[1]) > HILL.flat + 3) add('lamp', p[0] + .9, p[2] + .5); });
  for (let x = -24; x <= 38; x += 6) if (Math.abs(x - L.bridge.at[0]) > 5) add('bunting', x, 26, 0, {span: L.market.z[1] - L.market.z[0] + .6});
  for (const s of [-1, 1]) for (let z = 7.8; z < 21.5; z += 1.6) if (r() < .7) add('fence', s * 2.95, z, Math.PI / 2);
  for (let i = 0; i < 26; i++) { const kind = r() < .5 ? 'planter' : 'crate', onLane = r() < .4, x = onLane ? (r() < .5 ? -1 : 1) * (2.3 + r() * .3) : -26 + r() * 64, z = onLane ? 7 + r() * 15 : (r() < .5 ? L.market.z[0] + .4 : L.market.z[1] - .4);
    if (!nearStream(x, z, .5)) add(kind, x, z, r() * Math.PI); }
  for (const [x, z] of [[-11.5, 10.5], [-6.6, 14.4], [-9, 8.7], [-12.2, 14.2]]) add(r() < .5 ? 'planter' : 'crate', x, z, r());
  // build for the camera: every wide gets one hero prop (a lamp) in its foreground, 3.2 H ahead and 1.3 H to the side
  // (first ground point along the view that the frame sees: 3.2 H ahead for street cameras, further out for aerials)
  for (const c of camList.filter(k => k.wide)) { const B0 = camBasis(c), fx = B0.f[0], fz = B0.f[2], l = Math.hypot(fx, fz) || 1;
    const cands = [3.2, 4.5, 6].map(d => [c.pos[0] + fx / l * d - fz / l * 1.3, c.pos[2] + fz / l * d + fx / l * 1.3]).concat([.3, .4, .5, .6].map(t => [c.pos[0] + (c.look[0] - c.pos[0]) * t + 1.2, c.pos[2] + (c.look[2] - c.pos[2]) * t]));
    const summit = (x, z) => Math.hypot(x - HILL.at[0], z - HILL.at[1]) < HILL.flat + 3 || nearPath(x, z, .6);   // the summit stays clear (plinth + signpost only)
    const hit = cands.find(([x, z]) => sees(c, [x, hillY(x, z) + 1, z], .3, 0) && !summit(x, z) && !B.some(b => Math.hypot(b.x - x, b.z - z) < b.rad + .4) && !inBox(x, z, .3));
    if (hit) { const [x, z] = hit; add('lamp', x, z, 0, {hero: true}); add('crate', x + .9, z + .3, .4, {hero: true}); add('crate', x + .7, z - .6, 1.1, {hero: true}); add('planter', x - .8, z + .4, 0, {hero: true}); } }
  // far skyline ring (always kept) + crowd spots (square, lane, market; Core Row inside the box)
  const skyline = []; for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2 + r() * .03, rr = 78 + r() * 34; skyline.push({x: +(Math.cos(a) * rr).toFixed(2), z: +(Math.sin(a) * rr).toFixed(2), w: +(5 + r() * 6).toFixed(2), h: +(5 + r() * 11).toFixed(2), yaw: +(a + Math.PI / 2).toFixed(3), cap: r() < .35}); }
  return {seed, layout: L, buildings: B, props, skyline, counts: {buildings: B.length, hero: B.filter(b => b.zone === 'hero').length, props: props.length}};
}
function segDist(p, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t); }
// adjacency audit (pure): pairs within 5.2 H sharing archetype + colour (must be 0)
export const twinPairs = B => B.flatMap((a, i) => B.slice(i + 1).filter(b => a.arch === b.arch && a.color === b.color && Math.hypot(a.x - b.x, a.z - b.z) < 5.2).map(b => [a.id, b.id]));
