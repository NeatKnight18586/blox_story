#!/usr/bin/env python3
"""2i: final-render plan from the measured 1080×1920 final-look frame times (qa/passc.json timing) → RENDER_PLAN.md (no rendering).
Projection: per-frame time by act (dawn/quiet → the dawn wide, rain → the rain close, golden → the golden sky) × that act's frames,
× 1.6 safety for GitHub's 4-vCPU standard runner vs this container (assumption, stated), + per-job setup. Shards keep each job ≤ 4.5 h."""
import json, math, sys
EP = 'campaigns/tapcap/ep01-rarity'; Q = json.load(open(f'{EP}/qa/passc.json')); T = Q['summary']['timing']
S = Q['shots']; FPS = 24
per = {'dawnHope': T['final1080_S1'] / 1000, 'quietNight': T['final1080_S1'] / 1000, 'rainNight': T['final1080_S26'] / 1000, 'golden': T['final1080_S36a'] / 1000}
SAFETY, SETUP_MIN, JOB_MAX_H = 1.6, 6, 4.5
seqs = {'D1': (1, 13), 'D2': (14, 22), 'D3': (23, 31), 'D4': (32, 40)}
num = lambda s: int(''.join(c for c in s['id'] if c.isdigit()))
rows = []
for name, (lo, hi) in seqs.items():
    sh = [s for s in S if lo <= num(s) <= hi]; frames = sum(s['frames'] for s in sh); secs = sum(s['frames'] * per[s['mood']] for s in sh) * SAFETY
    n = max(1, math.ceil((secs / 3600 + SETUP_MIN / 60) / JOB_MAX_H)); rows.append((name, lo, hi, frames, secs / 3600, n))
total_f = sum(r[3] for r in rows); total_h = sum(r[4] for r in rows); jobs = sum(r[5] for r in rows)
L = [f"# TapCap EP01 — final-render plan (Pass C 2i; nothing rendered)", "",
     f"Measured here (this container, software GL): 1080×1920 final look, one frame each — dawn wide S1 {per['dawnHope']:.1f} s · rain-night close S26 {per['rainNight']:.1f} s · golden sky S36a {per['golden']:.1f} s.",
     f"Projection for {total_f} frames (24 fps × 75.16 s): {sum(s['frames'] * per[s['mood']] for s in S) / 3600:.2f} h raw → **{total_h:.2f} h** with a ×{SAFETY} runner safety factor (assumption: GitHub's free 4-vCPU ubuntu-24.04 runner vs this container; re-measure on the first job).", "",
     "| sequence | shots | frames | est. h (×1.6) | jobs (≤ 4.5 h each) |", "|---|---|---|---|---|"]
L += [f"| {r[0]} | S{r[1]}–S{r[2]} | {r[3]} | {r[4]:.2f} | {r[5]} |" for r in rows]
L += ["", f"Total: {jobs} parallel jobs, longest ≤ {max(r[4] / r[5] + SETUP_MIN / 60 for r in rows):.2f} h (hard limit 6 h; `timeout-minutes: 300`). Then one assemble job (VO + clicks, captions v6, 1080×1920 `final.mp4`, no music).", "",
      "## Proposed workflow (not added to .github/ until the owner approves Pass D)", "```yaml",
      "jobs:", "  render:", "    runs-on: ubuntu-24.04          # free standard runner (public repo)", "    timeout-minutes: 300           # 5 h hard stop per job (< 6 h limit)",
      "    strategy:", "      fail-fast: false", "      max-parallel: 20               # free tier concurrency for public repos", "      matrix:", "        include:"]
for r in rows:
    span = r[3] // r[5]
    for k in range(r[5]): L.append(f"          - {{seq: {r[0]}, part: {k + 1}, shots: 'S{r[1]}-S{r[2]}', frames: '{k * span}-{(k + 1) * span - 1 if k < r[5] - 1 else r[3] - 1}'}}")
L += ["    steps: [checkout, setup-node 22 + npm ci, playwright chromium, render frames for the shard (campaigns/tapcap previz page, final look), upload-artifact (retention-days: 1)]",
      "  assemble:", "    needs: render", "    runs-on: ubuntu-24.04", "    steps: [download shards, ffmpeg concat 24 fps, mux vo.wav + clicks (fetched from the owner's private release asset, never committed), burn captions.ass, upload draft release]", "```", "",
      "## Cost check (all free on a public repo)",
      "- Standard GitHub-hosted runners (`ubuntu-24.04`) are free for public repositories; no larger runners, GPU runners, macOS or Windows runners.",
      "- Could cost money (avoid): larger/GPU runners (`runs-on` labels other than standard), making the repo private (minutes then bill past the free quota), Git LFS storage/bandwidth over quota, Actions artifact/cache storage over the free quota (keep `retention-days: 1`, delete shards after assemble), Codespaces, paid Marketplace actions.",
      "- The sponsor VO/refs must not be committed (public repo): the farm needs the VO from a private source; proposal: an owner-uploaded draft-release asset or a repo secret URL. Owner decision."]
open(f'{EP}/RENDER_PLAN.md', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[:14]))
