# BLOX_STORY — CLAUDE / FABLE 5.2 PRODUCTION HANDOFF

**Prepared:** 2026-11-10; **corrected:** 2026-11-11 (Asia/Manila)  
**Project:** `NeatKnight18586/blox_story` — https://github.com/NeatKnight18586/blox_story  
**Handoff purpose:** Move production management to Claude, assess a temporary ~72-hour Higgsfield MCP promotion, and build a **durable, reusable, original Roblox-inspired 3D Shorts studio** that works after access expires.  
**Owner's constraints:** Solo college-student creator, iPad-first, near-zero recurring cost, limited Claude model quota, no gameplay recording or manual character-by-character animation, reusable code-generated media, robust export, actual files/MP4 rather than UI simulations, and strong creative quality without endless R&D.

> **Read this before changing code.** This is a fresh strategic handoff, **not a claim that its recommended work has been implemented**. Verify the live repo and actual account entitlements. Existing `AGENTS.md`, README and STATUS contain historically accumulated and sometimes contradictory task-specific directions; do not assume their opening sections describe the latest unfinished task. Inspect the code and actual evidence first.

## 0. Required end state and the correct hypothesis

Create a sustainable, camera-first production system for high-quality stylized blocky 3D stories. The temporary advantage of Fable and Higgsfield must become **persistent assets, validated tools, art direction and reproducible footage**, not a dependency that vanishes when the promotion ends. The strongest 72-hour deliverable is **a compact studio kit and a genuinely excellent 8–15-second 1080p production proof** that shows character, environment and acting together; a complete polished 117-second Dice Town remake is a stretch goal, not a guaranteed three-day deliverable.

**Non-negotiable:** A 360×640 storyboard video scaled to 1080p/1440p/4K does NOT acquire native detail. No fake claims of HD, finished animation, generated mesh or working video. Real proof must be generated from the actual Three.js/Blender source at native resolution. Don't substitute unrelated frames to hide missing footage. Start from the existing 3D work, not from scratch unless a controlled A/B test proves replacement genuinely improves it.

## 1. Current repository facts — verified against GitHub

- Core stack: original **Three.js 0.187.0**, Playwright **1.56.1**, deterministic explicit-frame scene capture, Python + FFmpeg assembly, GitHub/CI cloud rendering. No mandatory paid rendering infrastructure. User previously worked entirely from an iPad, so headless tooling and GitHub access matter.
- Original stylized **six-part classic R6-like block avatar** with softly rounded/oval cylindrical head, five named pivots, persistent geometry, configurable expression/appearance/hair, and deterministic idle/look/walk. It is an original Roblox-inspired aesthetic, **not an official Roblox asset**. Preserve it as baseline and add a **versioned opt-in V2 look** rather than breaking existing films/tests.
- Episode 1 / prior pilot `names100`: roughly **54.7 seconds**, successfully native-rendered at **720×1280/30fps** with separate captions, counter and audio pipelines; technical proof exists, art quality was not considered a finished creator-standard result. Evidence: `evidence/names100-s6/`.
- Current Dice Town story: **The Sixth Roll**, exactly **38 editorial shots**, **3,513 frames at 30fps**, **117.100s** video. Narration is an ElevenLabs Adam WAV **117.098231s, already at 1.25×**. The WAV is private/not committed to GitHub. NEVER speed it again, upload it without the owner's consent, or invent a replacement voice. Future episodes should be at least 90 seconds per owner preference.
- Dice Town plot: a giant die imposes a daily rule. Leo hates uncertainty and keeps a notebook. A suspicious wobble prevents the die landing six. Pip, physically ten although the town was trapped for thirty years, used a brass paddle/crank/removable pin to manipulate rolls. Residents inside do not age; his family outside did. Leo removes the pin and gives Pip agency. Pip refuses to reinstall it on succeeding mornings. On the sixth sunrise the fair die lands six, the town gate opens, Pip's now-older mother recognizes him and preserved his childhood chair, and Leo closes the notebook. Causality and emotional continuity are story-critical.
- Current latest verified **implementation**: draft **PR #49** (commit `433e246`, branch `codex/dice-town-p4b3-ending-integration`), full silent **360×640/30fps, 117.100s** `evidence/dice-town-p4b3/working-edit.mp4`, detailed `edit-map.json`, report, contact sheets. Engineering tests PASS, but **40.8198% / 47.8 seconds** of timeline remains the original storyboard proxy; much of the rest is held stills/endpoints. The filmed opening and middle are NOT release-ready.
- **UPDATED 2026-11-11:** PR #51 (`codex/dice-town-p4b4-backstory-repair`) IMPLEMENTED D17–D22/D24 and reduced remaining proxies to **22.317% / 784 of 3513 frames**. PR #52 (`codex/dice-town-p4b5-opening-direction`) is documentation-only guidance for the remaining nine opening/investigation shots; do not treat it as implemented. This handoff branch diverges *before* PR #51: inspect both newer branches and the actual source/evidence and pick a clean tested base before building V2; never merge PR stacks blindly.
- The PR chain is long and branches are stacked. **Do not merge or rebase dozens of drafts blindly**; first discover the actual ancestry / latest common ancestor / state of `main`, then create an isolated `studio-v2` branch from the latest tested implementation if appropriate. Preserve all earlier evidence, deterministic engine behaviors and user-authored stories.
- The user tried a hurried “publish cut” assembled from the 360p working edit with narration/captions, then upscaled to 1440p/1080p. It played poorly or looked unsatisfying. **This was a failed artistic release, not a reason to erase the core engine**. The quick cleanup reused unrelated footage to cover story gaps. Do not repeat this technique.

### Important source/evidence entry points

- `F1_SPEC.md`, `avatar/baseAvatar.js`, `avatar/actions.js`, `appearance/`, `production/dice-town/`.
- `production/dice-town-p2a/` and `production/dice-town-p3b1/` through `production/dice-town-p4b3/` (actual code directories need confirmation; stages vary in naming).
- `production/dice-town-p4b1/die.js` (durable six-sided die geometry with correct opposite faces), `production/dice-town-p4b1/photo.js` (reusable family photo motif).
- `production/dice-town-p3b4/scene.js` (plaza, road, sun/clouds, installed gate and house axis).
- `evidence/dice-town-p4b3/REPORT.md`, `phone-comparison.jpg`, `edit-map.json`, `working-edit.mp4`.
- `stories/dice-town/P3A_PRODUCTION_LOCK.md` (eight reusable camera/scene families), `stories/dice-town/P3A_SHOT_OPTIMIZATION.md` (all 38 shot costs and directions), `stories/dice-town/P4B4_PIP_BACKSTORY_INTEGRATION_DIRECTION.md`.
- `scripts/dice-town-p4b3-assemble.py`, tests and earlier pipeline/scripts.

## 2. Critical tool distinction: Fable versus Higgsfield versus 3D

**Claude Fable 5.2** (released 2026-11-09) is a high-capability reasoning/coding model. It can inspect a project, plan systems, write Three.js code, generate Blender Python code, debug asset importers and evaluate screenshots. **It is not itself a native `.glb` generator just because it can describe a character.** Anthropic recommends starting most development with Opus 5.5 and escalating to Fable for unusually difficult work. Current docs: https://www.anthropic.com/claude-fable-and-mythos-5-2 and https://platform.claude.com/docs/en/models/fable-5-2/overview . Pro quotas and specific Fable access vary; confirm UI before assuming unlimited use.

**CORRECTED 2026-11-11 — Higgsfield supports actual 3D:** Beyond image/video/audio, Higgsfield documents Blender 3D-model generation, rigged animation and editable scene building. Its 3D Jutsu exports `.blend` and `.glb` scenes; MCP tool catalogs also document `generate_3d` (text/image/multiview→GLB), `3d_rigging`, and 3D scene builder tools. **Verify actual exposed tools, export rights, rig correctness and plan/model costs in the connected Claude session**; these features are not guaranteed free or included in the particular 72h promo. Official: https://higgsfield.ai/blog/higgsfield-blender-plugin and https://higgsfield.ai/blog/higgsfield-3d-jutsu ; external MCP tool schema: https://docs.scalekit.com/agentkit/connectors/higgsfieldmcp/ . An AI-generated image/video is still NOT editable 3D; require downloaded real GLB/BLEND, full topology/rig/material validation and direct Three.js playback before declaring an asset reusable.

**72-hour promotion/billing:** A social promotion dated ~Nov 9–10, 2026 reportedly offers a **free 72-hour Higgsfield MCP trial** with generous/unlimited image/video/audio access. This is a **promotion subject to terms**, not a guarantee for this account. Higgsfield's normal help docs say MCP always consumes credits. Carefully read the checkout's included models, actual limits/fair use, free eligibility, renewal/cancellation; the promo is reported to **auto-renew as a paid Ultra subscription after 72h unless canceled**. Confirm the actual subscription receipt, set a calendar alert before the end, and do not let the trial determine whether the repo still works. Promotional social record: https://www.sotwe.com/higgsfield ; official general guidance: https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp .

**Licensing:** Higgsfield says users may commercially use their outputs after cancellation, subject to terms, likeness/IP and watermark restrictions; it also prohibits using outputs to train/fine-tune AI models without permission. Keep a dated provenance ledger and exported originals. Source: https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially .

**True reusable 3D:** Generate geometry in Three.js, script original Blender meshes/rigs and export `.glb`, or import carefully vetted third-party CC0 low-poly geometry. Three.js officially supports glTF 2.0 via GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html ; validate GLB with Khronos glTF Validator: https://github.com/KhronosGroup/glTF-Validator . An old candidate from Kenney Blocky Characters was **rejected for the lead** because its cube/painterly style was not a meaningful improvement; CC0 background pieces may still be useful after a visual test. Do not let asset provenance be ambiguous.

## 3. Four-council harsh verdict

### Council A — Senior animation/art director (current approach 4/10; target system 8/10 if visually proven)
- Strong concept and solid code-driven work, but current characters resemble basic blocks with crude styling; background facades repeat, lighting is flat at times, subtle acting and family payoff are underdeveloped. Upscaling does nothing for those weaknesses.
- Necessary: an exact **visual style bible**, three genuine native 1080p “hero frames” from the real engine, repeatable materials/lighting/cameras, silhouettes readable at 390px, expressions tested in motion, foreground/midground/background depth and continuous grounded environments. “Roblox-inspired” is not synonymous with default block primitives and no art direction.
- Reject: using unrepeatable Higgsfield fantasy images as models; chasing detailed realism while all existing animations are R6/blocky; inconsistent hair/head proportions across shots; random generative style changes.

### Council B — 3D technical director / software architect (engine ~8/10; production organization ~5/10)
- Keep deterministic scene sampling, resumable headless rendering, H.264/FFmpeg, test evidence, camera-bounded worlds, opt-in stages.
- Weakness: dozens of stacked proof PRs; repeated purpose-built scene scripts; old readmes/AGENTS mix obsolete and current scopes; no authoritative asset manifest/variant interface or release gate. Most recent release was edited from low-res proxy rather than native scene source.
- Build **minimal** asset ingestion + lookdev + release tools before massive asset collection. Don’t rewrite everything as a new engine. Need one known-good branch and one real end-to-end native 1080p/30fps test first.

### Council C — AI asset/production economics (plan 7.5/10 if selective; 2/10 if mass generating)
- 72h should yield persistent **turnarounds, textures, matte plates, concise style recipes, and selectively recreated 3D props**. Outputs must be saved locally/in repo with provenance. Archive prompts/seeds/references if provider supplies them.
- Huge uncurated batches of images or transient 15-second video clips become sunk cost if they cannot be reproduced, rigged or legally reused. Optimize the **number of approved, integrated assets**, not number of generations.
- Fable is costly/limited even on promotion; reserve for architecture hard problems, scene consistency and a final review. Opus/Sonnet can do implementation iterations. Do not promise exact token savings without measuring.

### Council D — Shorts executive producer (current release-readiness ~3/10)
- The existing 117s Dice Town working cut is NOT publication-ready: ~41% placeholder time, repeated static holds, mismatched story imagery, no complete HD continuity verification.
- A production team would set the creative lock, make a short **golden proof** of the new look, test that exact pipeline for a whole shot, then integrate the story in order of audience impact—not develop isolated glamorous assets forever.
- Minimum next series episode stays **90 seconds**, but building the whole library **and** a high-quality two-minute film inside 72 hours is aspirational. Target a validated, good-looking 8–15s reel proof and durable studio tooling by the end of the trial. Publish only when the full episode has no obvious story placeholder/substitute shots.

## 4. The durable mini-studio — what to own after the trial

**Priority 0 — Visual bible (owned source, not only pictures)**
- One consistent aesthetic: original, toy-like R6-inspired humanoids; rounded head, readable hair, bevels, clear clothing planes; cohesive palette, material roughness, soft key/fill/rim lighting, sky/clouds, strong but controlled cast/contact shadows, grounded streets; no photorealistic skin.
- Canonical proportional drawings: hero adult/child ratios, head/torso/leg sizes, hair volume, shoes/hand add-ons (if compatible), 5–7 facial expressions, wardrobe separation, color swatches, day/night grade, 9:16 camera rules.
- Reference **native source** screenshots to compare art to implementation. Generate concept/lookdev reference images through Higgsfield only after selecting one source frame/style.

**Priority 1 — One upgraded modular character family (not 15 unique models)**
- Retain one working six-part named-pivot avatar and deterministic actions. Provide opt-in V2 appearance/geometry adapters; no breaking default F1 tests.
- Ship three presets: **Leo** (teal, identifiable shaped brown hair, notebook), **Pip** (child-scale rust, distinct silhouette/face) and **Older Mother** (gray-touched hair, cream V/purple, age difference). Optional background NPC reuses the same base with 2 palette/clothing variants.
- Only model accessories that help camera-visible acting: hair modules, clothing trims, removable shoes/props, 3–5 facial shapes; use rigs where technically necessary but avoid uncontrolled skeletal overhauls.
- Validate front/3/4/profile, expressions, two extreme poses, at 390px and native 1080px, no collision and same character across time/place.

**Priority 2 — Small modular world kit**
- Reuse existing plaza, gate, wall, die, clock tower, cellar chamber and home interior. Add only reusable parts that fix specific shots: paved road segments, 2–3 distinct facade variants/rooflines, arched windows/doors, market awning, trim/gutters/lamps, foliage silhouettes, floor-to-wall corners, small kitchen table/chair, 1–2 flexible interior wall shells.
- Ensure one consistent “grounded world”: roads vanish into distance, no floating-island or cut-edge look; sky and shadows consistent across camera setup. Use shallow scenery where the camera cannot see depth.
- Store source meshes or reproducible Three.js/Blender scripts, NOT just 2D illustrations.

**Priority 3 — Shot and motion library**
- Existing deterministic idle/look-react/walk are valuable. Add only reusable high-impact moves proven in a real edit: reach, hold/look, head turn, object pass, lever operate, door open, notebook close, staggered floating, limited reaction/blink. Use cutaways, pose-to-pose, hold frames, animated camera over a native 3D still, restrained particles; no unnecessary universal animation framework.
- Keep a small named shot kit: wide-establish, OTS, medium emotion, extreme insert, low-angle action, silhouette/doorway, safe mobile captions and transition templates. Reuse F1/F2 action methods.

**Priority 4 — Asset/release tooling and archive**
- Minimal manifest per asset: `id, type, origin, source/provider, export/source paths, license, hash, unit scale/pivot, materials, dimensions, approved variants, tests, sample screenshot, authoring recipe.` Save legal provenance and terms.
- For imported 3D GLB: glTF schema validity, no NaNs/invalid quaternions, expected object hierarchy, unit normalization, texture path/size, missing geometry/material checks, pivot contact, visual turntable. A raw PNG or MP4 must never be falsely marked as 3D reusable geometry.
- Native clip output: default **1080×1920/30fps**, H.264/yuv420p + AAC, captions authored separately then burned in at output; optional 1440p/4K only after measured native rendering feasibility. Avoid 360p-first final workflow. Progressive screenshot/capture in bounded segments, cache by asset/scene/shot hash, recompute only changed frames, verify decoded frames and audio sync.
- The project should build from a clean checkout WITHOUT live Higgsfield, Fable tokens, API keys or hidden temporary caches.

**Suggested layout (adapt to actual repo; DO NOT blindly duplicate existing directories):**

```text
studio/
  STYLE_BIBLE.md
  ASSET_MANIFEST.json
  assets/characters/       # reusable original geometry/presets + approved GLB where suitable
  assets/environments/     # facade, road, trim, doors, home, chamber modules
  assets/props/            # notebooks, chair, photo, die, clock, market details
  lookdev/                 # standardized lighting/camera/material presets
  shots/                   # reusable camera/framing and acting recipes
  qa/                      # glTF validator, native screenshot & mobile framing gates
  docs/                   # provenance, task briefs, production gates
  generated/               # exclude bulky raw/temp files via .gitignore
```

Do not create all these folders as empty scaffolding. Implement only where an actual approved asset/job requires it; keep current import paths stable.

## 5. 72-hour sprint — schedule gates, not an unbounded asset spree

**Pre-flight, BEFORE trial activation (as much as possible):**
1. Clone/inspect the latest tested branch and PR graph. Identify outdated `AGENTS.md` scope. Make an isolated V2 branch; tag/reference working P4B3 evidence. Confirm reproducibility of existing 10s/117s samples and dependencies.
2. Verify Claude account Fable/Opus model entitlements, usage reset/rate limits; Higgsfield 72h actual checkout terms/renewal and first MCP balance. Stop if not genuinely free as promised. Keep secrets out of repo. Set manual cancel reminder if using a payment method.
3. Pick **three native camera views** from current 3D scenes to use as baseline comparison: plaza, Leo close-up, reunion doorway. Select target art direction without drowning in vague reference images.

**0–8h of trial — Art target and technical feasibility:**
- Fable **High** for a single architecture/style audit and a minimal V2 upgrade plan (avoid repeated giant council prompts).
- Higgsfield only for a small curated lookdev batch: 2 character-style alternatives, 2 town lighting/background alternatives, 1–2 matching key emotional frames, in 9:16. Evaluate the outputs before spending further generations. Save approved prompts, output files, account/tool/terms metadata.
- Opus 5.5 **Medium** executes **one real 1080p WebGL frame** matching the chosen look and baseline. If it still looks basic, adjust light/material/shape before generating more images.

**8–24h — Lock one master character and one world slice:**
- Upgrade Leo as an opt-in reusable preset, then derive Pip/mother from the same master, not independently inconsistent models. Hair and clothing add-ons may use Higgsfield lookdev/texture reference but must exist in 3D as source or GLB.
- Build one camera-visible plaza + street/doorway composition with controlled sky and shadows, enough to pass visual comparison.
- Validate native 1080 screenshots and mobile 390px comparisons (including motion poses); reject materials/models that don't match.

**24–48h — Golden production shot and portable assets:**
- Produce one **8–15s original native 1080×1920/30fps** real Three.js sequence using a wide, an action insert and a close-up, with real animation and stable edited continuity; source may be an excerpt from Dice Town if it is easy to integrate. Do not rely on generated 2D video masquerading as 3D.
- Include a short verified second shot at different lighting/camera to prove **asset reusability**. Prioritize robust render/verification and a clean source/asset package.
- Optional Higgsfield generated 2D inserts may be evaluated for rare story-specific flashback/matte use, but reject if not stylistically consistent with the 3D scene or if they cause flicker / facial identity drift. Do not spend the trial on hundreds of full-scene videos.

**48–60h — Make the pipeline work without Higgsfield:**
- Build the approved asset manifest, GLB/source validators, reproducible lookdev scene, reusable shot presets and documented fallback for generating props with Three.js/Blender scripts plus CC0/owned sources.
- Run clean checkout on ordinary Claude Opus/Sonnet or CI, with Higgsfield connector DISABLED and cached local assets. The test is: can a new scene render tomorrow with no paid generation service?
- Only then tackle a bounded group of Dice Town proxies if time remains; no need to rebuild the full 117s film before proving the foundation.

**60–72h — Freeze, archive, and verify:**
- Export high-quality preview MP4, native stills, assets/source/manifest, compact demo project, tests, usage receipts, license ledger and an instruction file for an Opus-only continuation.
- Download ALL approved outputs from Higgsfield into owner-controlled storage while account remains accessible. Verify zip extraction and Git repository references. Do not accidentally commit giant raw archives to Git; store necessary optimized files and archive source elsewhere with checksums.
- Test again with the Higgsfield MCP disabled. Confirm billing/cancellation status before the renewal. Keep one clear report listing exactly what is finished vs prototype.

**Do not confuse:** 72 hours elapsed ≠ 72 hours of Fable compute; Pro usage allowances still matter. Stop chasing perfection as soon as the creative gate is met.

## 6. Hard acceptance gates

**Gate A — True reusable assets:** a file or source script, identifiable license/ownership, manifest metadata, one clean import or regeneration, one native screenshot; at least 3 modular appearance presets and 3–6 genuinely reusable world modules with visually approved examples. A folder of AI image generations alone fails this gate.

**Gate B — Production visual standard:** 3 true native 1080p 9:16 hero frames (wide/plaza, hero face/wardrobe, emotional doorway) from actual same renderer, consistent palette/head/hair proportions, soft deliberate light, deep world, clean negative-space framing, no HUD/proxy text or obvious intersecting meshes. Review at 390px; compare not just beauty but identity and silhouette.

**Gate C — Actual video:** an 8–15s native 1080p 30fps decoded MP4, plausible movement and cuts, actual source-frame proof, H.264/yuv420p, captions and voice optional for test. Motion sample must be representative of pipeline, not a screen recording or HTML preview. 720p native fallback only if full-resolution benchmark proves constrained; do not claim 1080 from upscale.

**Gate D — Independence:** generation/asset tools and renderer function from clean checkout with Higgsfield disconnected; no expired asset URLs or secrets; character/prop/scene APIs and a named production continuation task documented.

**Gate E — Episode readiness (later):** 117s Dice Town original narration exactly synchronized, no conspicuous storyboard proxies or unrelated replacement shots, captions correctly timed, quality checked on phone, deliverable video genuinely rendered at intended resolution. This is later than basic studio asset gates and is NOT automatically feasible inside trial.

## 7. Model assignments and cost discipline

| Job | Suggested model / effort | Why |
| --- | --- | --- |
| First high-leverage branch/architecture and visual gap audit | **Fable 5.2 / High** once | Deep repository reasoning; output concrete prioritized spec and tests, not unending ideation |
| Severe architecture blocker or cross-cutting refactor after Opus fails | **Fable 5.2 / High** only if evidence warrants | Don't make it default executor; use advisor role |
| Daily 3D implementation, lookdev camera, asset registry, per-shot motion | **Opus 5.5 / Medium** (or actual available equivalent) | Most code work is bounded, cheaper |
| Repetitive scripts, filename/manifest validation, packaging, FFmpeg steps | **Sonnet 5.5 / Low or Medium** when available | Less expensive; deterministic tests protect quality |
| Higgsfield MCP/3D | Small vetted lookdev AND optional true GLB/BLEND mesh/rig/scene export experiments if offered | Verify active tool access, credits, topology, animation compatibility, rights and offline permanence; don't assume all promo features are included |
| Independent final creative audit | **Fable 5.2 / Medium** one pass, or Opus | Critique actual frames and play-tested motion, not self-reported technical PASS |

Use a **two-pass execution discipline**: design one bounded task in 10–20 lines, execute it on a branch, inspect actual images/movie, run tests, then decide. Avoid agents repeatedly copying the full repo into context or running the whole test suite for every trivial edit. Use authoritative file paths, budgets and stop conditions. Record actual model/tool cost when available.

## 8. Short-form creative system that survives subscription expiration

- Production starts from a **hook / story lock / timed narration**. User likes ElevenLabs Adam at **1.25×**; lock the audio timing before shots. Duration target ≥90s for this channel, but retention is earned and not guaranteed by length.
- One script → shot list with *narration cue / story function / scene setup / action / character emotion / asset dependencies / framed crop / estimated cost*.
- Build by **camera-visible composition**; separate foreground/subject/background. Treat 2D principles as controlled cinematic techniques: held poses, silhouette, close inserts, pose-to-pose, staged fast action, digital camera movement across high-resolution stills, offscreen implications, staggered reusable loops, reaction cuts. Do not stretch 2 seconds of unique action into 20 seconds of obvious frozen video.
- A release edit must align each shot to its spoken narration. No stolen unrelated frame, giant schematic labels, floating-island edges, unresolved contact errors, or abrupt style changes. Native 1080p assets preferred over late 360p upscaling. Version a clean, caption-free 3D master; add captions, SFX, and licensed music separately.
- Sound mix: narrator clear, quiet scene SFX keyed to impacts/doors/gestures, optional original/cleared music. Burned captions with safe vertical position, deliberate word breaks and tested alignment. Publish only after phone playback test (Files/Photos/Safari as applicable), and keep a silent master.

## 9. What NOT to do

1. Do NOT recreate the whole repository or wipe existing working story/render source.
2. Do NOT claim Higgsfield image-to-video output is an editable, rigged 3D model. Test actual data types and download formats.
3. Do NOT build 20–50 beautiful but mismatched characters, large unused city maps, a generic agent framework or unnecessary Blender infrastructure.
4. Do NOT switch every source clip to generative video and lose identity/continuity/determinism.
5. Do NOT merge all PRs or overwrite `main` before auditing ancestry, tests, licenses and binary size.
6. Do NOT train/fine-tune a model on Higgsfield outputs contrary to its terms.
7. Do NOT treat more pixels, higher bitrates or larger files as evidence of better art.
8. Do NOT automatically renew a promotion; verify trial scope/cancel billing according to owner's choice.
9. Do NOT use Fable at highest effort for every read/test/boilerplate call.
10. Do NOT spend 72h making an asset library without at least one true native-HD end-to-end sequence and a Higgsfield-free rebuild test.

## 10. First message the owner should send Claude

> I am transferring my `NeatKnight18586/blox_story` production project to you. Read `BLOX_STORY_CLAUDE_PRODUCTION_HANDOFF.md` and inspect the actual repository, especially current PR #49 implementation and PR #50 documentation-only brief. Treat the handoff as context, not a license to blindly refactor. My goal is a durable, original Roblox-inspired 3D Shorts production studio using temporary 72h Higgsfield MCP access and limited Claude Fable 5.2; I need it to continue independently afterward on Opus and free tools. I have iPad-first constraints and no manual gameplay recording. Before any generation or coding, verify what Higgsfield and Fable actually provide to this account, any billing/renewal limits, current branch ancestry, the native render pipeline, and how far a 72-hour sprint can really go. Then return (1) a harsh feasibility verdict; (2) one recommended V2 approach that preserves proven code and tests; (3) a priority order for 3 reusable character presets, a small environment kit, 3 native 1080p visual gates and one 8–15s native production proof; (4) a numbered 72-hour execution queue with model/effort and no unfounded costs; and (5) the FIRST small action you can perform now. Do not generate bulk media, install paid services, merge branches or modify my private Adam narration without my explicit approval. After the first decision, proceed in small tested stages and provide real visual evidence.

## 11. Open questions Claude must verify before executing

- Is Higgsfield's **72-hour free MCP promotion** actually active on the user's account? Exact renewal time, subscription plan, included 3D/GLB/rigging tools and limits? Is there a cap or throttling despite “unlimited” wording? Is the promotional trial an exception to regular MCP credit charging? Download and keep authorized outputs before expiration.
- Is Fable 5.2 exposed under the user's selected Claude plan with enough allocation for a single architecture audit? Which Opus/Sonnet options are available at the time?
- Which latest Git branch contains PR #49's actual implementation, which contains PR #50's docs only, and how far are they from main? Is CI actually usable for native 1080p, and is Blender installed/available remotely? Can GLB be imported without changing the current renderer?
- Can the existing original avatar be made expressive enough through versioned appearance/accessories without redoing the core rig? Which existing validated camera and scene features should become V2 reusable modules?
- Where will the owner's private ElevenLabs Adam WAV and future audio assets be kept securely and reproducibly without uploading sensitive/private files to a public repo?
- How will raw image references be transformed into owned real 3D components, and which finished assets/rights are accessible after the 72-hour trial?

## 12. Useful verified sources (consult current versions)

- Claude Fable 5.2 announcement (Nov 9, 2026): https://www.anthropic.com/claude-fable-and-mythos-5-2
- Fable model specifications and pricing: https://platform.claude.com/docs/en/models/fable-5-2/overview
- Higgsfield MCP connector / feature list: https://higgsfield.ai/creator-hub/help-center/integrations/how-do-i-connect-higgsfield-to-ai-agent
- Higgsfield MCP landing: https://higgsfield.ai/mcp
- Higgsfield official Blender/real 3D asset/rig description: https://higgsfield.ai/blog/higgsfield-blender-plugin
- Higgsfield official editable 3D Jutsu GLB/BLEND outputs: https://higgsfield.ai/blog/higgsfield-3d-jutsu
- Additional Higgsfield MCP 3D model/rigging tool schemas (third-party): https://docs.scalekit.com/agentkit/connectors/higgsfieldmcp/
- Normal MCP credit rules (promotional exceptions require verification): https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp
- Higgsfield outputs/commercial terms: https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially
- glTF standard and source formats: https://www.khronos.org/gltf/
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Khronos glTF Validator: https://github.com/KhronosGroup/glTF-Validator
- Kenney CC0 Blocky Characters (candidate rejected as lead, may be kit-bashed for extras only after testing): https://kenney.nl/assets/blocky-characters

**Definition of success:** One original, coherent, code-rendered 3D look that can be used for many stories, documented and versioned assets that do not expire, tests and one native-quality real video proof—not simply a large folder of transient Higgsfield generations, a new “framework,” or a premature 4K upscale.