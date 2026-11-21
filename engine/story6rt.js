// engine/story6rt.js — E2 story mechanics, the renderer side (opt-in: spec.story6; engine/episode.js creates it). The maths is
// engine/story6.js (pure). Everything here is pure in t: a frame's state never depends on the frames drawn before it.
//   drains / blooms: per-mesh wash materials (a world-height wipe line between two states: colour, roughness, emissive lift);
//     a drained region ends exactly at the DUMMY material (#F2F2F4, roughness .85, lift .08); a bloom starts there.
//   crowd: the crowd's cast entries are driven here (owns), with the E1b distance LOD kept (both twins get the wash materials).
//   giant hand: the world's giantHand prop is placed on the pinch track (handTrack); held actors hang from the pinch, legs kicking.
//   tumble / thrown / dropped actors, the air catch, spawn pops, tags, splash, dust puffs and glow rings.
import * as T from 'three';
import * as S from './story6.js';
import {PROPS6, handRig} from '../parts/props.js';
import {sampleVerb, sampleCycle} from './acting6.js';

const HEADY = 4.62, CENTRE = 2.6;
const v3 = a => new T.Vector3(...a);
// ---- wash material: diffuse / roughness / emissive between two states across a world-height line ------------------------------
function washMaterial(src) {
  const m = src.clone(), U = {uCp: {value: new T.Color()}, uCn: {value: new T.Color()}, uRp: {value: .45}, uRn: {value: .45}, uLp: {value: 0}, uLn: {value: 0}, uFront: {value: -1e4}, uDir: {value: 1}, uSoft: {value: .15}};
  m.userData.wash = U; m.name = (src.name || 'mat') + '_wash';
  m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'varying float vWY;\nuniform vec3 uCp; uniform vec3 uCn; uniform float uRp; uniform float uRn; uniform float uLp; uniform float uLn; uniform float uFront; uniform float uDir; uniform float uSoft;\nfloat washW(){ return uDir > 0. ? smoothstep(-uSoft, uSoft, vWY - uFront) : smoothstep(-uSoft, uSoft, uFront - vWY); }\n' + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  float wW = washW(); diffuseColor.rgb = mix(uCp, uCn, wW);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(uRp, uRn, wW);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance = mix(uCp * uLp, uCn * uLn, wW);'); };
  m.customProgramCacheKey = () => 'wash6'; m.emissive = new T.Color('#000000'); return m;
}
const stateOf = m => ({colour: '#' + m.color.getHexString(), rough: m.roughness ?? .45, lift: m.emissive && m.emissiveIntensity ? (m.emissive.equals(m.color) ? m.emissiveIntensity : 0) : 0});
// Region membership of a mesh (body6 names; bg tier: torso / leftArm / leftLeg). The hero's head subtree is never in a region.
const R6 = {legs: /^(left|right)(Leg|LegEnd|KneeFill|LowerLeg)$/, shoes: /^(left|right)(Foot|Sole)$/, hands: /^(left|right)(Hand|Cuff)$/, torsoCore: /^(torso|lowerTorso|waistCap)$/, block: /^(upper|lower)Torso_/,
  sleeve: /^(left|right)(Arm|ArmEnd|ElbowFill|Sleeve)$/, lowerArm: /^(left|right)LowerArm$/};
function regionsOf(o, a, inHead) {
  const n = o.name, out = new Set(), strip = a.preset?.regions?.torso?.strip, sleeve = a.preset?.regions?.arms?.sleeve ?? 'wrist', isStrip = R6.block.test(n) && !!strip && n.toLowerCase().endsWith(new T.Color(strip).getHexString().toLowerCase());
  if (inHead) { out.add('allHead'); return out; }
  if (R6.legs.test(n)) out.add('legs'); if (R6.shoes.test(n)) out.add('shoes'); if (R6.hands.test(n)) { out.add('hands'); out.add('arms'); }
  if (R6.torsoCore.test(n) || R6.block.test(n)) { out.add('torso'); if (isStrip) out.add('stripe'); else out.add('jacket'); }
  if (R6.sleeve.test(n)) { out.add('jacket'); out.add('arms'); } if (R6.lowerArm.test(n)) { out.add(sleeve === 'wrist' ? 'jacket' : 'hands'); out.add('arms'); }
  if (a.tier === 'bg' && /^(left|right)Leg$/.test(n)) out.add('shoes');
  out.add('all'); return out;
}
function inHeadOf(o, a) { for (let p = o; p && p !== a.root; p = p.parent) if (p === a.pivots.head) return true; return false; }

export async function createStory6(ctx) {
  const {spec, scene, cast, FPS, markAt, markOf, markPos, driveActor, shots, cameraAt, groundY, anchorPos} = ctx, D = spec.story6, HERO = spec.hero ?? 'hero';
  const posBase = (n, t) => markAt(cast[n].c, t), yawBase = (n, t) => (markOf(cast[n].c, t).yaw ?? 0) * Math.PI / 180, kOf = n => cast[n].a.root.scale.x || 1;
  const nextMark = (n, t) => (cast[n].c.marks ?? []).map(m => m[0]).filter(x => x > t + 1e-6).sort((a, b) => a - b)[0] ?? Infinity;
  // ---- motion windows, built in time order (each event starts from where the earlier ones left the actor) ----------------------
  const W = {}, persist = {}, puffs = [], rings = [], win = (n, w) => (W[n] ??= []).push(w);
  const posAt = (n, t) => { for (const w of W[n] ?? []) if (t >= w.t0 && t < w.t1 && w.feet) { const f = w.feet(t); if (f) return f; } const p = (persist[n] ?? []).filter(x => t >= x.t && t < x.until).at(-1); return p ? [...p.pos] : posBase(n, t); };
  const keep = (n, t, pos) => (persist[n] ??= []).push({t, pos, until: nextMark(n, t)});
  const nearPool = p => { const pa = anchorPos('pool'); return pa && Math.abs(p[0] - pa[0]) < 9 && Math.abs(p[2] - (pa[2] + 6)) < 13; };
  const handEv = (D.hand ?? []).map(e => ({...e})).sort((a, b) => a.t - b.t), hmemo = new Map(), track = tt => { const k = tt.toFixed(5); if (!hmemo.has(k)) { if (hmemo.size > 64) hmemo.clear(); hmemo.set(k, S.handTrack(handEv, tt)); } return hmemo.get(k); }, evs = [
    ...(D.tumbles ?? []).map(e => ({kind: 'tumble', ...e})), ...(D.airCatch ?? []).map(e => ({kind: 'air', ...e})), ...handEv.map(e => Object.assign(e, {kind: 'hand'}))].sort((a, b) => a.t - b.t);   // the same objects: handTrack reads what each event resolves
  for (const e of evs) {
    if (e.kind === 'tumble') { const n = e.actor, from = posAt(n, e.t), yw = yawBase(n, e.t), k = kOf(n);
      const to0 = e.anchor ? anchorPos(e.anchor) : [from[0] + Math.sin(yw) * S.TUMBLE.dist, 0, from[2] + Math.cos(yw) * S.TUMBLE.dist], to = [to0[0], groundY(to0[0], to0[2]), to0[2]], o = {t0: e.t, from, to, k};
      const end = e.t + S.TUMBLE.dur + S.TUMBLE.rest + S.TUMBLE.up; win(n, {type: 'tumble', t0: e.t, t1: end, o, yaw: Math.atan2(to[0] - from[0], to[2] - from[2]), feet: tt => { const tb = S.tumbleAt(tt, o); return tb ? [tb.centre[0], to[1], tb.centre[2]] : null; }});
      if (!nearPool(to)) puffs.push({kind: 'puff', t: e.t + S.TUMBLE.dur, p: to, n: 12, size: 1.5}); keep(n, end, to); }
    else if (e.kind === 'hand') { if (e.act === 'grab') e.headAt = (p => [p[0], p[1] + HEADY * kOf(e.actor), p[2]])(posAt(e.actor, e.t));
      if (e.act === 'carry') { const a = anchorPos(e.anchor); e.anchorPos = [a[0], a[1] + HEADY * kOf(e.actor) + .35, a[2]]; e.groundAt = a; }
      if (e.act === 'throw') { const q = S.handTrack(handEv, e.t).Q ?? [0, 20, 0], tgt = e.anchor ? anchorPos(e.anchor) : [0, 0, 8], d = [tgt[0] - q[0], tgt[2] - q[2]], L = Math.hypot(...d) || 1; e.dir = [d[0] / L, 0, d[1] / L]; e.landPos = e.anchor ? tgt : [q[0] + d[0] / L * 14, 0, q[2] + d[1] / L * 14]; }
      if (e.act === 'grab') { const n = e.actor, tr = track, y0 = yawBase(n, e.t);
        const tRel = handEv.find(x => x.t > e.t && x.actor === n && (x.act === 'release' || x.act === 'throw')), tEnd = tRel ? tRel.t + (tRel.act === 'throw' ? S.HAND.swing : S.HAND.drop) : Infinity;
        win(n, {type: 'held', t0: e.t + S.HAND.approach, t1: tEnd, yaw: y0, feet: tt => { const Q = tr(tt).Q; return [Q[0], Q[1] - HEADY * kOf(n), Q[2]]; }}); }
      if (e.act === 'release' || e.act === 'throw') { const n = e.actor, tr = S.handTrack(handEv, e.t + (e.act === 'throw' ? S.HAND.swing : S.HAND.drop) + 1e-4), rel = tr.released.at(-1); if (!rel) continue;
        const from = [rel.from[0], rel.from[1] - HEADY * kOf(n), rel.from[2]], carry = handEv.filter(x => x.t < e.t && x.actor === n && x.act === 'carry').at(-1);
        if (e.act === 'throw') { const to = [e.landPos[0], groundY(e.landPos[0], e.landPos[2]), e.landPos[2]], o = {t0: rel.t, from, to, k: kOf(n), apex: 3, dur: .95}; const end = rel.t + .95 + S.TUMBLE.rest + S.TUMBLE.up; win(n, {type: 'tumble', t0: rel.t, t1: end, o, yaw: Math.atan2(to[0] - from[0], to[2] - from[2]), feet: tt => { const tb = S.tumbleAt(tt, o); return tb ? [tb.centre[0], to[1], tb.centre[2]] : null; }}); puffs.push({kind: 'puff', t: rel.t + .95, p: to, n: 12, size: 1.5}); keep(n, end, to); }
        else { const gy = carry && Math.hypot(from[0] - carry.groundAt[0], from[2] - carry.groundAt[2]) < 3 ? carry.groundAt[1] : groundY(from[0], from[2]), h = Math.max(0, from[1] - gy), tf = Math.sqrt(2 * h / S.G);
          win(n, {type: 'drop', t0: rel.t, t1: rel.t + tf, yaw: yawBase(n, e.t), feet: tt => { const s = tt - rel.t; return [from[0], Math.max(gy, from[1] - .5 * S.G * s * s), from[2]]; }});
          puffs.push({kind: 'puff', t: rel.t + tf, p: [from[0], gy, from[2]], n: 8, size: .8}); keep(n, rel.t + tf, [from[0], gy, from[2]]); } } }
    else if (e.kind === 'air') { const {hero: h, partner: p} = e, pf = posAt(p, e.t - S.AIR.fall), hf = posAt(h, e.t - S.AIR.jump), d = [hf[0] - pf[0], hf[2] - pf[2]], o = {tc: e.t, partnerFrom: pf, heroFrom: hf, dir: Math.hypot(...d) > .5 ? d : [0, -1], groundY};
      const A = S.airCatchAt(e.t, o); e.o = o; e.A = A;
      win(p, {type: 'fall', t0: e.t - S.AIR.fall, t1: e.t, yaw: Math.atan2(d[0], d[1]), feet: tt => { const q = S.airCatchAt(tt, o).partner; return [q[0], q[1], q[2]]; }});
      win(h, {type: 'air', t0: e.t - S.AIR.jump, t1: A.tLand, yaw: Math.atan2(-d[0], -d[1]), feet: tt => S.airCatchAt(tt, o).hero ?? hf});
      win(p, {type: 'rideAir', t0: e.t, t1: Infinity, lead: h, feet: () => null});
      puffs.push({kind: 'puff', t: A.tLand, p: A.landAt, n: 14, size: 1.8}); keep(h, A.tLand, A.landAt); }
  }
  for (const n of Object.keys(W)) W[n].sort((a, b) => a.t0 - b.t0);
  const winAt = (n, t) => (W[n] ?? []).filter(w => t >= w.t0 && t < w.t1).at(-1) ?? null;
  // the lead's displacement off its own mark (the carried partner rides it)
  const leadDelta = (n, t) => { const p = posAt(n, t), b = posBase(n, t); return [p[0] - b[0], p[1] - b[1], p[2] - b[2]]; };
  // ---- crowd ----------------------------------------------------------------------------------------------------------------------
  const CR = D.crowd ?? null, crowdNames = CR?.names ?? [], crowdIdx = new Map(crowdNames.map((n, i) => [n, i]));
  if (CR) { CR.n = crowdNames.length; CR.start = CR.startAt ? (p => [p[0], p[2]])(anchorPos(CR.startAt)) : CR.start ?? [0, 8]; CR.steps = CR.steps.map(s => ({...s, anchorPos: s.anchor ? anchorPos(s.anchor) : [CR.start[0], 0, CR.start[1]]})); CR.pile = S.pileSlots(crowdNames.length); }
  // ---- wash materials (drains, blooms) ------------------------------------------------------------------------------------------
  const twins = n => cast[n].lod ? [cast[n].lod.near, cast[n].lod.far] : [cast[n].a], washes = [], meshWash = new Map();
  const timeline = new Map();   // mesh → [{t, frames, dir, to: state | 'base', region, actor}]
  const addEv = (n, region, ev) => { for (const a of twins(n)) a.root.traverse(o => { if (!o.isMesh || o.name === 'face_decal' || o.isSprite) return; const head = inHeadOf(o, a);
      const isHero = n === HERO; if (head && (isHero || region !== 'all')) return; const rs = regionsOf(o, a, head); if (!(rs.has(region) || (head && region === 'all'))) return;
      if (!meshWash.has(o)) { if (Array.isArray(o.material) || !o.material?.isMeshStandardMaterial) return; const base = stateOf(o.material), wm = washMaterial(o.material); o.material = wm; meshWash.set(o, {base, U: wm.userData.wash, a, actor: n}); timeline.set(o, []); washes.push(o); }
      timeline.get(o).push({...ev, region}); }); };
  const extras = [];   // cheeks / nose (bloom extras), fading in
  const addExtra = (n, region, colour, t) => { for (const a of twins(n)) { const f = a.faceLayer ?? a.pivots.head, g = new T.Group(), mat = new T.MeshBasicMaterial({color: colour ?? (region === 'cheeks' ? '#FF8FB1' : '#FF9E80'), transparent: true, opacity: 0, depthWrite: false});
      if (region === 'cheeks') for (const s of [-1, 1]) { const c = new T.Mesh(new T.CircleGeometry(.13, 16), mat); c.position.set(s * .3, -.13, .62); g.add(c); }
      else { const b = new T.Mesh(new T.BoxGeometry(.16, .12, .1), mat); b.position.set(0, -.04, .64); g.add(b); }
      g.position.y = f === a.faceLayer ? 0 : .58; g.name = 'bloom_' + region; f.add(g); extras.push({g, mat, t, frames: S.BLOOM_FRAMES}); } };
  const WHITE = S.WHITE_STATE;
  for (const d of D.drains ?? []) { const e = S.drainError(d.actor, d.region, {hero: HERO}); if (e) throw Error('drain: ' + e); if (!cast[d.actor]) throw Error('drain: unknown actor ' + d.actor);
    addEv(d.actor, d.region, {t: d.t, frames: S.DRAIN_FRAMES, dir: 'down', to: WHITE, actor: d.actor}); }
  const bloomOf = (b, glow = true) => { if (!cast[b.actor]) throw Error('bloom: unknown actor ' + b.actor);
    if (b.region === 'cheeks' || b.region === 'nose') addExtra(b.actor, b.region, b.colour, b.t);
    else addEv(b.actor, b.region, {t: b.t, frames: S.BLOOM_FRAMES, dir: 'up', to: b.colour ? {colour: b.colour, rough: .5, lift: .05} : 'base', actor: b.actor});
    if (glow) rings.push({kind: 'glow', t: b.t, actor: b.actor, colour: b.colour ?? '#FFE9A8'}); };
  for (const b of (D.blooms ?? []).filter(b => !b.crowd)) bloomOf(b);
  // crowd bloom: members chosen lazily from the shot's camera at the bloom time (pure: the camera is a function of t)
  const crowdBlooms = (D.blooms ?? []).filter(b => b.crowd), dummyNames = Object.keys(cast).filter(n => cast[n].c.troupe === 'DUMMY');
  for (const b of crowdBlooms) { b.plan = null; for (const n of dummyNames) for (const r of S.CROWD_RANDOM) if (r !== 'cheeks') addEv(n, r, {t: Infinity, frames: 1, dir: 'up', to: WHITE, placeholder: true}); }
  const pcam = new T.PerspectiveCamera(50, 9 / 16, .1, 2000);
  const planCrowdBloom = b => { if (b.plan) return b.plan; const c = cameraAt(b.t); pcam.fov = c.fov; pcam.position.set(...c.position); pcam.lookAt(...c.target); pcam.updateMatrixWorld(); pcam.updateProjectionMatrix();
    const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(pcam.projectionMatrix, pcam.matrixWorldInverse));
    const members = dummyNames.map(n => ({name: n, p: actorPos(n, b.t)})).filter(m => fr.containsPoint(new T.Vector3(m.p[0], m.p[1] + 2.5, m.p[2])));
    b.plan = S.crowdBloomPlan(members, actorPos(HERO, b.t), b.t);
    for (const m of b.plan) { if (m.region === 'cheeks') addExtra(m.actor, 'cheeks', m.colour, m.t); else for (const o of washes) { const w = meshWash.get(o); if (w.actor !== m.actor) continue; const tl = timeline.get(o); if (regionsOf(o, w.a, false).has(m.region)) tl.push({t: m.t, frames: S.BLOOM_FRAMES, dir: 'up', to: {colour: m.colour, rough: .5, lift: .05}, region: m.region}); }
      rings.push({kind: 'glow', t: m.t, actor: m.actor, colour: m.colour}); }
    for (const tl of timeline.values()) { for (let i = tl.length - 1; i >= 0; i--) if (tl[i].placeholder) tl.splice(i, 1); tl.sort((a, b) => a.t - b.t); }
    return b.plan; };
  for (const tl of timeline.values()) tl.sort((a, b) => a.t - b.t);
  // drain puffs: 8 grey particles at the region's middle
  for (const d of D.drains ?? []) puffs.push({kind: 'puff', t: d.t, actor: d.actor, region: d.region, p: null, n: S.PUFF_N, size: .55, colour: '#9A9A9A'});
  for (const s of D.splashes ?? []) { const p = anchorPos(s.anchor ?? 'pool'); puffs.push({kind: 'splash', t: s.t, p: [p[0], p[1] + .42, p[2] + (s.anchor === 'pool' || !s.anchor ? 0 : 0)]}); rings.push({kind: 'ripple', t: s.t, p: [p[0], p[1] + .41, p[2]], colour: '#CFEFFF'}); }
  // ---- spawn, tags --------------------------------------------------------------------------------------------------------------
  const spawnOf = Object.fromEntries((D.spawns ?? []).map(s => [s.actor, s.t]));
  for (const tg of D.tags ?? []) { if (!cast[tg.actor]) throw Error('tag: unknown actor ' + tg.actor); for (const a of twins(tg.actor)) { const k = a.root.scale.x || 1, g = PROPS6.nameTag({text: tg.text, height: .75 / k, lift: 5.9}); g.name = 'tag6_' + tg.actor; g.visible = false; g.userData.t = tg.t; a.root.add(g); } }
  // ---- shared render objects: particles (instanced), rings (instanced, additive: colour → black fades) --------------------------
  const PCAP = 700, pMesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({color: '#ffffff'}), PCAP); pMesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(PCAP * 3), 3); pMesh.frustumCulled = false; pMesh.name = 'story6Particles'; pMesh.userData.live = true; scene.add(pMesh);
  const RCAP = 200, rg = new T.RingGeometry(.86, 1, 48); rg.rotateX(-Math.PI / 2);
  const rMesh = new T.InstancedMesh(rg, new T.MeshBasicMaterial({color: '#ffffff', transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false}), RCAP); rMesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(RCAP * 3), 3); rMesh.frustumCulled = false; rMesh.name = 'story6Rings'; rMesh.userData.live = true; scene.add(rMesh);
  let hand = scene.getObjectByName('giantHand'); if (handEv.length && !hand) { hand = PROPS6.giantHand(); hand.name = 'giantHand'; scene.add(hand); }
  const pad = scene.getObjectByName('spawnPad');
  // ---- actor positions (pure) -----------------------------------------------------------------------------------------------------
  function actorPos(n, t) { if (crowdIdx.has(n)) { const s = S.crowdAt(crowdIdx.get(n), t, CR, {pile: CR.pile}); return [s.p[0], groundY(s.p[0], s.p[1]), s.p[1]]; } return posAt(n, t); }
  const regionMid = (n, region) => { const a = cast[n].a, b = new T.Box3(); a.root.updateMatrixWorld(true); a.root.traverse(o => { if (o.isMesh && regionsOf(o, a, inHeadOf(o, a)).has(region)) b.expandByObject(o); }); return b.isEmpty() ? a.root.position.toArray() : b.getCenter(new T.Vector3()).toArray(); };
  const e3 = new T.Euler(), q = new T.Quaternion(), q2 = new T.Quaternion(), X = new T.Vector3(1, 0, 0), Yv = new T.Vector3(0, 1, 0);
  // root placed by its body centre (tumble / lying): centre world, yaw, rotation about the side axis
  function placeByCentre(a, centre, yaw, spin, k) { q.setFromAxisAngle(Yv, yaw); q2.setFromAxisAngle(X, spin); a.root.quaternion.copy(q).multiply(q2); const off = new T.Vector3(0, CENTRE * k, 0).applyQuaternion(a.root.quaternion); a.root.position.set(centre[0] - off.x, centre[1] - off.y, centre[2] - off.z); }
  const piv = (a, n) => a.pivots[n];
  function limbsLoose(a, lag, t, amp = 1) {   // arms trail the spin by `lag` (rad); legs bend and kick
    const s1 = Math.sin(t * 2 * Math.PI * 2.2), s2 = Math.sin(t * 2 * Math.PI * 2.9 + 1);
    for (const [n, v] of [['leftShoulder', lag + .35 * s1], ['rightShoulder', lag - .35 * s1]]) { const p = piv(a, n); if (p) { p.rotation.x = v * amp; p.rotation.z = (n[0] === 'l' ? -1 : 1) * (.5 + .2 * s2) * amp; } }
    for (const [n, v] of [['leftHip', Math.max(-1.75, lag * .7) + .45 * s2], ['rightHip', Math.max(-1.75, lag * .7) - .45 * s2]]) { const p = piv(a, n); if (p) { p.rotation.x = v * amp; p.rotation.z = (n[0] === 'l' ? -1 : 1) * .25 * amp; } }
    for (const n of ['leftKnee', 'rightKnee']) { const p = piv(a, n); if (p) p.rotation.x = (.7 + .3 * s1) * amp; }
    for (const n of ['leftElbow', 'rightElbow']) { const p = piv(a, n); if (p) p.rotation.x = -(.6 + .3 * s2) * amp; }
  }
  function kick(a, t) {   // held by the head: legs kick (tumble limbs), arms flail up
    const s = Math.sin(t * 2 * Math.PI * 3), c = Math.cos(t * 2 * Math.PI * 3);
    for (const [n, v] of [['leftHip', -.6 * s - .2], ['rightHip', .6 * s - .2]]) { const p = piv(a, n); if (p) p.rotation.set(v, 0, n[0] === 'l' ? -.15 : .15); }
    for (const [n, v] of [['leftKnee', .5 + .45 * c], ['rightKnee', .5 - .45 * c]]) { const p = piv(a, n); if (p) p.rotation.x = v; }
    for (const [n, v] of [['leftShoulder', -2.4 + .4 * c], ['rightShoulder', -2.4 - .4 * c]]) { const p = piv(a, n); if (p) p.rotation.set(v, 0, n[0] === 'l' ? -.4 : .4); }
  }
  // ---- per-actor hooks ----------------------------------------------------------------------------------------------------------
  const api = {
    owns: n => crowdIdx.has(n),
    drive(n, x, t, out) {   // crowd: behaviour → position, cycle / pose, lying in the pile, flop
      const i = crowdIdx.get(n), st = S.crowdAt(i, t, CR, {pile: CR.pile}), a = x.a, gy = groundY(st.p[0], st.p[1]), pos = [st.p[0], gy, st.p[1]], near = a.tier !== 'bg', build = a.build;
      const cyc = st.moving ? (st.pose === 'run' ? 'sprint' : st.lean ? 'sad_walk' : 'walk') : null;
      if (st.flopT !== null && t >= st.flopT) driveActor(a, t, {keys: [[0, 'idle']], acting: () => sampleVerb('knees_collapse', t - st.flopT, {build, seed: i + 1}).sample, faces: x.c.faces, origin: {position: pos, yaw: st.yaw}, fps: FPS});
      else if (cyc && near) driveActor(a, t, {keys: [[0, 'idle']], acting: () => sampleCycle(cyc, t + i * .37, {build}).sample, faces: x.c.faces, origin: {position: pos, yaw: st.yaw}, fps: FPS});
      else driveActor(a, t, {keys: [[0, st.moving ? (st.pose === 'run' ? 'run' : 'walk') : st.pose === 'cheer' ? 'cheer' : 'idle']], faces: x.c.faces, origin: {position: pos, yaw: st.yaw}, fps: FPS});
      if (st.lean) a.root.rotateX(st.lean * Math.PI / 180);
      if (st.lie) { const L = st.lie, u = L.u, k = a.root.scale.x || 1, c0 = [L.from[0], groundY(L.from[0], L.from[1]) + CENTRE * k, L.from[1]], c = [c0[0] + (L.to[0] - c0[0]) * u, c0[1] + (L.to[1] - c0[1]) * u + 4 * L.hop * u * (1 - u), c0[2] + (L.to[2] - c0[2]) * u];
        if (u > 0) { placeByCentre(a, c, st.yaw + (L.yaw - st.yaw) * Math.min(1, u * 1.4), L.face * Math.PI / 2 * Math.min(1, u * 1.2), k); if (u < 1) limbsLoose(a, -.8 * Math.sin(Math.PI * u), t, .7); } }
      markPos[n] = pos; out[n] = pos; api.post(n, x, t, out, true);
    },
    post(n, x, t, out, crowd = false) {
      const a = x.a, k = a.root.scale.x || 1;
      if (!crowd) { const w = winAt(n, t);
        if (w?.type === 'tumble') { const tb = S.tumbleAt(t, w.o); if (tb) { placeByCentre(a, tb.centre, w.yaw, tb.spin, k); if (tb.phase === 'air') limbsLoose(a, tb.lag, t); else if (tb.phase === 'lie') limbsLoose(a, 0, t, .25); markPos[n] = [tb.centre[0], w.o.to[1], tb.centre[2]]; } }
        else if (w?.type === 'held' || w?.type === 'drop' || w?.type === 'fall') { const f = w.feet(t); a.root.position.set(...f); a.root.rotation.set(0, w.yaw, w.type === 'held' ? .12 * Math.sin(t * 5) : 0); kick(a, t); if (w.type === 'fall') a.root.rotateX(-.25); markPos[n] = f; }
        else if (w?.type === 'air') { const f = w.feet(t), b = posBase(n, t); a.root.position.x += f[0] - b[0]; a.root.position.y += f[1] - b[1]; a.root.position.z += f[2] - b[2]; markPos[n] = f; }
        else if (w?.type === 'rideAir') { const d = leadDelta(w.lead, t); a.root.position.x += d[0]; a.root.position.y += d[1]; a.root.position.z += d[2]; markPos[n] = a.root.position.toArray(); }
        else { const p = (persist[n] ?? []).filter(x2 => t >= x2.t && t < x2.until).at(-1); if (p) { const b = posBase(n, t); a.root.position.x += p.pos[0] - b[0]; a.root.position.y += p.pos[1] - b[1]; a.root.position.z += p.pos[2] - b[2]; markPos[n] = [...p.pos]; } }
        if (out) out[n] = markPos[n]; }
      if (n in spawnOf) { const s = S.popScale(t, spawnOf[n], FPS), vis = (x.c.visible ?? []).filter(([t0]) => t >= t0).at(-1)?.[1] ?? true; a.root.visible = vis && s > 0; if (s > 0) a.root.scale.setScalar((a.preset?.scale ?? 1) * s); }
      for (const c of a.root.children) if (c.name?.startsWith('tag6_')) c.visible = t >= c.userData.t;
    },
    lodNear(t) { for (const b of crowdBlooms) { const sh = shots.findLast(s => b.t * FPS >= s.start); if (sh && t * FPS >= sh.start && t * FPS < sh.start + sh.frames) return S.BLOOM_LOD_NEAR; } return null; },   // the bloom shot: the nearest 24 within 36 studs (2 × the 18 of the LOD) show full detail
    frame(t) {
      for (const b of crowdBlooms) if (t >= b.t - .05) planCrowdBloom(b);
      // wash uniforms
      for (const o of washes) { const w = meshWash.get(o), tl = timeline.get(o), U = w.U; let prev = w.base, cur = null;
        for (const ev of tl) { if (ev.placeholder || ev.t > t) break; if (cur) prev = cur.to === 'base' ? w.base : cur.to; cur = ev; }
        const P = prev, N = cur ? (cur.to === 'base' ? w.base : cur.to) : prev; U.uCp.value.set(P.colour); U.uCn.value.set(N.colour); U.uRp.value = P.rough; U.uRn.value = N.rough; U.uLp.value = P.lift; U.uLn.value = N.lift;
        if (!cur) { U.uFront.value = 1e4; U.uDir.value = 1; continue; }
        const a = w.a, k = a.root.scale.x || 1, y0 = a.root.position.y, u = (t - cur.t) * FPS / cur.frames, top = y0 + 5.4 * k, bot = y0 - .1;
        U.uDir.value = cur.dir === 'down' ? 1 : -1; U.uFront.value = S.washFront(u, top, bot, cur.dir); }
      for (const e of extras) e.mat.opacity = .85 * Math.min(1, Math.max(0, (t - e.t) * FPS / e.frames));
      // particles
      let np = 0; const M = new T.Matrix4(), col = new T.Color();
      for (const pf of puffs) { if (t < pf.t || t > pf.t + 1.2) continue; const p = pf.p ?? (pf.actor ? regionMid(pf.actor, pf.region) : [0, 0, 0]);
        for (const s of S.particlesAt({...pf, p}, t)) { if (np >= PCAP) break; M.makeScale(s.s, s.s, s.s).setPosition(...s.p); pMesh.setMatrixAt(np, M); pMesh.setColorAt(np, col.set(s.colour)); np++; } }
      pMesh.count = np; pMesh.instanceMatrix.needsUpdate = true; if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true; pMesh.visible = np > 0;
      let nr = 0;
      for (const r of rings) { const g = r.kind === 'ripple' ? S.rippleAt(r, t) : S.glowAt(r, t); if (!g || nr >= RCAP) continue; const p = r.p ?? (m => [m[0], m[1] + .12, m[2]])(actorPos(r.actor, r.t));
        M.makeScale(g.r, 1, g.r).setPosition(...p); rMesh.setMatrixAt(nr, M); rMesh.setColorAt(nr, col.set(r.colour).multiplyScalar(g.opacity)); nr++; }
      rMesh.count = nr; rMesh.instanceMatrix.needsUpdate = true; if (rMesh.instanceColor) rMesh.instanceColor.needsUpdate = true; rMesh.visible = nr > 0;
      // hand
      if (hand && handEv.length) { hmemo.clear(); const h = track(t); hand.visible = h.visible;
        if (h.visible && h.Q) { hand.userData.set({pose: h.pose, grip: h.grip}); const R = handRig(h.pose, h.grip), L = R.thumb[1].to.map((v, i) => (v + R.index[1].to[i]) / 2);
          hand.rotation.set(S.HAND_PITCH, S.HAND_YAW, 0, 'YXZ'); const off = v3(L).applyEuler(hand.rotation); hand.position.set(h.Q[0] - off.x, h.Q[1] - off.y, h.Q[2] - off.z); } }
      if (pad && D.spawns?.length) { let f = 0; for (const s of D.spawns) f = Math.max(f, S.flashAt(t, s.t)); pad.userData.set({flash: f}); }
    },
    actorPos, windows: W, persist, handEv, puffs, rings,
    airCatches: (D.airCatch ?? []).map(e => ({...e, catchAt: e.A?.catchAt, landAt: e.A?.landAt, tLand: e.A?.tLand})),
  };
  return api;
}
