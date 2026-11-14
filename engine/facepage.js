// engine/facepage.js — page for scripts/v2/face-gates.js and the face sheets (Faces v3). Draws a face decal on a
// skin-coloured head-front panel (2D canvas only, the same Path2D draw lists the 3D decal uses).
import {drawFace, W, H, TIER_PX} from '../avatar-style/faces3.js';
await document.fonts?.ready;
// render(face, {px: face width in px, skin, tier, blink, head: true → draw the head panel (1.25 × face width), bg})
function canvasFor(face, {px = 128, skin = '#f6c9a0', tier = 'mid', blink = false, head = true, bg = '#d9dde3'} = {}) {
  const hw = head ? Math.round(px * 1.25) : px, hh = head ? Math.round(px * 1.16) : Math.round(px * H / W), c = document.createElement('canvas'); c.width = hw; c.height = hh;
  const g = c.getContext('2d');
  if (head) { g.fillStyle = bg; g.fillRect(0, 0, hw, hh); g.fillStyle = skin; const r = px * .22; g.beginPath(); g.roundRect(0, 0, hw, hh, r); g.fill(); }
  g.save(); if (head) g.translate((hw - px) / 2, (hh - px * H / W) / 2 + px * .02); drawFace(g, face, {px, tier, skin, blink}); g.restore();
  return c;
}
window.__faces = {
  png: (face, o) => canvasFor(face, o).toDataURL('image/png'),
  pixels: (face, o) => { const c = canvasFor(face, {...o, head: false}); return {w: c.width, h: c.height, data: Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data)}; },
  TIER_PX,
};
