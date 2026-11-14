// npm run v2:plan -- --story <slug> [--spec <episode.json>] [--cues <cues.json>]   (docs/V2_BRIEF.md §5.2)
// Validates episode.json against cues.json. Measurements come from the real episode page (cameras that follow
// actors, projected heads), the rules from engine/plancheck.js. Prints errors and warnings; exit 1 on any error.
// Also writes review/<slug>/plan.json (the shot table with timings, sizes and the why of each shot).
import {readFileSync} from 'node:fs';
import {mkdir, writeFile} from 'node:fs/promises';
import {startServer} from './server.js';
import {launch} from './browser.js';
import {checkPlan} from '../../engine/plancheck.js';
import {checkSeason} from '../../engine/seasoncheck.js';
import {labelIssues} from '../../engine/nolabels.js';
import {layoutShots} from '../../engine/timeline.js';

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const story = arg('story'), specPath = arg('spec') ?? `stories/${story}/episode.json`, cuesPath = arg('cues') ?? `stories/${story}/cues.json`;
if (!story && !arg('spec')) { console.error('usage: plan.js --story <slug> [--spec file] [--cues file]'); process.exit(2); }
const spec = JSON.parse(readFileSync(specPath, 'utf8')), cues = JSON.parse(readFileSync(cuesPath, 'utf8')), fps = spec.fps ?? 30;
const shots = layoutShots(spec);

const server = await startServer(), browser = await launch();
let info, meas = [];
try {
  const page = await browser.newPage({viewport: {width: 360, height: 640}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${server.url}/engine/episode.html?spec=${encodeURIComponent(specPath)}&aa=0`);
  await page.waitForFunction(() => window.__episode || document.title === 'error', null, {timeout: 180000});
  if (errors.length) throw Error(errors.join('; '));
  info = await page.evaluate(list => list.map((s, i) => {
    const E = window.__episode, at = f => E.inspectFrame(Math.min(s.start + s.frames - 1, Math.max(s.start, f)));
    const cards = [];   // A3: class cards sampled every 3rd frame
    for (let f = s.start; f < s.start + s.frames; f += 3) { const r = E.inspectFrame(f); if (r.cards.length) cards.push({frame: f, cards: r.cards}); }
    return {speed: E.shotSpeed(i), first: at(s.start), early: at(s.start + 6), mid: at(s.start + Math.floor(s.frames / 2)), last: at(s.start + s.frames - 1), cards};
  }), shots.map(({start, frames}) => ({start, frames})));
  // A4 §E season gates + A5 framing/uiSize: season episodes and v3 worlds (rendered at 360×640, first/middle/last frame)
  const probe = await page.evaluate(() => window.__episode.seasonMeasure(0));
  if (spec.season || probe.v3) meas = await page.evaluate(list => list.map(s => [s.start, s.start + Math.floor(s.frames / 2), s.start + s.frames - 1].map(f => window.__episode.seasonMeasure(f, s.objects))),
    shots.map(({start, frames, clueObject}) => ({start, frames, objects: clueObject ? [clueObject] : []})));
} finally { await browser.close(); await server.close(); }

const r = checkPlan({shots, cues, fps, end: spec.end, info});
const sz = checkSeason({spec, shots, cues, fps, end: spec.end, info, meas});
r.errors.push(...sz.errors, ...labelIssues(spec));   // owner rule §2c: noLabels (Season 1 / labels: false)
r.warnings.push(...sz.warnings); r.stats.season = !!spec.season; r.stats.framing = sz.stats.framing; r.stats.uiItems = sz.stats.ui; r.stats.eggs = sz.stats.eggs; r.stats.overlaps = sz.stats.overlaps;
const table = shots.map((s, i) => ({id: s.id, beat: !!s.beat, t: +(s.start / fps).toFixed(2), dur: +(s.frames / fps).toFixed(2), size: s.size, move: s.move, loc: s.loc, speed: +(info[i].speed * 100).toFixed(0),
  subject: s.subject ? `${s.subject}@${(info[i].mid.heads[s.subject]?.x * 100).toFixed(0)},${(info[i].mid.heads[s.subject]?.y * 100).toFixed(0)}` : '', why: s.why}));
console.table(table.map(({why, ...x}) => x));
for (const w of r.warnings) console.log('WARN ', w);
for (const e of r.errors) console.log('ERROR', e);
const slug = story ?? spec.slug;
await mkdir(`review/${slug}`, {recursive: true});
await writeFile(`review/${slug}/plan.json`, JSON.stringify({spec: specPath, cues: cuesPath, ...r.stats, errors: r.errors, warnings: r.warnings, shots: table}, null, 1));
console.log(JSON.stringify({...r.stats, errors: r.errors.length, warnings: r.warnings.length, result: r.errors.length ? 'FAIL' : 'PASS'}));
process.exitCode = r.errors.length ? 1 : 0;
