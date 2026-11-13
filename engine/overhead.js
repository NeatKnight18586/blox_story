// engine/overhead.js — in-game overlays of our own design (docs/V2_BRIEF.md §6.6): camera-facing
// canvas sprites. Name tag (bold white, dark outline, optional small role line) over every named
// character, popping when its text changes; stat variants (number, bar, icon tile); chat bubble
// (white rounded rectangle with a tail, ≤ 4 words). Font: Lilita One (OFL, from npm), loaded once.
import * as T from 'three';

export const FONT = 'Lilita One';
export const TAG_HEIGHT = .62;                                  // world units of the name line (at actor scale 1)
let fontReady = null;
export function loadFont(url = new URL('../node_modules/@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf', import.meta.url)) {
  if (typeof document === 'undefined') return Promise.resolve();
  return fontReady ??= new FontFace(FONT, `url(${url})`).load().then(f => { document.fonts.add(f); });
}

// Pop-in scale for a tag whose text changed `frames` frames ago: 0.6 → 1.12 (frame 3) → 1.0 (frame 6).
export function popScale(frames) {
  if (frames < 0) return 0; if (frames >= 6) return 1;
  return frames <= 3 ? .6 + (.52 * frames / 3) : 1.12 - .12 * (frames - 3) / 3;
}

function canvasSprite(key, draw, worldH) {
  if (typeof document === 'undefined') { const s = new T.Sprite(new T.SpriteMaterial()); s.userData.key = key; return s; }
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const {w, h} = draw(g, c, true); c.width = w; c.height = h; draw(g, c, false);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
  const m = new T.SpriteMaterial({map: tex, depthWrite: false, transparent: true});
  const s = new T.Sprite(m); s.center.set(.5, 0); s.scale.set(worldH * w / h, worldH, 1); s.userData = {key, base: s.scale.clone()}; s.renderOrder = 10;
  return s;
}

const cache = new Map();
const cached = (key, f) => { if (!cache.has(key)) cache.set(key, f()); return cache.get(key); };

// Name tag: {name, role?} → Sprite (cached per text; one instance per key, so it is safe to reuse
// only once per scene — actors get their own via tagSprite()).
function drawTag(name, role) {
  const S = 128, pad = 26;
  return (g, c, measure) => {
    g.font = `${S}px "${FONT}", "Arial Black", sans-serif`; const nw = g.measureText(name).width;
    g.font = `${S * .5}px "${FONT}", "Arial Black", sans-serif`; const rw = role ? g.measureText(role).width : 0;
    const w = Math.ceil(Math.max(nw, rw) + pad * 2), h = Math.ceil(S * 1.2 + (role ? S * .62 : 0) + pad);
    if (measure) return {w, h};
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const line = (txt, size, y, fill) => { g.font = `${size}px "${FONT}", "Arial Black", sans-serif`; g.lineWidth = size * .2; g.strokeStyle = '#141414'; g.strokeText(txt, w / 2, y); g.fillStyle = fill; g.fillText(txt, w / 2, y); };
    if (role) line(role, S * .5, S * .56 + pad * .5, '#ffd84a');
    line(name, S, h - pad * .7 - S * .12, '#ffffff');
    return {w, h};
  };
}
export function tagSprite(name, role = null) {
  return canvasSprite(`tag:${name}:${role}`, drawTag(name, role), TAG_HEIGHT * (role ? 1.52 : 1));
}

// Stat variants: number ("2,031"), bar (0..1 with label), icon tile (emoji-free: a letter in a tile).
export function statSprite(kind, value, {label = '', color = '#4ad8ff'} = {}) {
  return canvasSprite(`stat:${kind}:${value}:${label}`, (g, c, measure) => {
    const w = 420, h = 140; if (measure) return {w, h};
    g.fillStyle = 'rgba(16,18,22,.78)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 26); g.fill();
    g.font = `60px "${FONT}", sans-serif`; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    if (kind === 'number') { g.textAlign = 'center'; g.fillText(String(value), w / 2, h / 2 + 4); }
    else if (kind === 'bar') { g.fillStyle = '#2b2f36'; g.fillRect(30, 58, w - 60, 40); g.fillStyle = color; g.fillRect(30, 58, (w - 60) * Math.min(1, Math.max(0, value)), 40); g.fillStyle = '#fff'; g.font = `34px "${FONT}", sans-serif`; g.textAlign = 'left'; g.fillText(label, 30, 34); }
    else { g.fillStyle = color; g.beginPath(); g.roundRect(20, 18, 104, 104, 18); g.fill(); g.fillStyle = '#141414'; g.textAlign = 'center'; g.fillText(String(value)[0], 72, 74); g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(label, 150, 72); }
    return {w, h};
  }, .9);
}

// Chat bubble, ≤ 4 words (brief §6.6).
export function bubbleSprite(text) {
  if (text.trim().split(/\s+/).length > 4) throw Error('chat bubble text must be ≤ 4 words: ' + text);
  return canvasSprite(`bubble:${text}`, (g, c, measure) => {
    g.font = `72px "${FONT}", sans-serif`; const tw = g.measureText(text).width, w = Math.ceil(tw + 90), h = 170;
    if (measure) return {w, h};
    g.fillStyle = '#ffffff'; g.strokeStyle = '#1b1b1b'; g.lineWidth = 8;
    g.beginPath(); g.roundRect(6, 6, w - 12, 118, 40); g.moveTo(w * .42, 120); g.lineTo(w * .5, 164); g.lineTo(w * .58, 120); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(w * .42 + 4, 112, w * .16 - 8, 12);
    g.fillStyle = '#141414'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 68);
    return {w, h};
  }, .95);
}

// Per-actor tag slot: shows `name`/`role`, pops when they change (pure in the frame number).
export function setTag(actor, name, role, framesSinceChange = 99) {
  const key = `${name}:${role}`;
  if (actor.tagKey !== key) {
    if (actor.tag) actor.tag.removeFromParent();
    actor.tag = name ? cached(`${actor.root.uuid}:${key}`, () => tagSprite(name, role)) : null; actor.tagKey = key;
    if (actor.tag) { actor.tag.position.set(0, 5.75, 0); actor.root.add(actor.tag); }
  }
  // Tags keep one on-screen size whatever the actor's scale (Pip at 0.6 still gets a readable tag).
  if (actor.tag) { actor.tag.userData.popScale = popScale(framesSinceChange) / actor.root.scale.x; actor.tag.scale.copy(actor.tag.userData.base ?? actor.tag.scale).multiplyScalar(actor.tag.userData.popScale); }
  return actor;
}

// Screen-size cap (call once per frame after the camera is set): a tag never exceeds `maxFrac` of the frame
// height, so close-ups keep a small, tidy tag instead of a banner; inside `hideBelow` units it hides.
const _p = new T.Vector3(), _c = new T.Vector3();
export function fitTags(scene, camera, {maxFrac = .06, hideBelow = 3.2} = {}) {
  camera.getWorldPosition(_c);
  scene.traverse(o => {
    if (!o.isSprite || !o.userData.base || !o.userData.key?.startsWith('tag:')) return;
    o.getWorldPosition(_p); const d = _p.distanceTo(_c), parentScale = o.parent ? o.parent.getWorldScale(_p).y : 1;
    const hMax = 2 * d * Math.tan(camera.fov * Math.PI / 360) * maxFrac / parentScale;   // in the tag's parent space
    const want = o.userData.popScale ?? 1, base = o.userData.base;
    const k = Math.min(want * base.y, hMax * want) / base.y;
    o.scale.set(base.x * k, base.y * k, 1); o.visible = d >= hideBelow && o.userData.show !== false;
  });
}
