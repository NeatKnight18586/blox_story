// scripts/v2/motion5b-demo.js — Look 5b motion demo (8 s, 24 fps): Mo in the candy zone (beanie pompom + hoodie strings on
// springs), pose changes with 12 % overshoot + settle, idle breathing, camera micro-noise on the static shots, and a closing
// NOTE (Toy House E1 fix): the pompom and hoodie strings and their springs were removed; this demo is kept for the record and no longer runs.
// crashZoom with the 2-sub-frame motion blur. Writes engine/fixtures/toyhouse/motion5b.json, renders it (540×960), measures
// the motion (pompom swing after a pose change, torso breathing) and the blur cost at 1080, assembles
// review/toyhouse/motion-demo2.mp4 (no audio).                                   node scripts/v2/motion5b-demo.js
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, rmSync} from 'node:fs';
import {startServer} from './server.js';
import {launch} from './browser.js';
const base = JSON.parse(readFileSync('engine/fixtures/toyhouse/set5b.json', 'utf8')), F = 24;
const MED = {position: [-41.5, 5.6, 2], target: [-48, 3.4, 10.5], fov: 40}, CLOSE = {position: [-44.6, 4.9, 6.2], target: [-47.6, 4.4, 10.3], fov: 32};
const spec = {...base, slug: 'toyhouse-motion5b', note: 'Look 5b motion demo (scripts/v2/motion5b-demo.js). Not an episode.', crowds: base.crowds.filter(c => c.id === 'candy'), fill: [],
  cast: {mo: {style: 'v5', preset: 'MO', at: 'candy', offset: [2, 0, -5], yaw: 205, faces: [[0, 'grin']],
    keys: [[0, 'idle'], [1.0, 'point', {snap: true}], [2.1, 'shrug', {snap: true}], [3.4, 'jump'], [4.3, 'idle'], [5.1, 'fistPump', {snap: true}], [6.2, 'wave'], [7.2, 'gaspHands', {snap: true}]]}},
  shots: [
    {id: 'D1-medium', frames: 3 * F, move: 'push', static: true, size: 'medium', subject: 'mo', from: MED, to: MED, shadowRadius: 16},
    {id: 'D2-close', frames: 2.5 * F, move: 'push', static: true, size: 'close', subject: 'mo', from: CLOSE, to: CLOSE, shadowRadius: 16},
    {id: 'D3-medium', frames: 1.5 * F, move: 'push', size: 'medium', subject: 'mo', from: MED, to: {...MED, position: [-42.2, 5.5, 3.2]}, shadowRadius: 16},
    {id: 'D4-crash', frames: 1 * F, move: 'crashZoom', size: 'medium', subject: 'mo', zoomAt: .25, from: MED, to: {fov: 18}, shadowRadius: 16}]};
writeFileSync('engine/fixtures/toyhouse/motion5b.json', JSON.stringify(spec, null, 1));
const out = 'renders/v5/motion5b'; rmSync(out, {recursive: true, force: true});
execFileSync('npm', ['run', 'v2:render', '--', '--spec', 'engine/fixtures/toyhouse/motion5b.json', '--out', out, '--width', '540', '--height', '960', '--aa', '1'], {stdio: 'inherit'});
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(F), '-i', `${out}/frames/frame-%05d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', 'review/toyhouse/motion-demo2.mp4']);
// measures: pompom offset from rest after the 1.0 s point (frames 24–40), torso scale range over 3.5 s, blur cost at 1080
const server = await startServer(), browser = await launch(), rep = {};
try {
  const page = await browser.newPage(); await page.goto(`${server.url}/engine/episode.html?spec=engine/fixtures/toyhouse/motion5b.json&aa=1`); await page.waitForFunction(() => window.__episode, null, {timeout: 300000});
  Object.assign(rep, await page.evaluate(() => { const E = window.__episode, {scene, look} = E.debug, mo = scene.getObjectByName('face_decal').parent; let pom = null, torso = null, str = null;
    scene.traverse(o => { if (o.name === 'beanie_pom') pom = o; if (o.name === 'hoodie_string' && !str) str = o; }); const root = pom; let r = root; while (r.parent && r.parent !== scene) r = r.parent; r.traverse(o => { if (o.name === 'torso' || o === r.children.find(c => c.isMesh && c.geometry?.parameters?.height > 1.5)) torso ??= o; });
    const pomTrack = [], strTrack = [], sc = []; for (let n = 20; n < 60; n++) { E.renderFrame(n, 135, 240); pomTrack.push(+pom.position.z.toFixed(3)); strTrack.push(+str.rotation.x.toFixed(3)); }
    for (let n = 0; n < 84; n += 3) { E.renderFrame(n, 135, 240); }
    const cost = {}; for (const on of [true, false]) { look.presets.toy.v5b.motionBlur = on; const s = E.shots.find(x => x.id === 'D4-crash'), ms = []; for (let k = 0; k < 6; k++) ms.push(E.renderFrame(s.start + 4 + k, 1080, 1920).ms); cost[on ? 'blur' : 'plain'] = +(ms.slice(1).reduce((a, b) => a + b, 0) / 5 / 1000).toFixed(3); }
    look.presets.toy.v5b.motionBlur = true;
    return {pomZ: pomTrack, strX: strTrack, pomSwing: +(Math.max(...pomTrack) - Math.min(...pomTrack)).toFixed(3), strSwing: +(Math.max(...strTrack) - Math.min(...strTrack)).toFixed(3), blurCost: cost}; }));
} finally { await browser.close(); await server.close(); }
rep.blurExtra = +(rep.blurCost.blur - rep.blurCost.plain).toFixed(3);
writeFileSync('review/toyhouse/motion5b.json', JSON.stringify(rep, null, 1)); console.log(JSON.stringify({pomSwing: rep.pomSwing, strSwing: rep.strSwing, blurCost: rep.blurCost, blurExtra: rep.blurExtra}));
