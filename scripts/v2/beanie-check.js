// scripts/v2/beanie-check.js — Toy House: curly_top hair must not poke through the beanie shell, and (Look 6) the brows must show
// below the cuff. Pure geometry (no browser); MO's beanie options come from cast/toyhouse.json.
//   poke-through: hair vertices above the cuff (in the tilted shell's own frame) outside the shell ellipsoid; pass = 0
//   brows: the cuff's lowest front point (x within the face width) sits above the highest brow of any v5 face (MO's faceBox); pass > 0
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {hair4Geometry} from '../../avatar-style/hair4.js';
import {HEAD} from '../../avatar-style/body.js';
import {createActor5} from '../../avatar-style/body5.js';
import {attachAccessory} from '../../avatar-style/accessories.js';
import {faceItems5, bbox, CELL_NAMES} from '../../avatar-style/faces5.js';
const MO = JSON.parse(readFileSync('cast/toyhouse.json', 'utf8')).cast.MO, opts = MO.accessories.find(a => a.name === 'beanie') ?? {};
const a = createActor5({skin: '#c08457'}); const acc = attachAccessory(a, 'beanie', opts); const shell = acc.children[0], cuff = acc.children[1];
a.root.updateMatrixWorld(true);
const toShell = new T.Matrix4().copy(shell.matrixWorld).invert().multiply(a.pivots.head.matrixWorld), cuffTopLocal = (cuff.position.y - shell.position.y) + .12;   // head-pivot → shell-local
shell.geometry.computeBoundingBox(); const bb = shell.geometry.boundingBox, rx = bb.max.x, ry = bb.max.y, rz = bb.max.z;
const hg = hair4Geometry('curly_top', '#2e1a12', 'hero'), p = hg.attributes.position, v = new T.Vector3();
let above = 0, out = 0, worst = 0; for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i) + HEAD.centre, p.getZ(i)).applyMatrix4(toShell); if (v.y < cuffTopLocal) continue; above++;
  const q = (v.x / rx) ** 2 + (v.y / ry) ** 2 + (v.z / rz) ** 2; if (q > 1) { out++; worst = Math.max(worst, Math.sqrt(q) - 1); } }
// brows: highest brow (any v5 face cell) on the head front with MO's faceBox, vs the cuff's lowest point over the face (|x| ≤ .4 head units, front half)
const [box, eyeUp] = MO.faceBox ?? [.8, 0]; let brow = -1;
for (const f of CELL_NAMES) { const it = faceItems5(f, {box, eyeUp}).filter(i => i.kind === 'brow'); if (it.length) brow = Math.max(brow, bbox(it.flatMap(i => i.line ?? i.pts))[3] + (it[0].w ?? 0) / 2); }
const browY = HEAD.centre + brow * 2 * HEAD.halfHeight, cp = cuff.geometry.attributes.position, toHead = new T.Matrix4().copy(a.pivots.head.matrixWorld).invert().multiply(cuff.matrixWorld); let cuffLow = Infinity;
for (let i = 0; i < cp.count; i++) { v.fromBufferAttribute(cp, i).applyMatrix4(toHead); if (v.z > .3 && Math.abs(v.x) <= .4 * 2 * HEAD.radius) cuffLow = Math.min(cuffLow, v.y); }
const margin = +(cuffLow - browY).toFixed(3);
console.log(JSON.stringify({opts: {tilt: opts.tilt ?? -.1, lift: opts.lift ?? 0}, hairVerticesAboveCuff: above, outsideShell: out, worstOvershootFrac: +worst.toFixed(3), browTop: +browY.toFixed(3), cuffFrontLow: +cuffLow.toFixed(3), browMargin: margin, result: out === 0 && margin > 0 ? 'PASS' : 'FAIL'}));
process.exitCode = out === 0 && margin > 0 ? 0 : 1;
