// engine/presets6.js — Retention Engine camera presets + lenses (Phase 4; docs/bible/CINEMA.md R-CAM-*, R-LENS-01, R-LOOK-05).
// Pure: preset(name, opts) → shot fields for the existing moves in engine/camera.js (from/to poses, move, extras).
// A preset needs only a target + duration + intensity; framing distance comes from the lens and the shot size.
//   preset('push', {target: [x, y, z], dur: 1.8, intensity: 1, size: 'medium', az: 30})
// opts: target (look point), dur (s), intensity (0–2, default 1: how much the camera travels), size (wide|medium|close|insert),
//       lens (wide|action|emotion|macro; default from size), az (deg: camera azimuth around the target, 0 = +z), ground (y),
//       subjectH (world units, default 5.3 = adult R6), objH (insert object height, default .8), dutch (deg roll), subject, follow,
//       base: {dist, dy, fov} — start from a known-clear camera (e.g. a hand-placed one) instead of the lens/size fit; the preset adds its motion.
// loopify(shots) / loopScore(a, b): the loop helper (R-LOOP-01) — the last shot ends on shot 1's opening pose.

export const mmToFov = mm => +(2 * Math.atan(18 / mm) * 180 / Math.PI).toFixed(2);   // full-frame equivalent on the 36 mm vertical side
export const LENS = {wide: 21, action: 35, emotion: 85, macro: 100};                 // mm (R-LENS-01: 18–24 / 35 / 85+)
export const LENS_FOR_SIZE = {wide: 'wide', medium: 'action', close: 'emotion', insert: 'macro'};
// what fills the frame per size: [span as a fraction of subjectH (insert: of objH), fraction of frame height]
const FRAME = {wide: [1, .22], medium: [.62, .72], close: [.26, .42], insert: [1, .45]};
export const PRESETS = ['push', 'pull', 'orbit', 'tiltDown', 'craneUp', 'track', 'whipZoom', 'snapZoom', 'macroInsert', 'aerialReveal'];
export const CLASS = {aerialReveal: 'wide', macroInsert: 'macro'};

const add = (a, b) => a.map((v, i) => v + b[i]), scale = (a, k) => a.map(v => v * k), r3 = a => a.map(v => +v.toFixed(3));
const fitDist = (span, frac, fov) => span / (2 * Math.tan(fov * Math.PI / 360) * frac);

export function framing({size = 'medium', lens, subjectH = 5.3, objH = .8} = {}) {
  const L = lens ?? LENS_FOR_SIZE[size] ?? 'action', fov = mmToFov(LENS[L] ?? L), [k, frac] = FRAME[size] ?? FRAME.medium;
  const span = (size === 'insert' ? objH : subjectH) * k;
  return {lens: L, fov, span, dist: fitDist(span, frac, fov)};
}

// camera position at distance d, azimuth az (deg), height dy above the target
const at = (target, d, az, dy) => { const a = az * Math.PI / 180; return add(target, [Math.sin(a) * d, dy, Math.cos(a) * d]); };
const pose = (position, target, fov) => ({position: r3(position), target: r3(target), fov: +fov.toFixed(2)});

export function preset(name, o = {}) {
  if (!PRESETS.includes(name)) throw Error(`unknown preset ${name} (${PRESETS.join(', ')})`);
  const I = Math.max(0, Math.min(2, o.intensity ?? 1)), az = o.az ?? 0, target = o.target ?? [0, 2.5, 0], g = o.ground ?? 0;
  const size = o.size ?? ({aerialReveal: 'wide', macroInsert: 'insert', snapZoom: 'close', whipZoom: 'close'}[name] ?? 'medium');
  const F0 = framing({size, lens: o.lens, subjectH: o.subjectH, objH: o.objH}), F = o.base?.fov ? {...F0, fov: o.base.fov} : F0;
  const d = o.base?.dist ?? F.dist, fov = F.fov;
  // R-LOOK-05: low angle — the camera sits a little below the look point (never under ground + .5), looking slightly up
  const low = y => Math.max(g + .5, y);
  const dyLow = o.base?.dy ?? (low(target[1] - .22 * F.span) - target[1]);
  const base = {size, lens: F.lens, mm: LENS[F.lens], preset: name, intensity: I, ...(o.dutch ? {dutch: o.dutch} : {}), ...(o.subject ? {subject: o.subject} : {})};
  const P = (d1, dy1, tgt = target, f = fov, a = az) => pose(at(tgt, d1, a, dy1), tgt, f);
  // pan-speed budget (camera.js SPEED_CAP .35 frame widths/s; keep .30 with a 1.6× ease peak): how far the view may sweep in this shot
  const dur = o.dur ?? 1.8, halfW = Math.tan(Math.atan(Math.tan(fov * Math.PI / 360) * 9 / 16)), sweep = .30 / 1.6 * dur;   // fraction of frame width
  const capRad = sweep * 2 * halfW;   // orbit/track: angle (rad) ≈ lateral travel / distance the view may turn
  switch (name) {
    case 'push': {   // slow push-in; emotion lens pushes less (R-CAM-03)
      const k = (F.lens === 'emotion' ? .06 : .12) * I;
      return {...base, move: 'push', ease: 'inOutSine', from: P(d, dyLow), to: P(d * (1 - k), dyLow * (1 - k))};
    }
    case 'pull': {
      const k = .15 * I;
      return {...base, move: 'pull', ease: 'inOutSine', from: P(d * (1 - k), dyLow), to: P(d, dyLow)};
    }
    case 'orbit':
      return {...base, move: 'orbit', degrees: +Math.min(24 * I, capRad * 180 / Math.PI).toFixed(1), ease: 'inOutSine', from: P(d, dyLow), to: P(d, dyLow)};
    case 'tiltDown': {   // the look point drops from above the subject onto it; the camera sinks a little
      const up = add(target, [0, Math.min(.9 * F.span * I, capRad * d), 0]);   // the speed metric counts vertical travel in frame widths too
      return {...base, move: 'crane', ease: 'inOutCubic', from: pose(at(target, d, az, dyLow + .12 * F.span * I), up, fov), to: P(d, dyLow)};
    }
    case 'craneUp': {   // rises from near the ground to above the subject, still looking at it
      return {...base, move: 'crane', ease: 'inOutSine', from: pose(at(target, d, az, low(g + .6) - target[1]), target, fov),
        to: pose(at(target, d * 1.1, az, .5 * d * I), target, fov)};
    }
    case 'track': {   // lateral dolly across the subject (follow an actor with `follow` for the engine's offset track)
      const a = az * Math.PI / 180, side = [Math.cos(a), 0, -Math.sin(a)], s = Math.min(.22 * d * I, capRad * d / 2 / .5);   // target moves half as far as the camera
      const c = at(target, d, az, dyLow);
      if (o.follow) return {...base, move: 'track', follow: o.follow, from: pose(add(sub0(c, target), scale(side, -s)), [0, target[1] - (o.followY ?? 0), 0], fov), to: pose(add(sub0(c, target), scale(side, s)), [0, target[1] - (o.followY ?? 0), 0], fov)};
      return {...base, move: 'crane', ease: 'linear', from: pose(add(c, scale(side, -s)), add(target, scale(side, -s * .5)), fov), to: pose(add(c, scale(side, s)), add(target, scale(side, s * .5)), fov)};
    }
    case 'whipZoom': {   // R-CAM-03 clues: a 5-frame crash zoom from an action framing onto the clue
      const wide = framing({size: 'medium', lens: 'action', subjectH: o.subjectH});
      const toFov = Math.max(8, fov / (.7 + .3 * I));
      return {...base, move: 'crashZoom', zoomAt: +Math.min(.2, (o.dur ?? 1.8) * .12).toFixed(3), from: P(wide.dist, dyLow, target, wide.fov), to: {fov: +toFov.toFixed(2)}};
    }
    case 'snapZoom': {   // R-CAM-03 reveals: 2-frame same-axis snap from a wide onto the close
      const w = framing({size: 'wide', subjectH: o.subjectH});
      return {...base, move: 'snap', snapAt: +Math.min(.25, (o.dur ?? 1.8) * .2).toFixed(3), from: P(w.dist * .6, dyLow, target, w.fov), to: P(d, dyLow)};
    }
    case 'macroInsert': {   // macro on an object, low and close, small push
      const k = .08 * I;
      return {...base, move: 'push', ease: 'inOutSine', from: P(d, -.15 * F.span), to: P(d * (1 - k), -.15 * F.span * (1 - k))};
    }
    case 'aerialReveal': {   // R-CAM-02 scale: from near and low-high to far and high, looking down at the subject
      return {...base, move: 'crane', ease: 'inOutSine', from: pose(at(target, d * .55, az, .35 * d), target, fov),
        to: pose(at(target, d * (1 + .5 * I), az, (.55 + .3 * I) * d), target, fov)};
    }
  }
}
const sub0 = (a, b) => a.map((v, i) => v - b[i]);

// Loop helper (R-LOOP-01): the final shot ends on shot 1's opening pose (same composition → seamless restart).
export function openingPose(s) { return s.from ? {position: s.from.position, target: s.from.target, fov: s.from.fov} : null; }
export function endingPose(s) { const e = s.to ?? {}; return s.from ? {position: e.position ?? s.from.position, target: e.target ?? s.from.target, fov: e.fov ?? s.from.fov} : null; }
export function loopify(shots) {
  const first = shots[0], last = shots.at(-1), p = first && openingPose(first);
  if (!p || !last || last === first) return shots;
  const out = shots.slice(0, -1);
  // generic interpolation from wherever the last shot starts to the opening pose (orbit/crash/snap keep their own math, so they become a push)
  const lerpMoves = ['push', 'pull', 'crane'];
  out.push({...last, move: lerpMoves.includes(last.move) ? last.move : 'push', to: {position: [...p.position], target: [...p.target], fov: p.fov}, loop: true});
  return out;
}
// metric: how far the last frame's camera is from frame 1's, relative to frame 1's camera–target distance; fov difference (deg)
export function loopScore(first, last) {
  const a = openingPose(first), b = endingPose(last);
  if (!a || !b) return null;
  const d = (u, v) => Math.hypot(...u.map((x, i) => x - v[i])), ref = d(a.position, a.target) || 1;
  return {pos: +(d(a.position, b.position) / ref).toFixed(3), target: +(d(a.target, b.target) / ref).toFixed(3), fov: +Math.abs((a.fov ?? 40) - (b.fov ?? 40)).toFixed(2)};
}
export const LOOP_OK = {pos: .15, target: .15, fov: 5};
export const loopOk = s => !!s && s.pos <= LOOP_OK.pos && s.target <= LOOP_OK.target && s.fov <= LOOP_OK.fov;
