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

## Amendment A1 (2026-11-12): stability and detail

Read `docs/V2_BRIEF.md` §0–3, `PROGRESS.md` and `CLAUDE.md`, then do **Session 4.5: Stability and detail pass** below. It is an owner-ordered amendment that runs between Session 4 and Session 5. All §0 and §2 rules apply: plan first in `PROGRESS.md`, every Done-when check must be run, then stop. If Session 5 work already exists on the branch, keep it; this pass does not change shots, cameras, captions, cues, cast acting or the script.

First, append this whole message to `docs/V2_BRIEF.md` under the heading `## Amendment A1 (2026-11-12): stability and detail`, so later sessions inherit its rules.

### Why (owner's Gate A notes, diagnosed and reproduced)

**1. Ground flicker is z-fighting, not a renderer fault.** In `stories/nobody/world.js` the path plates top out at y = 0.40 (`.3 + .2/2`) and the inner field terrace also tops out at y = 0.40 (`.25 + .3/2`), so sand and grass are exactly coplanar and swap every frame (see `review/nobody/demo.mp4`, shots D1 and D8). The path and the cobbled street are also built from overlapping rotated plates that fight each other. Measured with a camera-nudge test (render the same camera twice, second time moved by 4 mm; count pixels whose colour changes by more than 40/255):

| view | now | path lifted off the terrace | street plates separated |
|---|---|---|---|
| D8 pull-reveal | 7.0 % | 0.04 % | |
| field anchor | 1.0 % | 0.12 % | |
| street | 1.4 % | | 0.16 % |

A healthy frame scores 0.0–0.2 % (antialiased edges only).

**2. Related faults seen in the same review:** ring stones outside the inner terrace float 0.2 above the ground; the dark rectangular grass plates read as glitch tiles; the sun's shadow box is re-fitted to the camera target every frame without texel snapping, so shadow edges crawl during moves.

**3. The world reads as plain.** Stones are bare grey boxes, the sword is four boxes, and walls rely on a flat 128 px pattern.

### Part A: stability (do this first; it is the blocker)

1. **`scripts/v2/stability.js`** (`npm run v2:stability -- --story <slug>` or `--spec <file>`): for every anchor camera, and for the first, middle and last frame of every shot when a spec exists, run the camera-nudge test above at 540×960. **Fail (exit 1) if any view exceeds 0.30 %.** Print a table and write `review/<slug>/stability.json`. Add it to `CLAUDE.md` commands.
2. **Ground by construction, never by luck:**
   - One `groundY(x, z)` function in `world.js` returns the top of the terrain (base, terraces) at a point. Everything that stands on the ground (stones, props, cast marks, anchors) takes its height from it.
   - One `LAYER` table of offsets above `groundY` (for example patch 0.06, path 0.12, cobble 0.12). No two surfaces that can overlap in plan may be closer than 0.05 in height. Unit-test the table and `groundY`.
   - New `B.ribbon(curve, width, heightFn, {pattern, color, thick})` in `parts/build.js`: **one** mesh following the curve, world-space UVs, sides closed down to the terrain. Rebuild the field path and the main street with it. No overlapping plates anywhere; plates may only butt edge to edge.
   - Replace the rectangular dark-grass plates with organic ground variety: irregular low-contrast blobs (5–7-sided, ≤ 8 % darker or lighter) plus, within 15 units of hero anchors, instanced grass tufts (2–3 small wedges) and a few flower dots. Budget ≤ 3,000 triangles in any view.
3. **Depth precision:** camera near 0.1 → 0.3. Confirm no close-up clips.
4. **Stable shadows** in `engine/look.js`: fit the sun's shadow box **once per shot** (centre = midpoint of the shot's target path, radius = `shadowRadius` + half the path length) and snap the centre to whole shadow-texel steps in light space. Stills and anchors keep the current behaviour.
5. Make sure the per-shot render cache key includes `parts/`, `engine/look.js` and the story's `world.js`.

### Part B: stylized detail (toy-like, never photographic)

**Art rule:** detail is few, large and clean. Big shapes first, then trim and chips, then surface relief. No noise speckle, grunge overlays or photo textures. A viewer should read "well-built block world", and the avatars must still be the highest-contrast things in frame.

**B1. Materials with relief** (`parts/materials.js`). Tested prototype on this repo: +7 to +11 % render time, bricks visibly catch the light.
- Draw patterns at **256 px**.
- For each relief pattern add a separate **height drawing** (white = high, clean shapes only), blur it about 1.5 px, convert to a normal map with a wrapped Sobel filter, and set it as `normalMap` on the Phong material with `normalScale` 0.5–0.8. Never derive height from the albedo: it turns tone variation into pits (tried, looks dirty). Do not use `bumpMap` (it produced NaN blobs earlier in this repo).
- Albedo stays calm: tone variation within ± 8 %, gaps and mortar no darker than 80 % of the block tone.
- Relief patterns: `brick` (raised rounded blocks), `cobble`, `slate`, `woodPlanks` (plank gaps and a few grain grooves), `thatch`, new `rock` (5–9 large angular chisel facets, two thin cracks), new `dirt` (cracked dry earth, for the clue). New flat patterns: `metal` (soft vertical streak, `shininess` 80, specular `#bbbbbb`), `moss`. `grass` and `sand` stay flat, with soft large blotches only.
- Hard caps: tiling maps only, 256 px, ≤ 16 albedo + ≤ 10 normal textures in total, no per-object unique textures in the world.

**B2. Hero props get modelled detail** (hero tier only; background copies stay cheap):
- **Ring stones** (instanced, 3 variants, ≤ 80 triangles each): chiseled silhouette built from blocks and wedges with cut corners, `rock` material, a moss cap on about a third, 1–2 chip blocks at the base, a dark socket where the blade enters. Per-instance tone jitter ± 5 %.
- **Hero stone** (≤ 600 triangles): larger chisel facets, a carved band, a clear dark socket, and the base cracks as modelled grooves over `dirt` in **three stages** (hairline, wider, split) selectable from shot data, because lines 14–15 of the script show them growing.
- **Sword** (hero copy ≤ 250 triangles, ring copies ≤ 40): tapered blade with a centre ridge and a point, crossguard with flared ends, wrapped grip with three rings, faceted pommel; `metal` blade, gold guard and pommel with a visible highlight.
- **Continuity:** the stone-hammer in `avatar-style/tools.js` must be visibly the same stone and the same sword as the hero stone in the field. Share the builder.
- **Walls and buildings:** keep the existing trim. Add a few protruding and recessed accent blocks per wall run (instanced, ≤ 40), a `moss` strip along shaded bases, and a baked vertex-colour gradient (bottom 1.5 units up to 12 % darker, top 5 % lighter) on walls, towers and houses as cheap contact shading.

**B3. Budgets stay binding:** `npm run v2:bench -- --story nobody` must still pass §5.4 (≤ 50k frustum triangles, mean ≤ 0.45 s/frame at 720), and the mean may rise by at most 20 % against the Session 3 numbers recorded in `PROGRESS.md`.

### Done when

- `npm test` and `npm run v2:test` pass (new tests: `groundY`, `LAYER` spacing, `ribbon` geometry has no overlapping top faces, normal-map generation is deterministic).
- `npm run v2:stability -- --story nobody` **and** `-- --spec stories/nobody/demo.json` exit 0. Record the before and after table in `PROGRESS.md`.
- `npm run v2:bench -- --story nobody` passes B3.
- `review/nobody/look-fix-ab.png`: before and after, side by side, for four views (hero stone close, sword close, gate wall, field wide), each also as a 390 px-wide phone crop.
- You have scored that sheet 1–5 on this rubric, fixed anything under 4, at most 3 passes, and recorded the scores: (1) stones read as carved rock at phone size, not grey boxes; (2) blade, guard, grip and pommel are distinct and the metal has a highlight; (3) bricks catch the light and no hero wall reads flat; (4) nothing looks photographic or noisy next to the avatars; (5) the hero and name tags are still the first thing the eye finds; (6) no rectangular ground tiles, clean path edges, no floating props; (7) day stills keep mean luma ≥ 110.
- `review/nobody/world-sheet.png` regenerated; `review/nobody/demo.mp4` re-rendered and re-assembled with identical shots and captions, and its 30 fps sheet of D8 frames 286–291 shows a steady path.
- A 10-frame re-render spot check is byte-identical.
- `CLAUDE.md` library index updated (new patterns, `ribbon`, `groundY`, stability command). PR updated. **Stop for the owner's review.**

### Rules that now apply to every later session and episode

- `v2:stability` is a gate: it must pass before any animatic or final is shown to the owner (add it to the Done-when lists of Sessions 5 and 6 and to `/new-episode`).
- Every world uses `groundY`, a `LAYER` table and `ribbon` for paths and streets.
- Detail hierarchy for every world: relief materials on structures, modelled detail only on the props the story is about, calm ground.

## Amendment A2 (2026-11-13): picture quality

Owner-ordered amendment after Gate C (Session 6.5). All §0 and §2 rules apply: plan first in `PROGRESS.md`, run every Done-when check, then stop. **The picture is locked:** do not change `episode.json`, `world.js`, cast, cameras, timing, captions text or the voice. This pass changes only how frames are rendered, finished, encoded and delivered.

### Diagnosis (owner: "it says 1080p but looks blurry"; reproduced on `review/nobody/final.mp4`)

The frames are rendered at a true 1080×1920 with 4× MSAA, and the raw renders are sharp. The softness is added afterwards, in three places:

1. **The grade adds a haze (the main cause).** `GRADE` in `scripts/v2/assemble.py` screens a σ = 24 blur of the *whole* frame back on top at 20 %. Every edge gets a soft glow, dark areas next to bright ones are lifted, and colour visibly bleeds (green haze over grey stones, a yellow halo round the crossguard). At 1:1 the raw render is crisp and the graded frame is not.
2. **The master is starved.** The ≤ 60 MB file cap forced CRF 20 at preset `medium`: 3.6 Mb/s for a 1080×1920 animation with constant camera motion and grass detail. YouTube recommends about 8 Mb/s for 1080p30 uploads; motion frames lose fine detail first.
3. **A 1080p upload gets YouTube's weakest processing.** YouTube re-encodes every upload; a 1080p upload is typically given H.264 at a low bitrate, while 1440p and above get VP9/AV1 with more bits. Independent VMAF tests put a 1080p upload at about 97.3 and a 1440p upload at about 99.95 after YouTube's transcode; 4K adds nothing over 1440p.

Minor contributors: 4:2:0 chroma halves colour resolution on saturated toy colours (helped by delivering at 1440); albedo anisotropy 4 and normal-map anisotropy 2 soften ground textures at grazing angles; GitHub's and the iPad's in-browser previews downscale further.

### What to build

**A. Finishing grade (`scripts/v2/assemble.py`)**
- Replace `GRADE` with a highlight-only bloom in RGB. Prototype tested on frame 2, verified visually at 1:1 to remove the halo and colour bleed:
  `format=gbrp,split[a][b];[b]lut=c0='if(gt(val,215),(val-215)*4,0)':c1='if(gt(val,215),(val-215)*4,0)':c2='if(gt(val,215),(val-215)*4,0)',gblur=sigma=6[bl];[a][bl]blend=all_mode=screen:all_opacity=0.35,eq=saturation=1.10:contrast=1.05,cas=strength=0.35,vignette=PI/9`
  Only things brighter than about 84 % (sparkles, fire, neon, sky highlights) glow. `cas` is a light contrast-adaptive sharpen: never raise it above 0.5 (block edges ring). Scale the blur σ with output height (σ = 6 at 2560 tall).
- Captions are burned **after** the grade at the delivery resolution, so text is never bloomed, scaled or sharpened.

**B. Delivery resolution: 1440×2560, rendered natively**
- Finals render at **1440×2560** (`render.js` default for `--final`), AA on. Measured here: 1440 costs 1.6–1.75× the time of 1080 per frame, which the 6-shard farm absorbs.
- Raise albedo and overlay texture anisotropy to 8 and normal maps to 4, then re-run `v2:bench`. Keep only if the 720 mean stays ≤ 0.45 s/frame; otherwise revert normal maps to 2 and record it.
- Fallback when the farm is unavailable and a local render would exceed 2.5 h: render 1080×1920 and upscale to 1440×2560 with Lanczos **before** grade and captions. Never upscale after captions. Record which path each final used.
- Animatics stay low resolution.
- `assemble.py` accepts 1440×2560 (native) and 1080×1920 (fallback, upscaled); it rejects anything else.

**C. Encoding: a master and a review proxy**
- **Master** (the upload file): x264 High, `-preset slow -tune animation -crf 14`, `-pix_fmt yuv420p`, BT.709 tags (`-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`), closed GOP of 15 frames (`-g 15 -keyint_min 15 -sc_threshold 0 -bf 2`), `+faststart`, AAC-LC 48 kHz 320 kb/s. **No size cap.** Bitrate floor: if the average comes out below 16 Mb/s, step CRF down (14 → 12 → 10) until it reaches 16 Mb/s or CRF 10.
- **Review proxy** (iPad viewing): same grade and captions, 1080×1920, CRF 18, ≤ 45 MB, so it can be committed to `review/<slug>/final-review.mp4`.
- The master is **never committed to git**. Deliver it as a GitHub Release asset (the farm already creates `<story>-<short sha>` prereleases; add the same for local finals with `gh release create … --prerelease`). Write the release URL and the master's ffprobe summary into `review/<slug>/DELIVERY.md`.
- Fix the loudness note from Session 6: loudnorm target TP −1.5 dB so the true peak after AAC is ≤ −1 dB.

**D. Quality gate: `scripts/v2/qc.py` (`npm run v2:qc -- --story <slug> --video <master.mp4>`)**
Automated, run before anything reaches the owner. Exit 1 on any failure; write `review/<slug>/qc.json`.
1. `ffprobe`: 1440×2560 (or the recorded fallback), 30 fps, yuv420p, BT.709 tags, AAC, average video bitrate ≥ 16 Mb/s, true peak ≤ −1 dB, −14 LUFS ± 1.
2. **Encode loss:** pick 12 frames (the 6 shots with the fastest camera speed from `plan.json` plus 6 evenly spaced). For each, decode the master frame and compare it against the graded, captioned uncompressed frame at the same index (produce these with the same filter graph). Require SSIM ≥ 0.985 and PSNR ≥ 40 dB on Y.
3. **Grade does not soften:** on the same 12 frames, compare raw render against graded (without captions) using the mean absolute Laplacian over the frame. Require graded ≥ 95 % of raw. Also require that the mean colour difference (ΔE76) inside the masks of hero-tier grey objects (stones, walls) is ≤ 4, so the grade never re-tints neighbours.
4. Write `review/<slug>/qc-crops.png`: 1:1 crops (600×500) of raw / graded / master-decoded for 4 of those frames, including one fast-motion frame and one close-up of a face with a name tag. Score it yourself (crisp block edges, no halos, no colour bleed, readable tags) and record the scores.

**E. Optimisation without quality loss** (measure each, keep only what helps)
- Capture frames without PNG compression: read pixels from the WebGL canvas (or use `toBlob` with low compression) and stream raw RGBA into one `ffmpeg` per shard writing a lossless FFV1 or PNG-compression-level-1 intermediate. Measure s/frame at 1440 before and after; keep it only if it is faster and bit-identical (spot-check 10 frames).
- One render produces both deliverables: the 1440 master, and the review proxy downscaled from the same graded frames. Never render twice.
- The farm (`render.yml`) runs finals at 1440 and runs `v2:qc` in the assemble job; a failed QC means no release.

**F. Re-deliver Nobody**
Re-render the locked episode at 1440×2560 (farm if it works, otherwise local, recording which), assemble with the new grade, run `v2:qc`, and publish the release plus `review/nobody/final-review.mp4`. Use the per-shot cache. Delete the old 58.6 MB `review/nobody/final.mp4` from the branch (it stays in history) so the repo does not keep growing.

### Done when
- `npm test`, `npm run v2:test` (add tests for the new filter-graph builder, CRF stepping with the bitrate floor, and QC thresholds) and `v2:plan` pass. `v2:bench` passes after the anisotropy change, or the change is reverted and recorded.
- `npm run v2:qc -- --story nobody --video <master>` exits 0. `qc.json` and `qc-crops.png` are in `review/nobody/`, and the crop scores are recorded in `PROGRESS.md`.
- The release exists with the 1440×2560 master; `DELIVERY.md` links it; `final-review.mp4` ≤ 45 MB is committed.
- `PROGRESS.md` records: render path (native or fallback), s/frame at 1440, wall time, master bitrate and size, the before/after table of grade-sharpness and encode SSIM/PSNR, and the result of the E measurements.
- `CLAUDE.md` commands updated (`v2:qc`, the final preset, delivery). `/new-episode` updated: E2 = render at 1440 → assemble → `v2:stability` + `v2:qc` → release.
- PR updated. **Stop for the owner's review.**

### Standing rules from now on
- Finals deliver at 1440×2560, rendered natively whenever the farm is available.
- No full-frame blur or bloom in any grade; glow only on highlights.
- The master is uncapped and published as a release asset; only review proxies go into git.
- `v2:qc` must pass before any final reaches the owner.
- `PUBLISHING.md`: upload the 1440 master, publish as Unlisted first, wait until 1440p appears in YouTube's quality menu, check it, then make it Public.

Owner note with this amendment: the owner uploads to YouTube; delivery = the master file sent directly plus the farm prerelease (owner decision 2026-11-13).
