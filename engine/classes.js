// engine/classes.js — the class reveal (Amendment A3) as pure data and pure maths. No THREE, no DOM.
//   expandClassReveal(r)  → {effects, patch}: the ~1.1 s transformation as ordinary effect entries + cast timeline patches
//   applyPatch(cast, patch) merges the patches into an actor's timelines (tools, keys, tags, kit = the accessory timeline)
//   cardState(t)          → the class card's motion at t seconds after it starts (slam, hold, shine, fly into the tag)
//   cardRect(anchor, kind, aspect) → where the card sits on screen (frame fractions), clamped to the safe area
// A reveal {actor, cls, at, tier?, card?, cardScale?, cardDx?} starts when the plain sword pops free (at, episode seconds):
//   0.00 light pillar · 0.12 highlight flash (2 frames) + ground ring + shake ≤ 0.03 · 0.15–0.45 plain sword squashes
//   into light while the class sword grows in (outBack, half spin) · 0.45 signature burst, hero pose, accessory ·
//   0.55 class card slams in (cardDx shifts it sideways off a raised blade; it still flies into the tag) · 0.55 + 1.30 card flies into the name tag, which turns class-coloured.
import {CLASSES} from '../parts/props.js';

export const T_REVEAL = {pillar: 0, flash: .12, morph: [.15, .45], burst: .45, card: .55, hold: 1.3, fly: .35, idle: 2.6};
export const CARD = {
  big: {w: .46, minCap: .045},            // fraction of frame width; class-name cap height ≥ 4.5 % of frame height
  mini: {w: .22, minCap: .022},           // the wide reveal wave: small but readable (A3 C6)
  aspect: 512 / 640,                      // card canvas w / h
  capOfHeight: .19,                       // the class name's cap height as a fraction of the card's height
  safe: {x: [.1, .9], y: [.1, .56], band: [.6, .72]},
};
const FPS = 30;
const clamp01 = x => Math.min(1, Math.max(0, x));
const outBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

// Card motion, t = seconds since the card starts. null when not on screen.
export function cardState(t) {
  if (t < 0) return null;
  const f = t * FPS, flyStart = T_REVEAL.hold, flyEnd = T_REVEAL.hold + T_REVEAL.fly;
  if (t > flyEnd) return null;
  const slam = f < 8 ? 1.4 - .4 * outBack(f / 8) : 1;
  const fly = t > flyStart ? smooth((t - flyStart) / T_REVEAL.fly) : 0;
  return {scale: slam * (1 - .85 * fly), fly, alpha: 1 - fly * fly, shine: clamp01((t - .2) / .5), landed: f >= 8 && fly === 0};
}

// Card rectangle (frame fractions, y down) for a head anchor {x, y} in frame fractions. aspect = frame w / h.
// The card sits just above the head, centred on it, and is pushed inside the safe area (x 10–90 %, y 10–56 %).
export function cardRect(anchor, kind = 'big', aspect = 9 / 16, scale = 1) {
  const k = CARD[kind] ?? CARD.big, w = k.w * scale, h = w * aspect / CARD.aspect;   // card height as a fraction of frame height
  let x0 = anchor.x - w / 2, y1 = anchor.y - .03, y0 = y1 - h;
  const {x: [xa, xb], y: [ya, yb]} = CARD.safe;
  if (x0 < xa) x0 = xa; if (x0 + w > xb) x0 = xb - w;
  if (y1 > yb) { y1 = yb; y0 = y1 - h; } if (y0 < ya) { y0 = ya; y1 = y0 + h; }
  return {x0, y0, x1: x0 + w, y1, w, h, cap: h * CARD.capOfHeight, kind};
}
// Is a rect legal by B1 (fully inside the safe area, out of the caption band, name cap height big enough)?
export function cardOk(rect) {
  const {x: [xa, xb], y: [ya, yb], band: [ba, bb]} = CARD.safe, e = 1e-9;
  const errs = [];
  if (rect.x0 < xa - e || rect.x1 > xb + e || rect.y0 < ya - e || rect.y1 > yb + e) errs.push('outside the safe area');
  if (rect.y1 > ba && rect.y0 < bb) errs.push('in the caption band');
  if (rect.cap < (CARD[rect.kind] ?? CARD.big).minCap - e) errs.push(`name cap height ${(rect.cap * 100).toFixed(1)} % < ${((CARD[rect.kind] ?? CARD.big).minCap * 100).toFixed(1)} %`);
  return errs;
}

// One reveal → effect entries (existing and A3 effect types) + timeline patches for the actor.
export function expandClassReveal({actor, cls, at, tier = 'hero', card = 'big', cardScale = 1, cardDx = 0, scale = 1, stoneOffset = [0, 0, 1.1]}) {
  const C = CLASSES[cls]; if (!C) throw Error('unknown class ' + cls);
  const tool = `class:${cls}${tier === 'bg' ? ':bg' : ''}`, R = T_REVEAL, s = scale;
  const effects = [
    {type: 'pillar', at: at + R.pillar, dur: 1.1, color: C.color, origin: {actor, offset: stoneOffset}, height: 16 * s, radius: .75 * s},
    {type: 'flash', at: at + R.flash, dur: 2 / FPS, peak: .28, color: C.color},
    {type: 'ring', at: at + R.flash, dur: .5, color: C.color, origin: {actor, offset: [stoneOffset[0], .15, stoneOffset[2]]}, radius: 4.5 * s},
    {type: 'shake', at: at + R.flash, dur: 4 / FPS, amp: .03, hz: 18, seed: Math.round(at * 10) + 3},
    {type: 'morph', actor, from: 'sword', to: tool, at: at + R.morph[0], dur: R.morph[1] - R.morph[0]},
    ...C.fx.map((preset, i) => preset === 'halo'
      ? {type: 'halo', at: at + R.burst, dur: 2.2, color: C.color, origin: {actor, offset: [0, 5.6 * s, -.4]}, size: 5.5 * s}
      : {type: 'particles', preset, at: at + R.burst, dur: 1.4, count: preset === 'rays' ? 14 : 26, seed: Math.round(at * 100) + i, scale: s, origin: {actor, offset: [0, 4.6 * s, .3]}}),
    ...(card ? [{type: 'card', actor, cls, at: at + R.card, kind: card, scale: cardScale, dx: cardDx}] : []),   // card: false → pillar and blade only (crowded wides)
  ];
  const tagAt = at + R.card + R.hold + R.fly;
  const patch = {
    tools: [[at, 'sword'], [at + R.morph[0], tool]],
    keys: [[at, 'pull', {effort: .5}], [at + R.burst, 'raise'], [at + R.idle, 'idle']],
    kit: [[at + R.burst, cls === 'king' ? ['crown', 'cape'] : [C.accessory]]],
    tags: [[at + R.card, null], [tagAt, C.name, null, {cls}]],   // the old tag hides while the card is up
  };
  return {effects, patch, cardAt: at + R.card, tagAt};
}

// Merge timeline patches into an actor's cast entry (sorted by time). A key already present inside the patch
// window (later than the patch's first key and before its last) is kept; patch keys never overwrite later data.
export function applyPatch(entry, patch) {
  const out = {...entry};
  for (const [k, keys] of Object.entries(patch)) {
    const base = (out[k] ?? []).filter(e => !keys.some(p => Math.abs(p[0] - e[0]) < 1e-6));
    const end = keys.at(-1)[0];
    const later = base.filter(e => e[0] > keys[0][0] && e[0] <= end);
    const pk = later.length ? keys.filter(p => p[0] < later[0][0]) : keys;   // existing later data wins
    out[k] = [...base, ...pk].sort((a, b) => a[0] - b[0]);
  }
  return out;
}
