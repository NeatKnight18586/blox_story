// scripts/v2/envelope.js — the 30 fps loudness envelope of a story's voice file for lip flaps (format v4 Phase 1).
// Reads stories/<slug>/voice.flac (decoded by ffmpeg to mono float; the file itself is never modified) and writes
// stories/<slug>/build/envelope.json {fps, frames, rms, shapes}.
//   node scripts/v2/envelope.js --story <slug> [--voice <file>] [--out <json>]
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {envelope, talkShapes, FLAP} from '../../engine/lipflap.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const story = arg('story'), voice = arg('voice', `stories/${story}/voice.flac`), out = arg('out', `stories/${story}/build/envelope.json`), SR = 16000;
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', voice, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {maxBuffer: 1 << 30});
const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
const rms = envelope(samples, SR, FLAP.fps), shapes = talkShapes(rms);
mkdirSync(dirname(out), {recursive: true});
writeFileSync(out, JSON.stringify({voice, fps: FLAP.fps, frames: rms.length, rms: rms.map(v => +v.toFixed(5)), shapes}));
const hist = [0, 1, 2, 3].map(k => shapes.filter(s => s === k).length);
console.log(JSON.stringify({voice, frames: rms.length, seconds: +(rms.length / FLAP.fps).toFixed(2), shapes: hist, out}));
