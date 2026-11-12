# blox_story v2 brief (rev. 5, final: council-reviewed, bench-tested, timed to the real voice)

**First paste (Session 1):** paste this whole file into Claude Code (Opus) at the root of `NeatKnight18586/blox_story`.
**Later sessions:** start a new session and send only the kickoff line listed in §12.

---

## 0. Session protocol (read this first, every session)

1. If `docs/V2_BRIEF.md` does not exist, save this message verbatim to that path and commit it. It is the single source of truth.
2. Each session does **one** session block from §12 and then stops. Never start the next block on your own.
3. At session start read only: §0–§3, your session block in §12, the sections that block names, and `PROGRESS.md`. Do not read the rest.
4. Before coding, write a plan of ≤ 15 lines under a new heading in `PROGRESS.md`. After finishing, append: what was built, commands to run it, measured numbers, decisions taken, open problems. Keep each session's entry ≤ 40 lines.
5. A block is finished only when every **Done when** check passes. Run the checks; do not assume.
6. If something is not covered, choose the cheaper option, record it under "Decisions" in `PROGRESS.md`, and continue. Stop and ask only if a Done-when check cannot be met after two different attempts.
7. Deliver review material by committing it to `review/<slug>/` on the branch and opening or updating the PR. The owner works from an iPad and can only see what is in the PR.

## 1. Mission and standing decisions

You are the technical director of a faceless YouTube channel making narrated "In this town / world / kingdom…" block-avatar story animations for a US general audience (teens first, safe for kids). Viewers should feel the story is happening **inside a block-building multiplayer game**.

The repo holds a working deterministic pipeline (vanilla Three.js 0.187, frames captured through Playwright, captions via FFmpeg/libass) and one pilot, `stories/names100`. You are turning it into a reusable episode engine and producing Episode 2, **"Nobody"** (§11).

Decisions already made by the owner. Implement, do not debate:
1. Finished videos run **2:02–2:50**. The voice is never stretched: if narration is shorter than that, the picture carries the difference with a held final shot (§9).
2. **No templates.** Every episode gets a new hand-composed world and a different story shape. Only the engine and low-level parts toolkit are reused.
3. **Game-authentic look**, classic block-avatar format (§6).
4. Token-efficient process: 3 review gates for this first episode, 1 gate per episode afterwards (§14), small reports.
5. **Narration is always third person** (a storyteller voice, never "I"/"me"). Characters may still speak short quoted lines.
6. **Every episode opens with an "open hit"** (§5.3) on its first frames only. It is subtle and very fast, and it is never repeated at later scene starts.

## 2. Ground rules

1. `AGENTS.md`, `STATUS.md` and the old `*_BRIEF.md` files describe a finished Codex phase. Their task limits (no camera movement, no environment library, no popping captions, no wardrobe, stop after S5) are **superseded**. Their engineering facts still hold.
2. **names100 is frozen.** Do not modify `stories/names100/**`, `production/render.js`, or the behaviour of existing modules. Extend avatar/appearance only through new opt-in options. `npm test` (node-only, ~1 min) must stay green. Do **not** run the legacy `test:*` browser suites.
3. **Never read `evidence/`** (754 files). Never open individual frame PNGs. Look at visuals only through contact sheets ≤ 1600 px on the long side.
4. No reverse-order pixel validation, SHA receipts, preservation manifests or cost reports. Determinism = one unit test sampling pure functions twice + a 10-frame re-render spot check.
5. Git: branch `claude/engine-v2`. Commit source, `cues.json`, the voice file, and `review/<slug>/` gate material only. Ignore `stories/*/build/`, `renders/`, model and font caches.
6. No new frameworks. Allowed packages are named in §3.
7. Tests only for new pure logic (camera sampler, parts helpers, caption generator, alignment DP).
8. **Brand rules:** never draw or show the Roblox logo or wordmark; never imply the videos are official. Design every hair, face, outfit and accessory ourselves (§6.0). Maintain `PUBLISHING.md` (§13).

## 3. Verified environment facts (tested on a 2-core cloud session on 2026-11-12; do not rediscover)

Write `scripts/v2/preflight.js` (`npm run v2:preflight`) that re-checks these in ~10 s and prints one JSON object, because a local machine may differ.

| Fact | Consequence |
|---|---|
| `npx playwright install chromium` **fails** (CDN blocked). `/usr/bin/google-chrome` (Chrome for Testing) exists. | `scripts/v2/browser.js` resolves the browser in this order: `$BLOX_CHROME` → `google-chrome`/`chromium` on PATH → Playwright's bundled one. Launch with `executablePath`, args `--no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader`. Confirmed working. |
| `huggingface.co`, `api.elevenlabs.io`, `fonts.gstatic.com` **blocked**. npm, PyPI, `github.com` release assets and `raw.githubusercontent.com` **reachable**. | No faster-whisper / openai-whisper. Use the alignment route in §8. Fonts come from npm (§9). |
| Rendering is CPU-only (SwiftShader). Measured at 720×1280 with one 2048 sun shadow: **48k triangles ≈ 0.33 s/frame (Phong) / 0.41 (Standard); 84k ≈ 0.86 s; 400k ≈ 3.7 s.** 540×960 ≈ 0.23 s, 270×480 ≈ 0.12 s at 48k. Rounded-box geometry with 4 segments is ~970 triangles per block. PNG encoding cost is negligible. | A 2:15 episode is ~4,050 frames. The budgets in §5.4 are hard limits, not suggestions. |
| FFmpeg 6.1 with libass, `gblur`, `blend` present. A 1080×1920 pass with bloom + grade + ASS burn runs ≈ 11 fps. | Do all bloom/grade/caption work in FFmpeg, never in WebGL (§9). |
| `pip install --break-system-packages sherpa-onnx soundfile numpy` works. | §8. |

## 4. Target layout

```
docs/V2_BRIEF.md   PROGRESS.md   CLAUDE.md (≤ 50 lines: rules §0+§2, commands, folder map)
engine/        episode.html  episode.js  camera.js  actors.js  poses.js  effects.js  overhead.js  look.js
avatar-style/  hair.js  clothing.js  accessories.js  tools.js  faces2.js
parts/         parts.js  materials.js  build.js  ambient.js  props.js
captions/pop-shorts-v2.json
scripts/v2/    preflight.js  browser.js  bench.js  align.py  plan.js  render.js  captions.py  assemble.py  sheet.py
stories/<slug>/  script.txt  voice.flac  cues.json  episode.json  world.js   (build/ ignored)
.github/workflows/render.yml     .claude/commands/new-episode.md     STORY_BACKLOG.md
review/<slug>/   gate sheets and videos for the owner
STORY_BIBLE.md  SERIES_LOG.md  CAPTION_STYLE_V2.md  PUBLISHING.md
```
npm scripts: `v2:preflight`, `v2:test`, `v2:bench`, `v2:stills`, `v2:align`, `v2:plan`, `v2:animatic`, `v2:final`; each takes `--story <slug>` where relevant.

## 5. Engine

### 5.1 Renderer
`engine/episode.js` is story-agnostic: cast, shots, cameras, actions, faces, effects, overhead tags and time of day arrive as data in `episode.json`; the world arrives as the episode's `world.js` exporting `build(scene, kit) -> {anchors, update(frame)}`. `renderFrame(n)` is a pure function of `n` (no clock, no rAF, seeded randomness only). It must also return `renderer.info.render.triangles` and `calls` so the bench can enforce budgets.

### 5.2 Camera
`engine/camera.js` exports `sampleCamera(shot, localT, actorPositions) -> {position, target, fov}`.
```json
{"move":"push","from":{"position":[0,5,14],"target":[0,4,0],"fov":50},
 "to":{"position":[0,5,11],"target":[0,4,0],"fov":46},"ease":"inOutCubic","follow":"hero","drift":0.15}
```
**Opening only:** the single `openHit` in §5.3 is the only automatic jolt. Ordinary cuts get no kick or shake; shake elsewhere appears only where a story beat calls for it (§11.2).

Moves: `push`, `pull`, `orbit`, `track` (follows an actor at a fixed offset), `crane`, `whip` (4–6 frame eased swing bridging two shots), `gamecam` (third-person, behind and above the hero, FOV 65–70, as if a player were controlling them; 2–4 uses per episode), `static-drift`. `drift` = small seeded low-frequency sway.

`scripts/v2/plan.js` validates `episode.json` against `cues.json`. **Errors (exit 1):**
- a shot with no camera motion at all;
- shot shorter than 1.2 s or longer than 5.0 s;
- a cut more than 2 frames away from a phrase onset;
- two consecutive shots with the same shot-size tag (`wide`/`medium`/`close`/`insert`);
- no `wide` shot in the first 6 s or after a location change;
- camera target speed above 35 % of frame width per second outside a `whip`;
- a named subject's projected head outside x 15–85 % or y 18–58 % of frame at the shot midpoint.

**Warnings:** episode average shot length outside 2.2–3.0 s; a noun in the `see` list of a phrase not centred within 6 frames; no foreground element tag on a wide shot.
Defaults: a shot with no move specified gets a 4–7 % push. Establishing shots: FOV 50–60, camera 8–14 units high, tilted down 15–25°, landmark in background. Character shots: eye level, FOV 35–45. Caption band is y 60–72 %; bottom 20 % and right 12 % are platform UI.

### 5.3 Effects (the whole budget)
`fadeColor`, `ghost`, `glow` (emissive pulse), `particles` (seeded instanced quads: sparkle, dust, embers, confetti, fire, stars), `melt` (scale-Y squash + emissive ramp), `squash` (cartoon impact), `shake`, `flash`, `timeOfDay` (lerp between look presets), `openHit`.

**`openHit`** (frames 0–8 of the episode only; `plan.js` errors if it starts after frame 0 or appears twice). This is the "punch-in + micro-shake" opener editors use so the first frame already feels in motion. All of it is computed inside `sampleCamera`, so it is deterministic:
- **Punch-in:** FOV starts 7 % narrower than the shot's FOV and eases out to it over 8 frames (`easeOutCubic`).
- **Micro-shake:** a seeded, damped offset on camera position and target. Start amplitude 0.05 units, about 18 Hz, decaying as `e^(-14t)`, plus a 0.5° roll that decays the same way. It must be gone by frame 8.
- The hook caption pops in on frame 0 at the same moment (§9).
- **Optional sound:** if `stories/<slug>/sfx/open.wav` exists (royalty-free, owned), `assemble.py` mixes it at frame 0 at −14 dB under the voice. If no file exists, skip it.
- **Tuning check:** on a 30 fps sheet of frames 0–12, the motion must be visible but the subject must never leave the frame or blur. If it looks like an earthquake, halve the amplitude.

### 5.4 Performance budget (hard, from the measurements in §3)
- **≤ 50,000 triangles inside the camera frustum in any shot.** The whole world may hold more only if it is split into district chunks that frustum-cull (one merged mesh per district per material, never one mesh for the whole town).
- Materials: `MeshPhongMaterial` everywhere (cheaper than Standard and gives the plastic highlight). No `MeshStandardMaterial` in v2.
- Avatars: hero and speaking cast use rounded blocks with **2 segments**; background characters use plain `BoxGeometry` (12 triangles per part) and simplified hair. Never 4-segment rounded boxes.
- World blocks: plain boxes and wedges; bevels only on hero-tier props.
- Shadows: sun only, one 2048 map fitted to the shot region. Only actors and hero-tier objects cast; mid and far tiers receive but do not cast.
- ≤ 4 real point lights; all other lights are emissive fakes.
- Antialias on for finals, off for animatics.
- `npm run v2:bench -- --story <slug>` renders 8 frames at every anchor's establishing camera and prints triangles, calls and s/frame. **Pass = every shot ≤ 50k triangles and the mean ≤ 0.45 s/frame at 720×1280.** If it fails, cut geometry first; only if that fails twice, render 540×960.
- Output: render 720×1280 @ 30 fps, upscale to 1080×1920 (Lanczos) in FFmpeg. Animatic: 270×480 @ 15 fps.
- Rendering runs as a background job writing `build/progress.json`, with a per-shot frame cache keyed on a hash of that shot's data + engine files, so one fixed shot never re-renders the episode. Use two browser pages only if the bench shows it is faster.

## 6. Game-authentic avatars

### 6.0 What we follow and what we design ourselves
Roblox's published creator guidance allows videos and animations that use the classic blocky avatars on social media, including monetised ones, so **follow the classic six-part block-avatar format closely**. We still author every asset ourselves: this environment has no access to game asset files, catalogue items belong to their individual creators, and the logo is off-limits in videos and thumbnails. So: same *format* and *style conventions*, our own hair, faces, outfits and accessories.

### 6.1 Body: already correct, do not change it
`avatar/baseAvatar.js` already has the classic proportions (torso 2×2×1, limbs ≈1×2×1, head ≈1.25 wide, flush joints). The likeness gap is **not** the body. It is, in order of impact: (1) dull matte material and muddy colours, (2) flat slab hair, (3) no clothing detail, (4) thin faces, (5) nothing "game" on screen (tags, tools, game camera), (6) bare flat-grey world. Fix those.

Add `style:'v2'` as an opt-in: Phong plastic (`shininess ≈ 35`, low grey specular), 2-segment bevels ≤ 0.03, saturated toy palette. Skin tones are flat bright colours.

### 6.2 Faces (`avatar-style/faces2.js`)
Flat 2D drawings on the head front using the existing cached-canvas approach, at 256 px, with strokes ~1.6× thicker than the current ones so they read at 160 px avatar height. Our own designs in the simple classic-decal style: two solid eyes, one mouth, optional brows. Set: `smile`, `neutral`, `determined`, `terrified`, `smug`, `sad`, `crying` (two blue tear strips), `shout`, `gasp`, `sleep`.

### 6.3 Hair (`avatar-style/hair.js`)
Game hair is one rigid, chunky, low-poly accessory that sits on the head like a helmet and never moves. Build each style as one merged, **flat-shaded** mesh on the head pivot:
- a **cap shell**: a copy of the head lathe scaled ~1.06, cut at a hairline that leaves the face open;
- plus **chunks** with visible facets: wedge bangs (3–5 staggered wedges, not one slab), side locks, back slab with a stepped bottom edge, spikes, ponytail blocks, buns, cube-stack braids;
- one base colour with a darker underside and a lighter top via vertex colours.
Budget: hero ≤ 300 triangles, background ≤ 60. Ship 10 presets (short messy, side-swept, spiky, bowl, long straight, ponytail, twin buns, braids, curly blocks, bald), any colour. Hair never covers the eyes from the front.

### 6.4 Clothing, accessories, tools
- **Clothing is paint.** `clothing.js` draws small canvas textures per block face (128 px): collar, buttons, belt and buckle, tunic hem, stripes, pocket, sleeve cuffs, a boot band at the bottom of legs, simple shading line under the collar. Recipes: `tunic`, `armor`, `robe`, `apron`, `royal`, `peasant`.
- **Accessories:** rigid low-poly meshes: crown, knight helmet, hood, straw hat, scarf, cape slab, backpack.
- **Tools:** gripped in the right hand with the arm raised straight forward 90° (`toolHold`). Needed now: sword, stone-hammer, torch, bread loaf.

### 6.5 Animation (`engine/poses.js`)
Rigid blocks swinging from shoulders and hips, slightly stiff and bouncy. That stiffness is the style; do not smooth it away. Keep `idle`, `look_react`, `walk` (`gait:'readable'`). Add `run`, `jump` (arms up), `fall`, `climb`, `toolHold`, `toolSwing`, `pull` (leaning back, both arms forward, 2-frame strain shake), `point`, `cheer`, `recoil`, `trip`, `sit`, `sleep`, `wave`. Any two blend with a 0.15–0.2 s cross-fade of pivot rotations. No contact solver. Background characters get seeded idle offsets, head turns and the occasional jump.

### 6.6 In-game overlays (`engine/overhead.js`)
Camera-facing canvas sprites of our own design: **name tag** (bold white, dark outline, optional small role line) over every named character, popping when it changes; **stat** variants (number, bar, icon tile); **chat bubble** (white rounded rectangle with tail, ≤ 4 words) for the few lines characters say. At most one small HUD element per episode, outside the caption band and UI zones.

## 7. Worlds: bespoke per episode, built like a skilled game builder would

### 7.1 Rule
No town generator and no shared layouts or hero buildings. Each episode has its own `stories/<slug>/world.js`. Do not open a previous episode's `world.js` while writing a new one.

### 7.2 Toolkit (`parts/`), theme-neutral
- `parts.js`: `block`, `wedge`, `cylinder`, `cone`, `sphere`, `arch`, `truss`, `stairs(n)`, `gableRoof(w,d,h)`, `plate`; options: colour, material name, `neon`.
- `materials.js`: a small set of **procedural tiling canvas textures we draw ourselves** (128 px, `RepeatWrapping`, world-space UV scale so the pattern size stays constant): `plastic` (none), `studs`, `grass`, `brick`, `woodPlanks`, `cobble`, `slate`, `sand`, `thatch`, `water`, `glass`, `neon`. Subtle contrast; these are what stop a build looking like untextured grey boxes.
- `build.js`: `row`, `grid`, `ringOf`, `along(curve)`, `scatter(area, seed, density, avoid)`, `stack`, `mirror`, `instance(list)` (→ `InstancedMesh`), `mergeByDistrict(group, cellSize)`, `anchor(name, position, facing)`.
- `ambient.js`: `flag`, `smoke`, `birds`, `flame`, `spinner`, `walkers(path, count, seed)`, `floaters`; pure functions of frame.
- `engine/look.js`: presets `day`, `goldenHour`, `night`, `storm`, overridable per episode: gradient sky dome, block clouds, horizon-matched fog for depth haze, ambient colour matched to the sky. Night keeps blue ambient ≥ 0.9 with a rim light on characters.

### 7.3 Builder's craft rules (apply to every hero-tier build)
1. **Scale to the avatar** (≈ 5.2 units tall): doors 4 wide × 7 high; storey height 10–11; window sills at 3.5; streets 12–16 wide; steps 0.5 high; walls 1 thick.
2. **No flat walls.** Every wall face larger than 8×8 gets at least two depth layers: plinth, corner posts or beams, window and door frames, sill, lintel, eave overhang ≥ 0.6.
3. **Colour 60/30/10:** one dominant, one secondary, one accent per building; ≤ 5 hues per episode plus one story accent reserved for the hero or key object.
4. **Break the grid:** vary heights and roof pitches; rotate props 5–15°; never two identical neighbours.
5. **Clutter in clusters of three** (barrel + crate + sack), placed against walls and corners, never evenly spread.
6. **Ground is never one colour:** path, verge, patches, edge stones.
7. **Three depth planes** in every establishing view: foreground element, subject, landmark through haze.
8. **Light it like a showcase:** warm key, cool fill, visible shadows, a little haze. Keep bloom and saturation subtle; overdoing them is the classic mistake.

### 7.4 Composing a world cheaply
1. Start `world.js` with ≤ 25 comment lines: the locations the script needs, one unique landmark, ground plan in words, palette, one borrowed real-world *principle*.
2. Define 6–10 local prefab functions for this episode only, each seeded so repeats vary.
3. Place with helpers, not hand-typed coordinate lists.
4. Detail tiers: **hero** (≤ 15 units from an anchor a shot uses): craft rules + props; **mid**: shape, roof, window recesses; **far**: flat silhouettes, no shadows.
5. Budgets: `world.js` ≤ 450 lines; §5.4 limits; world 140–200 units across.
6. Every wide shot has ≥ 3 ambient movers. Shots reference named anchors only.

## 8. Audio alignment (`scripts/v2/align.py`)

The owner commits `stories/<slug>/voice.flac` (ElevenLabs export, lossless so sample timing is exact; `.wav` and `.mp3` are also accepted). It is the master clock: never stretch, trim or re-synthesize. `script.txt` is the truth for words.

1. `ffmpeg` → 16 kHz mono WAV in `build/`.
2. **Phrase onsets:** `silencedetect=noise=-35dB:d=0.18`. These are accurate and are the authority for cuts.
3. **Word order and rough times:** `sherpa-onnx` offline transducer with `sherpa-onnx-zipformer-small-en-2023-06-26` (112 MB, from `github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/…tar.bz2`, cached in `~/.cache/blox/`). Use `OfflineRecognizer.from_transducer(tokens, encoder, decoder, joiner)`, read `result.tokens` and `result.timestamps`, join tokens into words on the `▁` marker.
4. **Map to the script** with Needleman–Wunsch on normalised words; recogniser mistakes are expected and harmless (tested: 127/127 script words mapped despite 11 recognition errors; 50 s of audio in 2.4 s). Interpolate any unmatched word between neighbours.
5. Raw word times are only good to about ±0.1 s, so: snap the first word of each phrase to its silence onset, keep words monotonic, set each word's end to the next word's start or the phrase's silence start.
6. If `ELEVENLABS_API_KEY` is set **and** preflight shows `api.elevenlabs.io` reachable, use `POST /v1/forced-alignment` (form fields `file`, `text`) instead of steps 3–5.
7. Write `cues.json`: `{story, audio, duration, method, lines:[{line, text, start, end, words:[{w,start,end}]}]}`, one entry per script line. Print the duration; if it is < 100 s or > 168 s, stop and tell the owner.
8. **Reference test:** `stories/nobody/cues.json` is supplied by the owner and was produced by exactly this method on the real voice. Running `align.py` on `nobody` must reproduce every line start within 0.15 s of it. Do not overwrite the supplied file; write to `build/` and compare.

## 9. Captions and finishing

**Captions** (`captions.py`, style in `captions/pop-shorts-v2.json`, doc `CAPTION_STYLE_V2.md`; v1 untouched). ASS at PlayRes 1080×1920, burned with `ass=<file>:fontsdir=<dir>`.
- Font **Lilita One**: `npm i -D @expo-google-fonts/lilita-one`, use `400Regular/LilitaOne_400Regular.ttf` (a real TTF; fontconfig family name "Lilita One"). Size 96, white, outline 7 `&H00101010`, shadow 3, sentence case.
- Chunks of 1–3 words from `cues.json`; start each chunk 40 ms before its first word, never earlier than the phrase onset; blank in pauses > 0.35 s.
- Pop-in, tested working: `{\an5\pos(540,1267)\fscx82\fscy82\t(0,80,\fscx108\fscy108)\t(80,130,\fscx100\fscy100)}`.
- Emphasis words (from `episode.json.emphasis`): accent `{\c&H4AD8FF&}` (#FFD84A) and 15 % larger; max one per chunk; two colours total.
- Position constant within a shot; move to y ≈ 580 only when `plan.js` reports a face or key object under the band. Opening phrase on screen from frame 0 at size 112.
- No emoji, per-letter effects or rainbow karaoke.

**Finishing** (`assemble.py`): frames → scale 1080×1920 Lanczos → subtle bloom + grade → captions → mux voice, loudness-normalised to −14 LUFS with true peak ≤ −1 dB (+ optional `music.mp3` at −20 dB under voice, + optional `sfx.json`). The voice starts at frame 0. After the last word, hold the final shot (still moving, captions off) so the video ends at `max(voice + 2.5 s, 122.5 s)`. Starting grade, tested: `split[a][b];[b]gblur=sigma=24,eq=brightness=-0.25:contrast=1.6[bl];[a][bl]blend=all_mode=screen:all_opacity=0.2,eq=saturation=1.15:contrast=1.04,vignette=PI/8`. H.264 High, yuv420p, CRF 18, AAC 192k, `+faststart`; keep the final ≤ 60 MB.

**`sheet.py`**: contact sheets at 1 frame per second (≤ 60 cells per sheet), and `--stats` printing mean luma and saturation per cell.

## 10. Story bible, series log, council

Write `STORY_BIBLE.md` (≤ 120 lines) and `SERIES_LOG.md`. Apply inline in one pass, no subagents, whenever a new script arrives.

**Principles (not a template; shape must vary between episodes):** the rule is one sentence that makes an ordinary thing impossible, dangerous or counted, and frame 0 shows it; the rule is visible like a game mechanic; a young protagonist is the worst-placed person for it because of one flaw, and that flaw saves everyone; the twist is fair (a loophole in the exact wording, or a truth adults missed) and re-watching shows the clue; the ending lands warm even when it costs something, and the last line reframes the first.

**Pacing for 2:02–2:50:** 400–520 words (the owner's chosen voice reads about 200 words/min: 405 words ran 1:59.7); sentences ≤ 12 words; ~5th-grade vocabulary; American English. A new question or mini-payoff every 20–25 s; four movements of ~30 s each ending on a turn; one laugh in the first 30 s and one in the last 30 s; a second smaller surprise after the main twist; understandable with sound off. Family-safe: no gore, no on-screen death, no weapons used on people, no romance, no real brands.

**Originality:** reject rules already used in the niche (battery percentage, no frowning, never step on the ground, giant mouth, never go outside, luck number, Simon says, five-second floor, hide from the Seeker, crying turns you into your pet, photo day). Borrow the engine of a famous story, never its characters, names, imagery or beats. `SERIES_LOG.md` has one row per episode: setting, rule type, hook form, twist type, ending type, palette, landmark, ground plan. A new episode must differ from the previous three in ≥ 5 of 8 columns and never repeat a landmark or ground plan.

**Council scorecard** (1–5, one line each; all ≥ 4 to proceed, else list exact line edits and stop; one revision round): Screenwriter (one-sentence rule, fair twist, flaw saves the day) · Director (every sentence showable with our kit; new image every 3 s) · 12-year-old US viewer (clear without context; shareable; nothing boring or babyish) · Originality & safety · **Retention mentor, chair** (frame 0 works muted; open question at 3, 20, 45, 70, 95 s; no dead stretch > 4 s; ending loops).

**Animatic checklist** (on the 1-fps sheets): frame 0 shows the rule as text and image; no two adjacent cells alike; hero or key object findable in under a second in every cell; the twist cell is the biggest visual change; the final cell rhymes with frame 0.

## 11. Episode 2: "Nobody" (slug `nobody`)

### 11.1 Script: save exactly as `stories/nobody/script.txt` (approved, third-person narration; do not rewrite)
```
In this kingdom, you're nobody until you pull your sword from your stone.
This boy is twelve. His name tag still says Nobody.

The day you're born, a stone rises in the Field of Stones. Your sword is stuck inside it.
Pull it out, and a name appears above your head. Baker. Knight. Even King.
Most kids do it by seven.
His little sister did it at four. With one hand. While eating bread.

The boy tried every single morning. Over two thousand tries. The sword never moved an inch.
The other kids made it a game. "Hey Nobody, need a hand?"
He never answered. He just came back the next day.
He wasn't strong. He wasn't special. He was just too stubborn to stop.

And here's the law. If you're still Nobody at thirteen, you leave the kingdom forever.
He had one day left.

Nobodies can't sleep inside the walls. So every night, he slept in the field, next to his stone.
Every morning, he pulled again. The sword stayed stuck.
But the dirt around his stone kept cracking. He thought it was just the cold.

That last night, the sky turned orange.
A dragon landed on the castle wall. Up close, it was bigger than the church.
The knights charged. Their swords melted like candles.
The king's sword melted too.
Everyone ran. His sister tripped in the square. The dragon turned toward her.

The boy didn't have a sword. He only had a stone.
So he ran to it, grabbed the handle, and pulled harder than he ever had.
The sword didn't come out.
The whole stone did.

He stood there holding it. A handle. A giant block of rock on the end.
And he finally understood.
It was never a sword in a stone.
It was a hammer.

The dragon's fire hit the stone and split in two. Stone doesn't melt.
He stepped in front of his sister. He swung once.
Bonk. Right on the nose.
The dragon blinked, whimpered, and flew away crying.
The whole kingdom went silent. Then his sister yelled, "That's my brother!"

The next morning, the king offered him any name he wanted. Dragonbreaker. Sir Hammer. Anything.
The boy looked up at his tag. It still said Nobody.
He kept it.

In this kingdom, you're nobody until you pull your sword from your stone.
He never did.
And now every kid in the kingdom wants to be Nobody.
```
**Timing (measured on the committed voice, 119.72 s, voice starts at 0.00 s; full word times are in `cues.json`):** hook lines 1–2 end 6.7 s · sister gag 18.5–21.7 · taunt 27.5–30.3 · the law 37.1–41.4 · "one day left" 42.0–43.1 · sleeping in the field 43.4–48.1 · cracking dirt 51.9–55.2 · sky turns orange 55.7 · dragon lands 58.0 · swords melt 62.2–66.4 · sister trips 66.7–70.3 · he pulls 73.0–76.3 · "The whole stone did." 77.85–78.8 · "It was a hammer." 86.3–87.0 · fire splits 87.3 · "Bonk." 93.7 · dragon flees 95.4–97.9 · "That's my brother!" ≈ 100.5–101.8 · king's offer 102.2–107.4 · "He kept it." 111.15 · closing lines 112.1–119.5 · held final shot to 122.5 s.

Emphasis: nobody/Nobody, sword, stone, four, bread, two thousand, thirteen, one day, cracking, orange, dragon, melted, whole stone, hammer, Bonk, crying, brother, kept.

### 11.2 Visual musts
- **Frame 0:** bright day, low wide of the Field of Stones: dozens of stones with sword hilts, kids pulling swords free with sparkles and tags popping on ("Baker", "Knight"), and centre frame the hero straining at his, tag **Nobody**. Moving from the first frame, starting with the `openHit` (§5.3).
- **Planted clue** (lines 14–15, 48.7–55.2 s): three morning inserts of the cracked earth at his stone's base, each wider. No other emphasis.
- **Sister gag:** tiny kid, one hand, loaf in the other, tag pops "Pip", `smug`.
- **Twist** (lines 22–28, 73.0–87.0 s; stone rips free at 77.85 s, "hammer" lands at 86.3 s): biggest visual change of the episode: night with orange firelight, low angle, `shake`, dust, the stone rips free, `flash`, then a slow orbit of him holding the hammer (sword hilt and blade sunk in a boulder block; scale it boldly).
- **Bonk:** cartoon, not violent: `squash` on the nose, star particles, dragon `crying` as it flies off.
- **Final shot** rhymes with frame 0: same low wide by day; kids' tags flip to "Nobody" and they try to lift their whole stones.
- `gamecam` for his walk to the stone and the run through the square.

### 11.3 Cast
Hero "Nobody" (12; short messy hair; patched `peasant` outfit; accent-colour scarf so he is always findable). Pip (0.6 scale; twin buns; bread). The King (crown, `royal`, melting sword). Three knights (helmets, `armor`). Four taunting kids (four different hair presets, job tags). 8–12 background townsfolk. The dragon, built from parts in the same blocky style (box body, flapping wedge wings, block-chain neck and tail, neon eyes), church-sized, ≤ 4,000 triangles, able to look scared and cry.

### 11.4 World
A walled hill kingdom seen from the field outside it. Locations: the **Field of Stones** on a gentle slope outside the wall (≈ 80 stones in loose rings; this episode's unique landmark); **gate** and curtain wall with towers; curved **main street** to the **market square** with well, stalls and a chapel whose tower the dragon dwarfs; the **castle** on the hilltop with the wall the dragon lands on. Principle: stacked hill-town silhouette so the castle is visible from the field and the square. Palette: warm timber and cream, cool grey-blue stone, meadow green, sky blue; accent on the scarf and the hammer glow. Times: day, golden hour, night with orange fire sky, clear morning.

## 12. Sessions

**Session 1: Foundations** (read §4, §5). Kickoff: *this file.* The owner has already committed `stories/nobody/voice.flac` and `stories/nobody/cues.json`; if either is missing, say so in your report and continue.
Build: `docs/V2_BRIEF.md`, `CLAUDE.md`, `PROGRESS.md`, `.gitignore` entries, folder skeleton, `preflight.js`, `browser.js`, `engine/camera.js` + tests, minimal `engine/episode.js` (one legacy avatar on a ground plate), `scripts/v2/render.js`, `sheet.py`, `bench.js`, `stories/nobody/script.txt`.
Done when: `npm test` passes · `npm run v2:test` passes (camera: every move, easing, determinism, speed cap, `openHit` offset is exactly zero from frame 8 onward and absent on every later shot) · `npm run v2:preflight` prints valid JSON · a 3-second, 8-move test clip renders through system Chrome and its 1-fps sheet shows visibly different framings (look at the sheet) · PR opened.

**Session 2: Avatars** (read §6, §11.3). Kickoff: `Read docs/V2_BRIEF.md §0–3 and PROGRESS.md, then do Session 2.`
Build: `avatar-style/*`, `engine/poses.js`, `engine/overhead.js`, `engine/actors.js`.
Done when: tests pass · `review/nobody/avatar-sheet.png` exists showing the §11.3 cast front and three-quarter, six hero expressions, four hair presets, `toolHold` with sword and hammer, mid-`run`, `pull` · you have scored the sheet against this rubric and fixed failures (max 3 passes), recording the final scores in `PROGRESS.md`:
1. six-block silhouette with flush joints reads at 160 px height; 2. expression identifiable at 160 px; 3. hair is a faceted chunky shell, not a slab, eyes uncovered; 4. clothing paint visible and different per character; 5. a plastic highlight is visible and no surface is grey or muddy; 6. hero found by accent colour among six characters in under a second; 7. name tag legible at phone size; 8. tool-hold reads clearly.

**Session 3: World** (read §7, §11.2, §11.4). Kickoff: `Read docs/V2_BRIEF.md §0–3 and PROGRESS.md, then do Session 3.`
Build: `parts/*`, `engine/look.js`, `stories/nobody/world.js`.
Done when: `npm run v2:bench -- --story nobody` passes §5.4 · `review/nobody/world-sheet.png` has six 720×1280 stills (whole world high wide, day; Field of Stones; market square; gate from outside at golden hour; square at night with orange sky; hero close-up with tag) · rubric scored and fixed (max 3 passes): 1. landmark visible in ≥ 4 stills; 2. no untrimmed flat wall > 8×8 in hero tier; 3. three depth planes in each wide; 4. ≤ 5 hues + accent; 5. doors ≈ 1.35× avatar height; 6. `sheet.py --stats`: day cells mean luma ≥ 110/255, night ≥ 60, mean saturation ≥ 0.30; 7. ≥ 3 ambient movers per wide (list them); 8. reads as a place built from parts, with visible material variety.
**→ GATE A. Stop for the owner's review of both sheets.**

**Session 4: Captions, effects, demo** (read §5.3, §9). Kickoff: `Read docs/V2_BRIEF.md §0–3 and PROGRESS.md, apply the owner's Gate A notes below, then do Session 4. Notes: …`
Build: `engine/effects.js`, `captions.py`, `assemble.py`, caption style files, `PUBLISHING.md`, `STORY_BIBLE.md`, `SERIES_LOG.md`.
Done when: tests pass (chunking, timing lead, emphasis, ASS escaping) · `review/nobody/demo.mp4`: 12 s, 1080×1920, with the real voice (0–12 s), inside the real world, using every camera move once and opening with `openHit`, with pop captions from the real `cues.json` and the grade applied · its sheet reviewed, plus a 30 fps sheet of frames 0–12 checked against the `openHit` tuning check.
Use the real voice and `cues.json` (first 12 s) for the demo. No stop here unless a check fails.

**Session 5: Animatic** (read §8, §10, §11). Kickoff: `Read docs/V2_BRIEF.md §0–3 and PROGRESS.md, then do Session 5.`
Build: `align.py` → `cues.json`; `episode.json` (one shot per phrase or clause, each with `size`, `see`, `why`); animatic.
Done when: alignment test passes · reference test in §8.8 passes · `npm run v2:plan -- --story nobody` exits 0 · `review/nobody/animatic.mp4` (270×480 → 540×960, voice + captions, ≤ 10 MB) · the §10 animatic checklist is run on the sheets and recorded.
**→ GATE B. Stop.**

**Session 6: Final + production speed** (read §14) Kickoff: `Read docs/V2_BRIEF.md §0–3 and PROGRESS.md, apply the owner's Gate B notes below, then do Session 6. Notes: …`
Done when: `plan` and `bench` pass · `review/nobody/final.mp4` is 1080×1920, 30 fps, 122–170 s, audio present at −14 LUFS ± 1, ≤ 60 MB (verify with `ffprobe`) · a 10-frame re-render spot check matches · final 1-fps sheets reviewed for caption/face collisions · `SERIES_LOG.md` row added · render time recorded.
Then build §14 items 2, 3 and 5 (`render.yml`, `parts/props.js` seeded from this episode's props, `/new-episode` command). Done when: the workflow file passes `actionlint` or a YAML parse, and the command file exists. The first farm run happens on Episode 3.
**→ GATE C. Stop.**

## 13. `PUBLISHING.md` (create in Session 4)
- Description line for every upload and for the channel About page: "Original fan-made animation. Not affiliated with, sponsored or endorsed by Roblox Corporation."
- Never use the Roblox logo in videos or thumbnails.
- Audience setting: choose it honestly per YouTube's rules; the content is written for a general teen-and-up audience and kept family-safe.
- Music: only royalty-free tracks you have rights to; none from the Shorts music library on videos over 60 s.
- Voice: confirm the ElevenLabs plan in use permits commercial use.
- Per upload: title = the rule in ≤ 60 characters; first frame = the rule shown; one question in the pinned comment.

## 14. Production speed (build in Session 6; this is how later episodes ship fast without lowering quality)

The slow parts of an episode are world building, rendering, and review round-trips. Speed comes from locking decisions early, a growing reusable library of *small* things, and a render farm. It never comes from reusing worlds or story shapes.

1. **Lock picture before final pixels.** Shot timing, cameras and acting are approved on the cheap animatic; the final render is a mechanical step with no creative changes. Notes after Gate B that change a shot re-render only that shot (per-shot cache, §5.4).
2. **Render farm on GitHub Actions** (`.github/workflows/render.yml`). Trigger: `workflow_dispatch` (inputs `story`, `preset`) and any push that changes `stories/*/render.request`. Jobs: `plan` (validate, split shots into 6 balanced shards by frame count) → `render` (matrix of 6: `npm ci`, `npx playwright install --with-deps chromium`, render the shard's shots, encode a near-lossless segment `-crf 10`, upload artifact) → `assemble` (download segments, concat, run `assemble.py`, `ffprobe` checks, upload `final.mp4` as an artifact **and** attach it to a prerelease named `<story>-<short sha>` so the owner can download it on an iPad). `browser.js` already falls back to Playwright's bundled browser there. Keep the local render path as the fallback. This workflow is untested until its first run: on first use, compare 10 frames against a local render and record wall-clock time in `PROGRESS.md`.
3. **A small-props library** (`parts/props.js`): barrel, crate, sack, lantern, torch, bench, fence, cart, sign, tree ×3, bush, rock ×3, cloud, banner. Generic clutter is not what makes a world distinct, so it is shared and grows each episode. Buildings, landmarks, layouts and palettes stay bespoke (§7.1).
4. **Libraries that compound:** every new hair preset, clothing recipe, accessory, tool, pose, effect and material added for an episode goes into the shared modules with a one-line entry in `CLAUDE.md`, so each episode starts with more than the last.
5. **Two sessions per episode from Episode 3 on**, driven by `.claude/commands/new-episode.md` (write it in Session 6). The owner commits `script.txt` + `voice.flac`, then runs `/new-episode <slug>`:
   - **Session E1:** align → council scorecard → `SERIES_LOG` difference check → `world.js` + cast (self-scored with the §12 rubrics, max 3 passes, no owner gate) → `episode.json` → `plan` + `bench` pass → animatic to `review/<slug>/`. **One owner gate.**
   - **Session E2:** apply notes → trigger the render farm → verify → final to `review/<slug>/` and the release.
6. **Automated QC replaces manual looking:** `plan.js` errors, `bench` budgets, `sheet.py --stats` thresholds, `ffprobe` checks and the rubrics must all pass before anything reaches the owner, so the owner's review is about story and feel only.
7. **Script backlog** (`STORY_BACKLOG.md`): keep council-approved scripts queued ahead of production so voice recording and building never wait on writing. Scripts are written with the owner outside Claude Code; this file only stores them with their scorecards.
8. Record per-episode times (build, render, total) in `PROGRESS.md` and name the slowest step each time; fix that step next.
