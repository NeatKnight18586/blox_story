// engine/tapcap.js — TapCap campaign QA (pure). The rules live in campaigns/tapcap/RULES.md; scripts/v2/plan.js loads them
// whenever the episode spec path is under campaigns/tapcap/ and adds these errors (FAIL blocks the final render).
// Measured inputs (frame-1 cover, text found in frame, proportion report) are passed in; a missing measurement is an error.
export const CAMPAIGN_RE = /(^|\/)campaigns\/tapcap\//;
export const isCampaign = p => CAMPAIGN_RE.test(String(p).replace(/\\/g, '/'));

// RULES.md → {hard: [text], qa: {TC-01: {text, params}}}
export function parseRules(md) {
  const hard = [], qa = {};
  for (const line of md.split('\n')) {
    const h = line.match(/^(\d+)\.\s+(.*)$/); if (h) hard.push(h[2].trim());
    const q = line.match(/^-\s+(TC-\d\d)\s+(.*?)\s*(?:`(\{.*\})`)?\s*$/);
    if (q) qa[q[1]] = {text: q[2].trim(), params: q[3] ? JSON.parse(q[3]) : {}};
  }
  return {hard, qa};
}

// Keycap tap (model spec §2, depth 3 % H since the Pass A revision): down 3 % H over 3 frames, hold 2, back over 4 with a small overshoot. f = frames since the tap
// started; returns the keycap offset as a fraction of H (negative = down). The click lands on frame 3 (bottom of the press).
export const TAP = {depth: .03, down: 3, hold: 2, up: 4, overshoot: .12, clickFrame: 3};
export function tapOffset(f, T = TAP) {
  if (f <= 0) return 0;
  if (f <= T.down) { const u = f / T.down; return -T.depth * (1 - (1 - u) * (1 - u)); }   // ease-out into the switch
  if (f <= T.down + T.hold) return -T.depth;
  const u = (f - T.down - T.hold) / T.up; if (u >= 1) return 0;
  const s = 1.70158 * (T.overshoot / .1);   // outBack scaled so the peak overshoot ≈ T.overshoot × depth
  const e = 1 + (s + 1) * Math.pow(u - 1, 3) + s * Math.pow(u - 1, 2);
  return -T.depth * (1 - e);
}
export const tapStartFor = (onsetS, fps, T = TAP) => Math.round(onsetS * fps) - T.clickFrame;   // first frame of a tap whose bottom hits onsetS

const sameCam = (a, b, eps = 0) => {   // TC-06: diff must be exactly 0
  const k = ['pos', 'look', 'fov'];
  return k.every(n => { const x = [a?.[n]].flat(), y = [b?.[n]].flat(); return x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) <= eps); });
};

// shots: [{id, start, frames, move, static?, cam?: {first: {pos, look, fov}, last: {...}}, taps?: [{start}]}], cues {words:[{word,start,end}]},
// measured: {frame1Cover, onScreenUntil, textFound: [strings], proportions: {pass}}.
export function checkCampaign({rules, shots, cues, fps, end, measured = {}}) {
  const errors = [], manual = [], q = rules.qa, words = cues?.words ?? [];
  const P = id => q[id]?.params ?? {};
  if (q['TC-01']) { const {cover, until} = P('TC-01');
    if (measured.frame1Cover === undefined) errors.push('TC-01: frame-1 Slime Guy cover not measured');
    else if (measured.frame1Cover < cover) errors.push(`TC-01: Slime Guy covers ${(measured.frame1Cover * 100).toFixed(1)} % of frame 1 (≥ ${cover * 100} %)`);
    if (measured.onScreenUntil !== undefined && measured.onScreenUntil < until) errors.push(`TC-01: Slime Guy leaves the frame at ${measured.onScreenUntil} s (< ${until} s)`); }
  if (q['TC-02']) { const pr = measured.proportions;
    if (!pr) errors.push('TC-02: proportion report missing (campaigns/tapcap/ep01-rarity/qa/proportions.json)'); else if (!pr.pass) errors.push(`TC-02: proportion check fails: ${(pr.failures ?? []).join('; ')}`); }
  if (q['TC-03']) { const ok = P('TC-03').signs ?? [];
    if (!measured.textFound) errors.push('TC-03: in-frame text not measured');
    else for (const t of measured.textFound) if (!ok.includes(t)) errors.push(`TC-03: unapproved text in frame: "${t}"`); }
  if (q['TC-04']) manual.push('TC-04: check Clix watch / coat / gloves for any mark, text or logo (manual, every review)');
  if (q['TC-05']) { const {frames: tol, word} = P('TC-05'), clicks = words.filter(w => String(w.word).toLowerCase().replace(/[^a-z]/g, '') === word);
    const taps = shots.flatMap(s => (s.taps ?? []).map(t => ({...t, shot: s.id})));
    if (!clicks.length) errors.push('TC-05: no "Click" onsets in the aligned VO');
    for (const c of clicks) { const want = Math.round(c.start * fps), hit = taps.map(t => t.start + TAP.clickFrame).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
      if (hit === undefined || Math.abs(hit - want) > tol) errors.push(`TC-05: "Click" at ${c.start.toFixed(2)} s (frame ${want}) has no press bottom within ± ${tol} frame (nearest ${hit ?? 'none'})`); } }
  if (q['TC-06']) { const {first, last} = P('TC-06'), a = shots.find(s => s.id === first), b = shots.find(s => s.id === last);
    if (!a?.cam || !b?.cam) errors.push(`TC-06: camera transforms for ${first}/${last} missing`);
    else if (!sameCam(a.cam.last, b.cam.last) || !sameCam(a.cam.first, b.cam.first)) errors.push(`TC-06: ${last} does not replay ${first}'s camera move (first/last transforms differ)`); }
  if (q['TC-07']) { const {avg: [lo, hi], tail} = P('TC-07'), len = end ?? (shots.length ? (shots.at(-1).start + shots.at(-1).frames) / fps : 0), av = shots.length ? len / shots.length : 0;
    if (av < lo || av > hi) errors.push(`TC-07: average shot ${av.toFixed(2)} s outside ${lo}–${hi} s`);
    for (const s of shots) if (s.static || s.move === 'static') errors.push(`TC-07: ${s.id} is locked off`);
    const lastWord = words.length ? Math.max(...words.map(w => w.end ?? w.start)) : null;
    if (lastWord !== null && len - lastWord > tail + 1e-9) errors.push(`TC-07: video ends ${(len - lastWord).toFixed(2)} s after the last word (≤ ${tail})`); }
  return {errors, manual};
}
