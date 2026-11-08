# blox_story — P5: three-issue finishing gate
**PLANNING BRIEF — not implemented or approved for whole-episode rendering.**
Prerequisite: PR #16 `codex/names100-p4-counter-look` passes a quick final regression/evidence review; merge only if clean, preserving history. P4 Minimal Editorial counter becomes our chosen direction. Work from updated main on a new PR.

## Why
P4 native 720×1280 evidence proves the resolution but exposes (1) harsh/stepped ground and face shadow edges, (2) doubled/overlapping ghost hair/garment/limb surfaces, and (3) weak warm-white numeral contrast over the light sunrise wall (raw white fill ~1.91:1 despite dark outline). The remaining problems are localized. Do not broaden into a renderer upgrade or new asset library.

## Accepted baseline
- Keep original F1 six-part rigs, approved Eli/Mara appearance, S3B acting, storyboard/23 shots and S1 color script.
- Keep separate 3D, P4 counter overlay, S3C white caption overlay, ElevenLabs audio and stable 30fps absolute timing. Existing silent films/hash evidence must remain valid, legacy HUD remains available.
- Counter stays **unboxed, no gold border, no bounce/particle effects**, meaningful frames only. Eli100 through788; 99 at789; Mara restore890–926; countdown at1210/1236/1261/1278; zero1529. Don't change the script or beat timings.

## Tasks — one controlled solution each
**A. Shadow finish.** Inspect existing Three.js PCFSoftShadowMap and courtyard/bedroom directional shadow frusta first. Tune the **opt-in new story look only**: practical shadow camera coverage, resolution/bias/normalBias or inexpensive contact-shadow substitute. Avoid shadow acne, detachment and hard stepped edges. Compare at native frame1392 and1628; preserve light direction, geometry and nighttime mood. If no measurable visual improvement within a small modification, report limitation and retain old system rather than adding VSM, shaders, postprocess frameworks.
**B. Ghost material clarity.** In native frame700 and a post-zero frame1628, remove confusing stacked translucent silhouettes without losing face readability, head/hair distinction, bodily presence or intentional translucency. Prefer a simple consistent single-front-surface/depth rule or hide redundant inner ghost layers; inspect existing `ghostFrontDepth`/opacity and mesh renderOrder before touching geometry. Ghost → human 890–926 and Eli forgotten from1529 must remain deterministic in cold/reverse seeking. Don't modify base meshes, material identities permanently, or legacy styles.
**C. Sunrise counter contrast.** Keep warm-white numeral on dark night shots. Test **dark-charcoal numeral on light background for S22** (1→0) with a restrained light keyline if required; no panel. Aim for clearly legible mobile-size glyphs and at least ~3:1 contrast on the fill against the actual wall where feasible. Keep captions independent; no text overlap. Try only this one alternate treatment, preserve position/timing, and compare native1528/1529 side by side.

## Evidence and cost gates
1. Read only P4 report/current P4 style/config plus relevant light, ghost and counter files; historical STATUS may be consulted selectively, not dumped in full. Run lightweight PR16 checks then merge if clean.
2. Before coding, identify the actual issue in source. Implement small opt-in fixes; render **5 matched clean true-720×1280 WebGL stills**: global700,1392,1528,1529,1628. Composite counter/captions for corresponding scenes. Create paired before/after and a phone-reduced 3-up overview. One targeted revision maximum per issue if the first attempt is worse; no random visual experiments.
3. After static approval, **optional one 1–2-second 720×1280/30fps motion excerpt** across the worst ghost/ending action to verify transparency seeking and motion shadows. Do not render the entire 54.7s story.
4. Run affected F1/F2/P1/P2A/story/overlay tests, precise counter/native boundaries, real WebGL cold/reverse seek, shadow/contact/visibility checks and genuine MP4 decode/playback if video exported. Preserve previously accepted original movie hashes. Report measured wall and memory cost, PASS/PARTIAL/FAIL individually for A/B/C. Keep raw frames out of Git.
5. Submit PR with compact evidence. Stop for human visual approval; no automatic final episode, captions or voice change.

## Hard stopping rule
If P5 stills improve all three areas, **end look-development**. Next separate tasks are: (i) one complete low-res narrated+captioned+counter rough-cut QC using S3B, (ii) one final 720×1280/30fps clean 3D export plus text/audio composition and verification. Prioritize finishing and publishing the first Short over further small cosmetic tweaks.

## Usage rules
One relevant planning brief, targeted source reading, still-first proofs, one chosen design iteration, and one affected regression run. No general shader pack, high-res texture library, new rigs, third-party model packs, huge scene editor, new audio API, fine-tuning, full-city generation or needless dozens of renders. Be precise about evidence: a software test PASS is not creative approval.
