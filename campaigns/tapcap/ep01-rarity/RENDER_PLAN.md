# TapCap EP01 — final-render plan (Pass C 2i; nothing rendered)

Measured here (this container, software GL): 1080×1920 final look, one frame each — dawn wide S1 12.3 s · rain-night close S26 11.3 s · golden sky S36a 6.5 s.
Projection for 1804 frames (24 fps × 75.16 s): 5.60 h raw → **8.96 h** with a ×1.6 runner safety factor (assumption: GitHub's free 4-vCPU ubuntu-24.04 runner vs this container; re-measure on the first job).

| sequence | shots | frames | est. h (×1.6) | jobs (≤ 4.5 h each) |
|---|---|---|---|---|
| D1 | S1–S13 | 602 | 3.30 | 1 |
| D2 | S14–S22 | 315 | 1.73 | 1 |
| D3 | S23–S31 | 435 | 2.19 | 1 |
| D4 | S32–S40 | 452 | 1.74 | 1 |

Total: 4 parallel jobs, longest ≤ 3.40 h (hard limit 6 h; `timeout-minutes: 300`). Then one assemble job (VO + clicks, captions v6, 1080×1920 `final.mp4`, no music).

## Proposed workflow (not added to .github/ until the owner approves Pass D)
```yaml
jobs:
  render:
    runs-on: ubuntu-24.04          # free standard runner (public repo)
    timeout-minutes: 300           # 5 h hard stop per job (< 6 h limit)
    strategy:
      fail-fast: false
      max-parallel: 20               # free tier concurrency for public repos
      matrix:
        include:
          - {seq: D1, part: 1, shots: 'S1-S13', frames: '0-601'}
          - {seq: D2, part: 1, shots: 'S14-S22', frames: '0-314'}
          - {seq: D3, part: 1, shots: 'S23-S31', frames: '0-434'}
          - {seq: D4, part: 1, shots: 'S32-S40', frames: '0-451'}
    steps: [checkout, setup-node 22 + npm ci, playwright chromium, render frames for the shard (campaigns/tapcap previz page, final look), upload-artifact (retention-days: 1)]
  assemble:
    needs: render
    runs-on: ubuntu-24.04
    steps: [download shards, ffmpeg concat 24 fps, mux vo.wav + clicks (fetched from the owner's private release asset, never committed), burn captions.ass, upload draft release]
```

## Cost check (all free on a public repo)
- Standard GitHub-hosted runners (`ubuntu-24.04`) are free for public repositories; no larger runners, GPU runners, macOS or Windows runners.
- Could cost money (avoid): larger/GPU runners (`runs-on` labels other than standard), making the repo private (minutes then bill past the free quota), Git LFS storage/bandwidth over quota, Actions artifact/cache storage over the free quota (keep `retention-days: 1`, delete shards after assemble), Codespaces, paid Marketplace actions.
- The sponsor VO/refs must not be committed (public repo): the farm needs the VO from a private source; proposal: an owner-uploaded draft-release asset or a repo secret URL. Owner decision.
