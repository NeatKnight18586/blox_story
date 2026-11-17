// scripts/v2/beanie-check.js — Toy House: curly_top hair must not poke through the beanie shell. Pure geometry (no browser).
// Counts hair vertices above the cuff line that lie outside the shell ellipsoid; pass = 0. Prints the numbers.
import * as T from 'three';
import {hair4Geometry} from '../../avatar-style/hair4.js';
import {HEAD} from '../../avatar-style/body.js';
import {createActor5} from '../../avatar-style/body5.js';
import {attachAccessory} from '../../avatar-style/accessories.js';
const a = createActor5({skin: '#c08457'}); const acc = attachAccessory(a, 'beanie', {}); const shell = acc.children[0], cuff = acc.children[1];
shell.geometry.computeBoundingBox(); const bb = shell.geometry.boundingBox, c = new T.Vector3(); shell.localToWorld(c.set(0, 0, 0)); a.pivots.head.worldToLocal(c);   // ellipsoid centre in head-pivot coordinates
const rx = bb.max.x, ry = bb.max.y, rz = bb.max.z, cuffTop = cuff.position.y + .1, hg = hair4Geometry('curly_top', '#2e1a12', 'hero'), p = hg.attributes.position;
let above = 0, out = 0, worst = 0; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + HEAD.centre, z = p.getZ(i); if (y < cuffTop) continue; above++;
  const q = ((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2 + ((z - c.z) / rz) ** 2; if (q > 1) { out++; worst = Math.max(worst, Math.sqrt(q) - 1); } }
console.log(JSON.stringify({hairVerticesAboveCuff: above, outsideShell: out, worstOvershootFrac: +worst.toFixed(3), result: out === 0 ? 'PASS' : 'FAIL'})); process.exitCode = out === 0 ? 0 : 1;
