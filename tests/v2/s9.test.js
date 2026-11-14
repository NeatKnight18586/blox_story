// Session 9 (Amendment A4 §E + A5 framing/uiSize): season gates as a pure function, on a synthetic episode that passes,
// then broken one rule at a time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {checkSeason, rhyme, beatShots, SEASON} from '../../engine/seasoncheck.js';
import {uiSizeIssues} from '../../engine/ruleui.js';

const fps = 30;
// 12 shots over 130 s: S1 (0–4 s, spectacle), S2 (4–6 close on Kit), S3–S5 B2 (2 s each), … S12 = rhyme of S1
const DUR = [4, 2, 2, 2, 2, 20, 20, 15, 10, 15, 20, 18];
function episode() {
  let t = 0; const shots = DUR.map((d, i) => { const s = {id: `S${i + 1}`, start: Math.round(t * fps), frames: Math.round(d * fps), size: i % 2 ? 'medium' : 'wide', move: 'push'}; t += d; return s; });
  shots[0].spectacle = true; shots[1].size = 'close'; shots[1].subject = 'kit';
  shots[5].clueObject = 'vane'; shots[6].clueObject = 'claws'; shots[7].clueObject = 'egg';
  const spec = {season: 1, hero: 'kit', ruleLines: 2, clues: ['S6', 'S7', 'S8'], twist: 'S10', afk: ['S7', 'S12'], moneyShot: 'S11',
    beats: {B1: ['S1', 'S2'], B2: ['S3', 'S5'], B3: ['S6', 'S6'], B4: ['S7', 'S7'], B5: ['S8', 'S8'], B6: ['S9', 'S9'], B7: ['S10', 'S10'], B8: ['S11', 'S11'], B9: ['S12', 'S12']}};
  const cues = {duration: 127, lines: [{line: 1, start: 0, end: 2.4, words: 'In this town everybody steals eggs'.split(' ').map((w, i) => ({w, start: i * .4, end: i * .4 + .4}))},
    {line: 2, start: 2.5, end: 6.1, words: [{w: 'One', start: 2.5, end: 6.1}]}, {line: 3, start: 9, end: 12, words: [{w: 'Then', start: 9, end: 12}]}]};
  const cam = {position: [0, 10, 40], target: [0, 0, 0], fov: 50};
  const info = shots.map(() => ({first: {camera: cam}, last: {camera: cam}}));
  const kit = {front: true, box: {x0: .3, x1: .7, y0: .1, y1: .9}, feet: .9, shoulder: .58, top: .1, face: {y0: .12, y1: .36, h: .24, front: true, toward: true}, opacity: 1, troupe: 'SECOND'};
  const afk = {front: true, box: {x0: .7, x1: .8, y0: .3, y1: .5}, feet: .5, shoulder: .36, top: .3, face: {y0: .3, y1: .34, front: true, toward: true}, opacity: .4, troupe: 'AFK'};
  const meas = shots.map(s => { const m = {actors: {kit, afk}, objects: {vane: {y0: .1, y1: .15, h: .05, front: true}, claws: {y0: .2, y1: .26, h: .06, front: true}, egg: {y0: .4, y1: .5, h: .1, front: true}}, ui: [], v3: true}; return [m, m, m]; });
  return {spec, shots, cues, fps, end: 130, info, meas};
}
const errs = e => checkSeason(e).errors;

test('season gates: a well-formed episode passes', () => assert.deepEqual(errs(episode()), []));
test('season gates: B1 rules', () => {
  let e = episode(); e.cues.lines[0].words.push(...'and nobody ever stops them'.split(' ').map(w => ({w, start: 2, end: 2.1}))); assert.ok(errs(e).some(x => x.startsWith('B1: first narration line has 11')));
  e = episode(); e.cues.lines[1].end = 9.2; assert.ok(errs(e).some(x => x.includes('rule lines (2) end at 9.20')));
  e = episode(); delete e.shots[0].spectacle; assert.ok(errs(e).some(x => x.includes('neither spectacle nor ruleImage'))); e.shots[0].ruleImage = true; assert.deepEqual(errs(e), []);
  e = episode(); for (const ms of e.meas) for (const m of ms) m.actors = {...m.actors, kit: {...m.actors.kit, face: {y0: .2, y1: .35, front: true, toward: true}}}; assert.ok(errs(e).some(x => x.includes("kit's face at ≥ 20 %")));
  e = episode(); for (const ms of e.meas.slice(0, 2)) for (const m of ms) m.actors = {...m.actors, kit: {...m.actors.kit, face: {...m.actors.kit.face, toward: false}}}; assert.ok(errs(e).some(x => x.includes('best 0.0 %')), 'the back of the head is not a face');
});
test('season gates: B2, clues, AFK, rhyme, length', () => {
  let e = episode(); e.spec.beats.B2 = ['S3', 'S4']; assert.ok(errs(e).some(x => x === 'B2: 2 shots (≥ 3)'));
  e = episode(); e.spec.beats.B2 = ['S3', 'S6']; assert.ok(errs(e).some(x => x.startsWith('B2: S6 is 20.00 s')));
  e = episode(); e.spec.clues = ['S6', 'S7']; assert.ok(errs(e).some(x => x.includes('exactly three')));
  e = episode(); e.spec.twist = 'S7'; assert.ok(errs(e).some(x => x.startsWith('clue S8 starts at')));
  e = episode(); e.meas[5] = e.meas[5].map(m => ({...m, objects: {...m.objects, vane: {y0: .1, y1: .12, front: true}}})); assert.ok(errs(e).some(x => x.startsWith('clue S6: vane is 2.0 %')));
  e = episode(); delete e.shots[6].clueObject; assert.ok(errs(e).some(x => x === 'clue S7: no clueObject named'));
  e = episode(); e.meas[6] = e.meas[6].map(m => ({...m, actors: {...m.actors, afk: {...m.actors.afk, opacity: .7}}})); assert.ok(errs(e).some(x => x.includes('opacity 0.7')));
  e = episode(); e.shots[11].subject = 'afk'; assert.ok(errs(e).some(x => x === 'afk S12: the AFK actor is the subject'));
  e = episode(); e.spec.afk = ['S11', 'S12']; assert.ok(errs(e).some(x => x === 'afk: no AFK shot before the twist'));
  e = episode(); e.meas[11] = e.meas[11].map(m => ({...m, actors: {kit: m.actors.kit}})); assert.ok(errs(e).some(x => x === 'afk S12: the AFK actor is not in frame'));
  e = episode(); e.info[11] = {first: e.info[11].first, last: {camera: {position: [0, 10, 45], target: [0, 0, 0], fov: 50}}}; assert.ok(errs(e).some(x => x.startsWith('rhyme:')));
  e = episode(); e.end = 151; assert.ok(errs(e).some(x => x.startsWith('episode length 151.00')));
  e = episode(); e.spec.beats.B7 = ['S10', 'S9']; assert.ok(errs(e).some(x => x.startsWith('season: beats.B7')));
});
test('season gates: caption band, framing, uiSize; Nobody-style specs skip the season rules', () => {
  let e = episode(); e.meas[1] = e.meas[1].map(m => ({...m, actors: {...m.actors, kit: {...m.actors.kit, face: {y0: .55, y1: .7, front: true, toward: true}}}})); assert.ok(errs(e).some(x => x.startsWith("S2: kit's face (55–70 %) in the caption band")));
  e.shots[1].captionY = 'high'; assert.ok(!errs(e).some(x => x.includes('caption band')), 'high captions move the band');
  e = episode(); e.shots[1].fit = {actor: 'kit', part: 'head'}; e.meas[1] = e.meas[1].map(m => ({...m, actors: {...m.actors, kit: {...m.actors.kit, shoulder: .3, top: .1}}})); assert.ok(errs(e).some(x => x.startsWith('S2: framing subject 20.0 % < 45')));
  e = episode(); e.meas[3] = e.meas[3].map(m => ({...m, ui: [{id: 'stat', kind: 'stat', cap: .02, min: .03, rect: {x0: .4, x1: .6, y0: .6, y1: .7}}]})); const u = errs(e).filter(x => x.includes('uiSize')); assert.equal(u.length, 2, u.join('; '));
  e = episode(); delete e.spec.season; e.meas = e.meas.map(ms => ms.map(m => ({...m, v3: false}))); e.end = 60; assert.deepEqual(errs(e), [], 'no season, no v3: nothing checked');
});
test('season helpers: rhyme, beatShots, uiSizeIssues', () => {
  assert.ok(rhyme({position: [0, 0, 10], target: [0, 0, 0], fov: 50}, {position: [0, .9, 10], target: [0, 0, 0], fov: 54}).ok);
  assert.ok(!rhyme({position: [0, 0, 10], target: [0, 0, 0], fov: 50}, {position: [0, 0, 10], target: [0, 0, 0], fov: 56}).ok);
  const sh = [{id: 'a'}, {id: 'b'}, {id: 'c'}]; assert.deepEqual(beatShots(sh, ['a', 'b']).map(s => s.id), ['a', 'b']); assert.equal(beatShots(sh, ['c', 'a']), null);
  assert.deepEqual(uiSizeIssues([{id: 't', cap: .03, min: .024, rect: {x0: .4, x1: .6, y0: .3, y1: .36}}]), []);
  assert.equal(uiSizeIssues([{id: 't', cap: .03, min: .024, rect: {x0: .01, x1: .2, y0: .3, y1: .36}}]).length, 1);
  assert.equal(SEASON.band[0], .58); assert.equal(SEASON.band[1], .74);
});
