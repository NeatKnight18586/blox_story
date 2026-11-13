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
function drawTag(name, role, style = null) {
  const S = 128, pad = 26, icon = style?.icon ? S * 1.05 : 0;
  return (g, c, measure) => {
    g.font = `${S}px "${FONT}", "Arial Black", sans-serif`; const nw = g.measureText(name).width + icon;
    g.font = `${S * .5}px "${FONT}", "Arial Black", sans-serif`; const rw = role ? g.measureText(role).width : 0;
    const w = Math.ceil(Math.max(nw, rw) + pad * 2), h = Math.ceil(S * 1.2 + (role ? S * .62 : 0) + pad);
    if (measure) return {w, h};
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const line = (txt, size, y, fill, x = w / 2) => { g.font = `${size}px "${FONT}", "Arial Black", sans-serif`; g.lineWidth = size * .2; g.strokeStyle = '#141414'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); };
    if (role) line(role, S * .5, S * .56 + pad * .5, '#ffd84a');
    const base = h - pad * .7 - S * .12;
    if (icon) drawIcon(g, style.icon, pad + icon * .45, base - S * .36, S * .9, style.color, '#141414');   // A3: class icon before the name
    line(name, S, base, style?.color ?? '#ffffff', w / 2 + icon / 2);
    return {w, h};
  };
}
export function tagSprite(name, role = null, style = null) {
  return canvasSprite(`tag:${name}:${role}:${style?.cls ?? ''}`, drawTag(name, role, style), TAG_HEIGHT * (role ? 1.52 : 1));
}

// ---- Amendment A3: class icons and the class card ------------------------------------------------------------
// drawIcon: our own simple drawn icons (loaf, shield, crown, leafbow, anvil, wheat), centred at (x, y), size s.
export function drawIcon(g, icon, x, y, s, fill, line = '#141414') {
  g.save(); g.translate(x, y); g.scale(s / 100, s / 100); g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 9; g.strokeStyle = line; g.fillStyle = fill;
  const P = pts => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.closePath(); g.fill(); g.stroke(); };
  if (icon === 'loaf') { g.beginPath(); g.ellipse(0, 6, 46, 28, 0, Math.PI, 0); g.lineTo(46, 24); g.lineTo(-46, 24); g.closePath(); g.fill(); g.stroke(); for (const k of [-22, 0, 22]) { g.beginPath(); g.moveTo(k - 8, 0); g.lineTo(k + 8, -16); g.stroke(); } }
  else if (icon === 'shield') { P([[-38, -40], [38, -40], [38, 4], [0, 46], [-38, 4]]); g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 30); g.moveTo(-26, -8); g.lineTo(26, -8); g.stroke(); }
  else if (icon === 'crown') { P([[-46, 30], [-46, -22], [-24, 4], [0, -36], [24, 4], [46, -22], [46, 30]]); g.fillStyle = line; g.fillRect(-46, 18, 92, 6); }
  else if (icon === 'leafbow') { g.beginPath(); g.arc(-6, 0, 42, -1.2, 1.2); g.stroke(); g.beginPath(); g.moveTo(-6 + 42 * Math.cos(-1.2), 42 * Math.sin(-1.2)); g.lineTo(-6 + 42 * Math.cos(1.2), 42 * Math.sin(1.2)); g.lineWidth = 4; g.stroke(); g.lineWidth = 9; P([[34, 0], [6, -16], [-26, 0], [6, 16]]); }
  else if (icon === 'anvil') { P([[-44, -24], [30, -24], [46, -12], [30, -6], [20, -6], [14, 12], [28, 30], [-28, 30], [-14, 12], [-20, -6], [-44, -6]]); }
  else if (icon === 'wheat') { g.beginPath(); g.moveTo(0, 44); g.lineTo(0, -40); g.stroke(); for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 12, -30 + i * 16, 11, 7, sd * -.6, 0, Math.PI * 2); g.fill(); g.stroke(); } }
  g.restore();
}
// The class card canvas (512 × 640): a "CLASS UNLOCKED" ribbon, a shield-shaped plate in the class colour with a
// thick dark outline, the big icon, the class name (Lilita One, white, dark outline) and a diagonal shine at `shine`
// (0..1, the sweep position). Pure drawing: the same inputs always give the same pixels.
export function drawClassCard(g, {name, color, dark, icon}, shine = -1, W = 512, H = 640) {
  g.clearRect(0, 0, W, H); g.lineJoin = 'round';
  const plate = () => { g.beginPath(); g.moveTo(40, 120); g.quadraticCurveTo(40, 92, 70, 92); g.lineTo(W - 70, 92); g.quadraticCurveTo(W - 40, 92, W - 40, 120); g.lineTo(W - 40, 430); g.quadraticCurveTo(W - 40, 520, W / 2, 610); g.quadraticCurveTo(40, 520, 40, 430); g.closePath(); };
  plate(); g.fillStyle = '#141414'; g.lineWidth = 34; g.strokeStyle = '#141414'; g.stroke();
  const grad = g.createLinearGradient(0, 92, 0, 610); grad.addColorStop(0, color); grad.addColorStop(1, dark); g.fillStyle = grad; g.fill();
  g.save(); plate(); g.clip();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(40, 92, W - 80, 70);   // top highlight
  if (shine >= 0 && shine <= 1) { const x = -200 + shine * (W + 400); const sg = g.createLinearGradient(x - 90, 0, x + 90, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg; g.beginPath(); g.moveTo(x - 90, 92); g.lineTo(x + 90, 92); g.lineTo(x - 30, 610); g.lineTo(x - 210, 610); g.closePath(); g.fill(); }
  g.restore();
  // ribbon
  g.fillStyle = '#141414'; g.beginPath(); g.roundRect(70, 20, W - 140, 84, 22); g.fill();
  g.fillStyle = '#ffd84a'; g.beginPath(); g.roundRect(80, 30, W - 160, 64, 16); g.fill();
  g.font = `44px "${FONT}", "Arial Black", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#141414'; g.fillText('CLASS UNLOCKED', W / 2, 64);
  drawIcon(g, icon, W / 2, 280, 230, '#ffffff', '#141414');
  // class name: cap height ≈ 0.19 × card height (CARD.capOfHeight in engine/classes.js)
  const size = Math.round(H * .19 / .72); g.font = `${size}px "${FONT}", "Arial Black", sans-serif`; g.textBaseline = 'alphabetic';
  g.lineWidth = size * .2; g.strokeStyle = '#141414'; g.strokeText(name, W / 2, 520); g.fillStyle = '#ffffff'; g.fillText(name, W / 2, 520);
}
const cardCanvases = new Map();
export function classCardCanvas(cls, info, shineStep = -1) {   // cached per class and shine step (12 steps)
  const k = cls + ':' + shineStep;
  if (!cardCanvases.has(k) && typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 640; drawClassCard(c.getContext('2d'), info, shineStep < 0 ? -1 : shineStep / 11); cardCanvases.set(k, c);
  }
  return cardCanvases.get(k);
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
export function setTag(actor, name, role, framesSinceChange = 99, style = null) {
  const key = `${name}:${role}:${style?.cls ?? ''}`;
  if (actor.tagKey !== key) {
    if (actor.tag) actor.tag.removeFromParent();
    actor.tag = name ? cached(`${actor.root.uuid}:${key}`, () => tagSprite(name, role, style)) : null; actor.tagKey = key;
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
