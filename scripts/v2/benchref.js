// scripts/v2/benchref.js — RELATIVE speed gate (owner ENGINE add-on, fearbell PREVIS session; RULEBOOK §6).
// Every bench run also renders a FIXED reference scene (the frozen tuft-1A R6 fixture) in the same browser, so runner speed cancels out:
//   ratio      = bench s/frame ÷ reference s/frame (this run)
//   normalised = ratio × REF.base1A       (the reference's 1A-era time: 0.068 s/frame at 270×480, tuft Phase 1A, docs/archive/PROGRESS.md)
//   PASS       = normalised ≤ 0.62 s/frame (the gate value itself is never loosened)
// Pure parts (normalise, gate) are exported for tests; refBench(page-opener) measures the reference in a live browser.
export const REF = {spec: 'engine/fixtures/r6/episode.json', width: 270, height: 480, frames: [12, 36, 60, 96, 140, 180], base1A: .068, source: 'tuft Phase 1A: R6 fixture, rig + twos, 68 ms/frame at 270×480'};
export const GATE_S = .62;
export const normalise = (sPerFrame, refS, base = REF.base1A) => { if (!(refS > 0)) throw new Error('reference s/frame must be > 0'); const ratio = sPerFrame / refS; return {sPerFrame: +sPerFrame.toFixed(3), ratio: +ratio.toFixed(3), normalised: +(ratio * base).toFixed(3)}; };
export const gate = (sPerFrame, refS, max = GATE_S) => { const n = normalise(sPerFrame, refS); return {...n, refS: +refS.toFixed(4), pass: n.normalised <= max}; };
const median = a => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
// Renders the reference in the given browser/server (warm-up frame first), returns the median s/frame over 3 rounds of REF.frames.
export async function refBench(browser, serverUrl, rounds = 3) {
  const p = await browser.newPage(); try {
    await p.goto(`${serverUrl}/engine/episode.html?spec=${encodeURIComponent(REF.spec)}&aa=1`); await p.waitForFunction(() => window.__episode, null, {timeout: 120000});
    await p.evaluate(([w, h]) => window.__episode.renderFrame(0, w, h), [REF.width, REF.height]);
    const ms = []; for (let r = 0; r < rounds; r++) ms.push(...await p.evaluate(([fr, w, h]) => fr.map(f => window.__episode.renderFrame(f, w, h).ms), [REF.frames, REF.width, REF.height]));
    return +(median(ms) / 1000).toFixed(4);
  } finally { await p.close(); }
}
