// engine/hairgate.js — page for scripts/v2/hair-gates.js (Amendment A5 §A5). Flat-colour orthographic renders of one head
// with a v4 style: head magenta, hair black, no lighting, no antialiasing. Returns RGBA bytes; the maths is in the script.
import * as T from 'three';
import {headGeometry, HEAD} from '../avatar-style/body.js';
import {hair4Geometry} from '../avatar-style/hair4.js';
import {HEAD5} from '../avatar-style/body5.js';

const renderer = new T.WebGLRenderer({antialias: false, preserveDrawingBuffer: true}); renderer.setPixelRatio(1); document.body.appendChild(renderer.domElement);
const scene = new T.Scene(); scene.background = new T.Color('#ffffff');
const V5 = new URLSearchParams(location.search).get('v5') === '1';   // format v4 2b: the v5 head (1.2³, the pivot scale) with the hair on it
const holder = new T.Group(); if (V5) holder.scale.set(...HEAD5); scene.add(holder);
const head = new T.Mesh(headGeometry('hero'), new T.MeshBasicMaterial({color: '#ff00ff'})); holder.add(head);
const hairMat = new T.MeshBasicMaterial({color: '#000000'}); let hair = null;
const cam = new T.OrthographicCamera(-1, 1, 1, -1, .1, 20);
// opts: {style, tier, az (deg) | top: true, px, span (world units across), headOnly, hairOnly}
function render({style, tier = 'hero', az = 0, top = false, px = 128, span = 3.2, headOnly = false, hairOnly = false, cy = -.2}) {
  if (hair) holder.remove(hair); const g = style === 'bald' ? null : hair4Geometry(style, '#5a3a22', tier);
  hair = g ? new T.Mesh(g, hairMat) : null; if (hair) holder.add(hair);
  head.visible = !hairOnly; if (hair) hair.visible = !headOnly;
  renderer.setSize(px, px, false); cam.left = -span / 2; cam.right = span / 2; cam.top = span / 2 + cy; cam.bottom = -span / 2 + cy; cam.updateProjectionMatrix();
  if (top) { cam.position.set(0, 8, 0); cam.up.set(0, 0, -1); } else { const a = az * Math.PI / 180; cam.position.set(Math.sin(a) * 8, 0, Math.cos(a) * 8); cam.up.set(0, 1, 0); }
  cam.lookAt(0, 0, 0); if (top) { cam.top = span / 2; cam.bottom = -span / 2; cam.updateProjectionMatrix(); }
  renderer.render(scene, cam);
  const gl = renderer.getContext(), buf = new Uint8Array(px * px * 4); gl.readPixels(0, 0, px, px, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  return Array.from(buf);
}
window.__hg = {render, headHeight: 2 * HEAD.halfHeight * (V5 ? HEAD5[1] : 1)};
