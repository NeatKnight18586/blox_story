# Dice Town P0–P1 — PARTIAL, awaiting visual review

## Actual deliverables

- [A: native plaza](A.png), frame 0; [B: native Leo reaction](B.png), frame 30. Actual 720×1280 Three.js WebGL 2 output, DPR1, Chromium 141 / ANGLE SwiftShader; no AI-painted screenshots or upscale.
- [Comparison board](comparison.jpg): A/B at390px phone width alongside actual S6 native g0/g780. Different scenes/cameras, not a controlled matched before/after. Pilot counters/captions are already present in those preserved source frames.
- Planning proposals: stories/dice-town/CREATIVE_LOCK.md, ART_TARGET.md, ASSET_LEDGER.md. Pasted reconciled directive was authoritative; separately named attachment was absent from the workspace.

## Verified technical results

`npm test`: all existing source regression suites PASS. `node tests/dice-town.js`: isolated cached focus/surprise/annoyance, finite geometry, removable hair and persistent six-part identity PASS. `node scripts/dice-town-proof.js`: native framebuffer dimensions, actual WebGL context, four supporting identities, frame A/B reverse-order SHA256 equality, cold-reload equality, focus seeking and no page exceptions PASS; see checks.json. This is same-browser/backend determinism, not cross-GPU pixel equality.

Legacy browser regressions PASS: F1 controls/identity/mobile, F2A285 frames with reverse equality, and F2B1 436 contact measurements /146 captured frames. Recorded in browser-regressions.log. Their files are written outside Git to preserve old evidence. An initial invocation found no HTTP server; the server was started and the tests rerun. No product failure was inferred from that setup error.

preservation.json records hashes of all tracked avatar, animation, appearance, production, original story and S6 evidence files; all compared byte-identically to the branch base. The public casting, event and action APIs are unchanged. No animated crowd capability is claimed.

## Visual inspection and limits

Native A/B and the390px board were inspected. Hair clears eyes/brows; notebook/strap stay below the face; the oval head and six-part body remain recognizable. Top die pips show three (front one, side two), four inhabitants are suspended with floor projections, and Leo is grounded. Warm key / cool fill, arched shop openings, awnings, radial paving and pitched roofs improve depth and identity over the selected pilot examples. No severe actor intersection was observed in these two fixed views. P1 does not validate animated contact or die mechanics.

Creative limitations: shop facades share too much repeated vocabulary and large plain wall areas; the rule plaque is partly obscured by Leo; levitation is less immediate than a moving reveal; Leo's annoyed brow combined with the inherited thoughtful mouth can read as a smirk. Extras repeat one worried expression and lack distinguishing hair. This is a useful direction proof, not approved production art or a demonstrated final cinematic standard. No claim of pixel-perfect Roblox/UGC equivalence.

Recommendation: review these two images before further work. If this procedural architectural language is insufficient, consider one licensed import-ready stylized Mediterranean/clockwork-town modular kit with authored door/window/roof detail and compatible glTF/PBR materials. Inspect scale, mobile silhouette and license before importing. Do not grow a box-based town or facial catalog to conceal the limitation.

## Cost and reproduction

Final verification capture: 8.23 seconds wall, sampled process-tree CPU14.83 seconds, sampled summed RSS722.2MiB (shared pages counted per process). cost.json gives method; this measures the final pass, not total development or regression time. Two capture passes total during development; the final pass includes reversed and cold-reload verification. No animation/video rendered, no paid tools or new dependencies. Only two screenshots and one board are stored; original pilot images remain in place. No raw frame sequence/cache added to Git.

Run from repository root:

```sh
npm test
node tests/dice-town.js
node scripts/dice-town-proof.js
python3 scripts/dice-town-board.py
```

Preview: `npm run preview`, then `/production/dice-town/`. No wall-clock sampling; renderFrame0/30/60 are fixed explicit-frame samples. Stop here: no P2, audio, episode, merge or publication.

## Changed files

- AGENTS.md current task boundary only; README.md usage and STATUS.md verified outcome.
- stories/dice-town/{CREATIVE_LOCK,ART_TARGET,ASSET_LEDGER}.md proposals.
- production/dice-town/{index.html,scene.js,leo-faces.js,hair.js} isolated demo and reused hair.
- scripts/dice-town-proof.js, scripts/dice-town-board.py, tests/dice-town.js.
- evidence/dice-town-p1/ two native images, comparison board, this report, hash/preservation/cost receipts and concise test logs.

No tracked prior engine, story, film or evidence file changed. The new feature branch is local; no PR, merge or publication was performed.
