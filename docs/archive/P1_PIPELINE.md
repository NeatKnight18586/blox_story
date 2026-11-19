# P1 — Reusable Shot Pipeline

A small offline renderer for one canonical actor, the original workshop and chest. Scene choices live in JSON; rendering, recovery, encoding and verification use the same code. The F1 avatar, appearances, F2A actions and both F2B1 gaits are unchanged. No animation blending involving walking is introduced: shots cut explicitly.

## Reproduce

Requires Node, the pinned npm dependencies, Playwright Chromium, and FFmpeg/FFprobe with libx264 on PATH. Native H.264 playback requires a capable Chromium; this machine uses `/usr/bin/chromium` automatically when bundled Chromium lacks the codec. Override with `PLAYBACK_CHROMIUM=/path/to/chromium`. A missing playback decoder fails verification rather than reporting PASS. No added npm packages or external service.

```sh
npm ci
npx playwright install chromium
npm test
npm run test:p1
npm run render:shots -- --shots production/feasibility.json --out renders/feasibility --reference evidence/production/manifest.json
npm run render:shots -- --shots production/not-today.json --out renders/not-today
```

No manually started server is needed for this CLI. It owns a loopback-only server on an available port, browser and encoder, and closes them on completion. Existing avatar browser tests still use `npm run preview` on port 8000.

The same command resumes by default. For a planned pause add `--stop-after 20` (new captures per invocation). Ctrl-C/SIGTERM checkpoints the current completed frame, closes the browser and exits 130. SIGKILL/power loss may leave a stale lock; a subsequent invocation reclaims it only when its same-host PID is gone. A live or foreign-host lock is rejected. `--no-resume` forces recapture but does not remove old results. `--max-temp-mb 512` bounds total cache bytes, including other job fingerprints and atomic write copies; the default is 512 MiB, maximum 4096. At least 1 MiB of disk must remain free. This is a checked budget, not an OS disk quota; an encoder can briefly exceed it before the post-encode check. It never publishes on budget failure.

Read `<out>/latest.json` to find `results/<id>/movie.mp4`, `contact-sheet.png` and `manifest.json`. Results are immutable per invocation. `last-run.json` records the latest attempted job, including failure/pause. The atomic latest pointer changes only after encoding, verification and evidence complete. Consumers should use that pointer rather than guessing a filename.

Use a dedicated output directory. Nonempty unowned folders, symlinks and multiply linked files are rejected. Output paths are literal arguments, never interpolated into a shell command. Ownership marker, exclusive lock, atomic checkpoint writes and a content fingerprint protect local jobs. These checks assume a cooperative local filesystem; they are not a defense against a concurrent hostile process replacing path components. No recursive deletion or automatic cache purge is performed. `renders/` and raw evidence frames are Git-ignored. After a job is stopped, a developer may explicitly remove its dedicated cache to reclaim disk; verified results are separate. Do not commit numbered frames.

## Shot-list version 2

Start with [not-today.json](production/not-today.json). Version 1 [feasibility.json](production/feasibility.json) remains unchanged and supported as a strict regression contract.

```json
{
  "version": 2,
  "title": "A different original scene",
  "output": {"width":720,"height":1280,"fps":30},
  "environment": {"kind":"light-workshop","plinthPosition":[0,0.65,3]},
  "props": [{"id":"chest","kind":"light-chest","position":[0,1.61,3],"initial":{"open":0}}],
  "events": [{"id":"reveal","target":"chest","channel":"open","start":12,"end":30,"from":0,"to":1,"proximityRadius":1.5}],
  "shots": [{
    "id":"reaction","start":0,"end":90,
    "camera":{"position":[4,4,8],"target":[0,2.8,2],"fov":48},
    "action":{"name":"look_react","options":{"direction":"right"},"timeOffset":0},
    "origin":{"position":[0,0,1.8],"yaw":0},
    "face":"worried","appearance":{"color":"#bacbd1","cosmetic":"cap"}
  }]
}
```

- All timing is integer frame indices, start inclusive/end exclusive. Shots are contiguous from frame 0; their last end determines total duration. Output is even 9:16 pixels, 180×320 through 720×1280, integer 1–30 fps. Limits: 1–32 shots, 18,000 frames, eight props, 128 events, 1 MiB input. Unknown fields fail early rather than silently doing nothing.
- Each shot has its own fixed camera, any existing action (`idle`, `look_react`, `walk`), action options and optional nonnegative `timeOffset` in seconds. Action time is `(frame-start)/fps + timeOffset`. Walk gait options are `baseline` or `readable`; baseline remains the default. Reaction direction is `left` or `right`. Actions reuse the existing explicit-time sampler unchanged.
- Placement is an absolute grounded `[x,0,z]` and yaw in radians. +Y is up, +Z is forward. Alternatively use `originFromEndOf:"earlier-shot-id"` to inherit that shot's endpoint displacement/yaw, grounded at the next origin. It does not continue action phase automatically. For continuous walking across a camera cut, reuse the same explicit origin and advance `timeOffset` by the prior shot duration. A walk offset includes absolute root displacement; combining it with an inherited endpoint would add that travel twice. Use inherited endpoints for a fresh local action (for example, idle after walking). Different camera/face/appearance at a cut are deliberate editorial choices.
- Every shot specifies a complete normalized appearance: omitted color resets to neutral `0xbfc1c3`, omitted pieces to none, omitted cosmetic to null, omitted face to `classic_smile`. This prevents random-access seeking from retaining earlier appearance. Piece keys are the six existing body names; colors are 24-bit integers or `#rrggbb`. Faces are `blank`, `classic_smile`, `worried`; the optional existing cosmetic is `cap`.
- Workshop options are just `colors:{background,floor,backWall,sideWall}` and grounded plinth position `[x,.65,z]`. Chest placement is independent: authors align it to the plinth. These are two factories, not an asset registry or environment engine.

## Events and rendering

`compileShotList` validates a cloned input; `sampleShotList(plan,frame)` returns all state from that frame alone. The version 2 implementation is in `production/shots.js`; version 1 remains in `production/timeline.js`. Props expose `apply({open})` and overwrite their complete animation state. Events are intentionally limited to the chest's `open` channel, values 0–1. They smoothstep between explicit endpoints, hold the last value and support repeated opening/closing. Overlapping/discontinuous events on one prop are rejected. Optional proximity is checked against sampled actor X/Z at event start; it is a scripted gate, not runtime collision or gameplay physics. No mutable event queue, random values or wall clock.

Reusable workshop/chest factories preserve original geometry, lights and construction order. Browser `production/render.js` accepts injected JSON and applies actions, placements, appearances, events and fixed cameras. The CLI injects the chosen file before module execution; the standalone production page still defaults to the feasibility scene.

Cache identity includes exact JSON bytes, engine JS/HTML, package files, browser version, WebGL backend and platform/architecture. Each completed frame has dimensions, state, PNG SHA-256 and a checkpoint. Missing/corrupt PNGs are recaptured; uncheckpointed files are never trusted. Engine/input changes use a different cache. The final verification re-renders **every frame in reverse order**, comparing pixels and state; an optional reference manifest checks every approved feasibility hash. Cross-GPU pixel identity is not promised.

FFmpeg writes a private pending H.264 Main level 3.1, yuv420p, BT.709 limited-range, square-pixel, fast-start MP4, with constant frame rate and keyframes at every cut. Verification checks codec, resolution, aspect, duration, exact frame count, every decoded presentation timestamp, cut keyframes, full decode, native HTML5 playback and seeking. A contact sheet is derived from decoded MP4 frames, capped at 12 thumbnails. Browser errors, missing frames, nondeterminism or failed verification block publication. Two FFmpeg threads, one renderer browser and one frame at a time keep the implementation small. Process-tree RSS is sampled once per second, counts shared pages per process, and is an estimate rather than a memory limit.

## Tests, evidence and boundaries

`npm test` retains all existing API/contact tests and adds P1 schema/events/factory/filesystem tests. `npm run test:p1` additionally performs actual SIGTERM recovery, corrupt PNG repair, complete/cache-only renders, input invalidation, failed-budget publication protection, full decode and native playback using a tiny 12-frame fixture. The fixture is temporary, not another production engine path. See [P1 evidence report](evidence/p1/REPORT.md) for full-size results/resources and original-scene regression.

This is silent offline output, not real-time capture. Fixed cameras and hard cuts remain; authors must check framing, environment boundaries, collisions and narrative timing. There is no scene collision solver, multi-actor track, camera movement, wardrobe, audio, editor, story generator, walking transition or torso redesign. The two data files prove reuse within this deliberately small asset/action vocabulary. Future optional tapered/hourglass torso stays the separate opt-in geometry proposal in PRODUCTION_FEASIBILITY.md, preserving the default six-part rig and requiring its own silhouette/contact/appearance tests. Stop after P1 review before adding features.
