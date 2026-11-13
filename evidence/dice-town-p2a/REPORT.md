# Dice Town P2A — PARTIAL; creative review PENDING

## Deliverables

- [Four-second silent native film](dice-town-p2a.mp4).
- [All120 frames, sequential contact sheet](all-120-frames.jpg): frame labels and times; orange labels mark the second shot. Source WebGL PNGs, not an interpolated video or AI images.
- [Larger motion sample sheet](motion-sheet.jpg), [low-resolution preflight](preflight-sheet.jpg), native frames000/014/055/075/090/119.
- [Exact export manifest](export-manifest.json), [FFprobe](ffprobe.json), [geometry QC](geometry-qc.json), [cost](cost.json), [verdict](VERDICT.json).

## Technical result: PARTIAL

Encoding/playback/contact/determinism PASS. **Framing remains PARTIAL:** one raised arm clips the right edge of the plaza frame. Conservative AABB checks flag additional border cases (blue actor75 samples, gold55, Leo45), including intended shoulder/forearm crops in the medium close-up; they are disclosed, not relabeled as an automated framing PASS. Native055 visibly confirms the blue actor's cropped arm. The source, encoded film and report all correspond to the same final scene. One native export only; no second full-resolution corrective render was made.

## Scene / animation

Frames0–14 (0–0.5s):6.3-unit die displays upper three and rocks into its existing plinth with damped angular motion. Actual transformed vertices determine height, so it settles on y=.36 rather than hovering through a bounding-box approximation. No scale change from P1C.

Frames15–74 (0.5–2.5s): three existing supporting avatars anticipate with different head/shoulder poses, then rise with staggered easing to2.25/2.05/1.65-unit foot clearance. Arms, opposite legs and body lean change independently; a small decaying arm recoil adds overshoot. No extra rig or physics solver. Root height is corrected using actual leg vertices. The baseline artificial ground circles were removed; existing directional-light shadows respond to the moving geometry. Pip is retained but not staged; Leo is held at a constant location and visible only in the close-up.

Frames75–119 (2.5–4s): hard cut to three-quarter Leo. Persistent face geometry buffers interpolate focus/surprise/irritated brows and eyes, with a short open mouth then downturned frown. Mouth opening is authored once rather than a repetitive loop. Small head/shoulder motion supports the pose changes. Leo is positioned behind/left of a floating resident, looking up/right toward that actual target. Supporting actors use shot-specific visibility in the portrait to avoid their raised arms crossing his face; their objects and state persist. This inherits P1C's art-directed shot visibility rather than simulating a fully continuous explorable scene.

The sun, clouds and town are reused. The P1C screen-locked gradient becomes an equirectangular world-oriented sky, preserving the palette while responding correctly to the two fixed camera orientations. World cloud positions remain constant. Key light/sun are still art-directed rather than an astronomical sky model.

## Compared with P1C / creative status

Same avatar identity, wardrobe,6.3 die, shop assets, sun/cloud design. Reframing removes much of the unnecessary foreground, but some remains. The town now reacts through poses and motion rather than static upward translation alone. Leo's surprise-to-irritation is readable at phone size and his face is clear in the final portrait.

**Creative review is PENDING, not approved.** Remaining limitations: the wide-shot arm crop, some die/actor silhouette crowding, rigid knee-less leg motion, fairly restrained float/body arcs, hard long shadows and simple town surfaces. Eye direction uses whole-eye displacement and head orientation, not a pupil/eyelid rig. The settle is a short authored rock rather than a dynamically simulated heavy collision. No severe face/hair intersection observed in representative native frames and the complete sheet, but this is not a general collision certification.

## Verification actually run

- `node tests/dice-town-p2a.js`: explicit frame sampling, exact120-frame plan, cut75, grounded start, settled die, three distinct reactions, normalized face weights, final irritation and invalid seeking PASS. A first test caught JavaScript negative-zero equality; corrected the numeric zero assertion (no motion tolerance weakened).
- `npm test`: all existing source regression suites PASS.
- `npm run test:p1`: flexible pipeline/source tests plus actual WebGL/MP4 SIGTERM recovery, corrupt-frame repair, resume/cache reuse, invalidation and playback PASS, in isolated temporary output.
- Native exporter:120 forward frames and all120 reverse screenshots and states match; no page errors. Original checkpoint/cache, locking, atomic files, budget and H.264 encoder/verifier reused. Only one opt-in `--entry dice-town-p2a` was added to the existing exporter; default scene path unchanged. Entry is included in cache identity.
- Independent browser vertex check over all120 states: maximum foot-clearance error **8.88e-16**, minimum clearance **0**, maximum die/plinth contact error **1.11e-16** world units. Persistent body/face geometry IDs, both shots, world sky mapping and unchanged world clouds PASS. These numeric checks do not assert artistic quality or eliminate framing defects.
- FFprobe: H.264/yuv420p,720×1280,30/1fps,120 decoded frames,4.000s, square pixels, no audio stream. FFmpeg full decode PASS, continuous PTS, keyframe at frame75. Actual browser playback advanced to0.152s and sought both compositions without errors using the existing system-Chromium H.264 fallback.
- Reviewed all-frame contact sheet, representative native frames and low-resolution motion poses. The initial low-res run exposed a portrait arm obstruction and a transient smile-like mouth interpolation; both were corrected before the single native export. Raw review/cache images are ignored by Git.
- preservation.json records byte-unchanged prior avatar/appearance/production, pilot films/story and all P1 evidence. No S6/S7/V2/P1 history or refs were merged or rewritten.

## Actual cost

Final native job: **234.62s wall, 355.94s sampled CPU, 1387.9MiB sampled summed process-tree RSS** (.2s sampler; shared pages counted per process). Capture113.24s + reverse verification117.19s + encode1.46s.120 native PNGs total30.33MiB in ignored cache; MP4327162 bytes. Exporter's separate1s RSS sampler is in the manifest; differing samples explain its lower peak.

One complete180×320 preflight video, selected360×640 pose-review passes and geometric QC were additional costs, not included in the native-job timing. No paid services/dependencies or extra native film. Model-token/whole-task totals unavailable.

## Reproduce / source

```sh
node tests/dice-town-p2a.js
npm test
npm run test:p1
node scripts/dice-town-p2a-review.js
node scripts/dice-town-p2a-qc.js
python3 scripts/dice-town-p2a-cost.py
python3 scripts/dice-town-p2a-sheet.py
```

The profiling command invokes:

```sh
node scripts/render-shot-list.js --entry dice-town-p2a \
  --shots production/dice-town-p2a/sequence.json --out renders/dice-town-p2a-native
```

Interrupted runs resume through the existing cache. `--stop-after`, `--range` and budget handling remain available. The sequence is a bounded scene-specific contract, not an extension pretending the old P1 prop/casting schemas support arbitrary levitation. Scene initialization takes the exporter-injected shot data; inspection scripts supply it automatically. Do not open this entry without input injection and assume it is an editor.

New production/dice-town-p2a/{scene.js,sky.js,motion.js,index.html,sequence.json}, review/QC/cost/sheet scripts, focused test and evidence. Only shared code edit: bounded opt-in exporter entry. AGENTS/README/STATUS and one raw-review ignore rule updated. No full episode, audio, new wardrobe/crowd simulator, renderer rewrite or merge. Stop after this draft proof for review.
