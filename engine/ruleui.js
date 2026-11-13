// engine/ruleui.js — rule UI anywhere (Amendment A4 C). Any tag, stat, bar, icon, card, checklist or plate attaches to ANY
// pivot or object (an actor's wrist, back, a prop, a mirror frame), not only above heads; screen-facing (sprite) or
// world-fixed (a plane that turns with its object); pops when its value changes (pure in the frame count).
// spec.ui = [{id, to: 'actor' | 'actor.part' | 'actor.pivot' | '<object name>', offset: [x, y, z], kind, facing: 'screen'|'world',
//   size (world height), rot: [deg x, y, z] (world facing), items: [...] (checklist), keys: [[t, ...value] | [t, null]]}]
//   kind tag: [t, name, role?] · stat/bar: [t, value, label?] (bar value 0..1) · icon: [t, icon, colour?] · card: [t, cls]
//   checklist: [t, doneCount] (items ticked in order) · plate: [t, text]
import * as T from 'three';
import {FONT, drawIcon, popScale, classCardCanvas} from './overhead.js';
import {CLASSES} from '../parts/props.js';

export const UI_KINDS = ['tag', 'stat', 'bar', 'icon', 'card', 'checklist', 'plate'];
// Current key and frames since it took effect (pure).
export function uiState(keys = [], t, fps = 30) {
  let cur = null; for (const k of keys) if (t >= k[0]) cur = k;
  if (!cur) return null; return {value: cur.slice(1), since: cur[0] > 0 ? Math.round((t - cur[0]) * fps) : 99};
}
// Checklist rows (pure): [{n, text, done}]
export const checklistRows = (items, done) => items.map((text, i) => ({n: i + 1, text, done: i < (done ?? 0)}));

function draw(kind, v, o) {
  const c = document.createElement('canvas'), g = c.getContext('2d'), font = s => `${s}px "${FONT}", "Arial Black", sans-serif`;
  const outline = (txt, size, x, y, fill, align = 'center') => { g.font = font(size); g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = '#141414'; g.strokeText(txt, x, y); g.fillStyle = fill; g.fillText(txt, x, y); };
  const panel = (w, h, r = 28, fill = 'rgba(16,18,22,.82)') => { c.width = w; c.height = h; g.fillStyle = fill; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, r); g.fill(); };
  if (kind === 'tag') { g.font = font(120); const w = Math.max(g.measureText(v[0]).width, v[1] ? g.measureText(v[1]).width * .5 : 0) + 60, h = v[1] ? 230 : 160; c.width = w; c.height = h; if (v[1]) outline(v[1], 60, w / 2, 44, '#ffd84a'); outline(v[0], 120, w / 2, h - 70, o.color ?? '#ffffff'); }
  else if (kind === 'stat') { panel(440, 150); outline(String(v[0]), 76, 220, 80, o.color ?? '#ffffff'); if (v[1]) { g.font = font(30); g.fillStyle = '#ffd84a'; g.textAlign = 'center'; g.fillText(v[1], 220, 26); } }
  else if (kind === 'bar') { panel(460, 150); g.fillStyle = '#2b2f36'; g.fillRect(32, 76, 396, 44); g.fillStyle = o.color ?? '#4ad8ff'; g.fillRect(32, 76, 396 * Math.min(1, Math.max(0, +v[0])), 44); g.font = font(36); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(v[1] ?? '', 32, 42); }
  else if (kind === 'icon') { c.width = c.height = 200; g.fillStyle = '#141414'; g.beginPath(); g.roundRect(6, 6, 188, 188, 36); g.fill(); g.fillStyle = v[1] ?? o.color ?? '#4ad8ff'; g.beginPath(); g.roundRect(18, 18, 164, 164, 28); g.fill(); drawIcon(g, v[0], 100, 100, 120, '#ffffff', '#141414'); }
  else if (kind === 'card') { const cv = classCardCanvas(v[0], CLASSES[v[0]], 11); return cv; }
  else if (kind === 'checklist') {
    const rows = checklistRows(o.items ?? [], v[0]), w = 620, rh = 92, h = 40 + rows.length * rh; panel(w, h, 30);
    rows.forEach((r, i) => { const y = 20 + rh * (i + .5);
      g.fillStyle = r.done ? '#46c35a' : '#2b2f36'; g.beginPath(); g.roundRect(26, y - 30, 60, 60, 14); g.fill();
      if (r.done) { g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(40, y); g.lineTo(52, y + 13); g.lineTo(73, y - 15); g.stroke(); }
      else outline(String(r.n), 40, 56, y + 2, '#ffffff');
      outline(r.text, 50, 110, y + 2, r.done ? '#9be3a6' : '#ffffff', 'left');
      if (r.done) { g.strokeStyle = 'rgba(155,227,166,.9)'; g.lineWidth = 5; g.beginPath(); g.moveTo(110, y + 2); g.lineTo(110 + g.measureText(r.text).width, y + 2); g.stroke(); } });
  }
  else if (kind === 'plate') { g.font = font(64); const w = g.measureText(v[0]).width + 70, h = 110; c.width = w; c.height = h; g.fillStyle = o.color ?? '#f2e6c8'; g.strokeStyle = '#3a2a1a'; g.lineWidth = 8; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 16); g.fill(); g.stroke(); g.font = font(64); g.fillStyle = '#2a1e12'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v[0], w / 2, h / 2 + 3); }
  else throw Error('unknown ui kind ' + kind);
  return c;
}
const DEFAULT_SIZE = {tag: .62, stat: .8, bar: .8, icon: .7, card: 2.4, checklist: 2.2, plate: .5};

export function createRuleUI(list = [], {scene, resolveTarget, fps = 30}) {
  const items = list.map(u => {
    if (!UI_KINDS.includes(u.kind)) throw Error('unknown ui kind ' + u.kind);
    const parent = resolveTarget(u.to); if (!parent) throw Error('ui target not found: ' + u.to);
    const holder = new T.Group(); holder.name = 'ui_' + (u.id ?? u.kind); holder.position.set(...(u.offset ?? [0, 0, 0])); parent.add(holder);
    if (u.rot) holder.rotation.set(...u.rot.map(d => d * Math.PI / 180));
    return {u, holder, cache: new Map(), cur: null, key: null};
  });
  const make = (it, v) => {
    const key = JSON.stringify(v); if (it.cache.has(key)) return it.cache.get(key);
    if (typeof document === 'undefined') return null;
    const cv = draw(it.u.kind, v, it.u), tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const H = it.u.size ?? DEFAULT_SIZE[it.u.kind], W = H * cv.width / cv.height;
    let o;
    if ((it.u.facing ?? 'screen') === 'screen') { o = new T.Sprite(new T.SpriteMaterial({map: tex, depthWrite: false, transparent: true, depthTest: it.u.depthTest ?? true})); o.center.set(.5, 0); o.scale.set(W, H, 1); }
    else { o = new T.Mesh(new T.PlaneGeometry(W, H).translate(0, H / 2, 0), new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2})); }
    o.renderOrder = 11; o.userData.base = o.scale.clone(); it.cache.set(key, o); return o;
  };
  return {
    items,
    update(t) {
      for (const it of items) {
        const st = uiState(it.u.keys, t, fps), v = st && st.value[0] !== null ? st.value : null;
        const obj = v ? make(it, v) : null;
        if (obj !== it.cur) { it.cur?.removeFromParent(); if (obj) it.holder.add(obj); it.cur = obj; }
        if (obj) { const k = popScale(st.since); obj.scale.copy(obj.userData.base).multiplyScalar(k); obj.visible = k > 0; }
      }
    },
  };
}
