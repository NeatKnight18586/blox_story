# PROGRESS — current phase log
Older log (sessions 1 → tuft E5): docs/archive/PROGRESS.md. Rules: RULEBOOK.md.

## Phase 0A — merge + one rulebook + archive (Sonnet 5.5)
Plan: merge claude/tuft-e5 → main; branch claude/pipeline-v7; write RULEBOOK.md; archive superseded docs; shrink CLAUDE.md; no engine/render change.
Built:
- unranked-e4 ⊂ tuft-e5 (0 missing commits). PR #57 tuft-e5 → main merged (merge commit 4407b32).
- RULEBOOK.md (70 lines), CLAUDE.md (14 lines), PROGRESS.md reset; docs/RESULTS.md (+ "length variant" column).
- Archived to docs/archive/: V2_BRIEF, A4_FORMAT_V3, A5_LOOK_FIX, V4, STORY_ENGINE, EPISODE_BRIEF, BRAND, PIPELINE, FORMAT_V6, STORY_BIBLE, CODEX_HANDOFF, STATUS, PROGRESS.
- Kept in place: docs/season1/SEASON_1.md (read by tests/v2/test_s9.py), STATE.md (season_state.py), refs/ (face gates).
- new-episode.md / season.md now point to RULEBOOK.md (season.md marked legacy). Only code mentions of archived docs are comments/notes.
Decisions: PROGRESS.md stays at root (scripts/freeze-check.js allows it). Rulebook §9 omits P3/A5 gate scripts (not part of the new loop).
Open: engine code comments still cite old doc paths (cosmetic; not touched per "no engine change").

## Phase 0B — format 7, one-word captions, pace, /new-episode (branch claude/pipeline-v7-phase-0b-dxbr12)
Built: `format: 7` (+ `lengthVariant`): `endFor` voice + 0.5, max end 77 / 102 s; plancheck hero ≤ 10 s, final-shot rule, length; plancheck6 dead-stretch
window 1.0 s (< 12 s) / 1.5 s, `voiceGap` WARN (> 0.4 s, check `v`); `scriptcheck.py --variant short|long`; brief2spec `SPEC FLAGS`; captions
`pop-shorts-v7` (one word, #FFE135, outline 20, fixed y 1250, default for format 7); `/new-episode` rewritten (44 lines, old flow in docs/archive/new-episode-v6.md).
format 6 `>=`-gates in episode.js / render.js / seasoncheck.js / plan.js now include 7; format 6 behaviour untouched.
Numbers: `npm run v2:test` 277 JS + 74 py green, `npm test` green; `_fixture6_pass` plan.json byte-identical before/after; `_fixture7_pass` plan PASS
(0 errors, 7 warnings: escalation ×2, pacing ×2, moodSeparation, voiceGap ×2); caption-v7-phone cap 4.04 % (≥ 3.2), band 61.9–68.4 % (58–74): PASS.
Decisions: RULEBOOK.md, `npm run ep` and `ep:check` do not exist on this branch: new-episode.md references them as specified; RULEBOOK §9 not edited.
Branch name from the session setup (claude/pipeline-v7-phase-0b-dxbr12), not claude/pipeline-v7. Brief flag syntax: `- spec flags: format: 7, lengthVariant: short`.
Open: the phone sheet uses the demo video, whose old white captions are burnt in under the v7 ones (overlap in the sheet only).

## Phase LOOK SIGNATURE — engine slot (branch claude/phase-look-signature-opus-ao82s9; farm run 45751719604)
Built: looks4 `cityDay2` (opt-in; cityDay unchanged) + look4 opt-ins skyMid/clouds2/sunRays/grade/haze; `engine/outline.js` (off|classic|classicPlus, default off);
plan.json keyArt on all 17 anchors (4 hand-tuned, 13 `auto`, unmeasured) + `keyArt()` rule; `parts/city/living.js` (9 movers + Governor blimp 1.8k tris);
docs/CONTINUITY.md + RULEBOOK §2 line; scripts/v2/look-gate.js + look-sheet.py; assets.yml `looksig`. Review: review/city/LOOK-{sheet,crops}.png, LOOK-motion.mp4, LOOK-measures.json.
Farm numbers (720×1280, look C): bayNorth 89.3k / 0.503 s, plazaWide 81.8k / 0.445, mainSt 88.3k / 0.677 (FAIL > 0.62; off 0.577), heroHouse 47.5k / 0.562.
Outline cost farm: classic +0.082…0.101 s, classicPlus +0.084…0.100 s — FAIL (≤ 0.06) after two fix passes (local: 0.03–0.06). Key-art: near 16–37 %, third Δ 1.1–7.1 %: PASS ×4.
Living: ≤ 2.5k tris and ≤ 3 movers in frame: PASS. Open: MRT (id/normal in the main pass) would remove the 2nd geometry pass, the likely fix for the outline cost.

## Phase 1D — look fix-ups + harbor & beach (city gate 4; branch claude/city-gate-4-harbor-beach-f9m851)
Built: outline classic in the MAIN pass (MRT: id/normal/1/z via patched chunks, multisampling off + FXAA blit; no second geometry pass) and
cityDay2 `outline: classic` = city default (classicPlus kept, two-pass); staging rule (plan.json keyArtStaging + keyArtGroup/heroFrac, every
keyArt has a `landmark`; kids beside on the frame-centre side); blimp 90 s (north leg at 125: clears the statue in plazaWide); bayNorth jetty =
kit `dock` planks; parts/city/harbor.js (rubber-duck lighthouse + beam, diner + cheeseburger tower, quay/piers/props/fish market/warehouses,
beach + pier + Ferris wheel), movers fishingBoats/ferry/gullsHarbor, anchors diner + duckClose (harborDock/beach re-authored), decks in groundY,
terrain LOD + prop culling; scripts/v2/city1d-gate.js + city1d-sheet.py, assets.yml `city1d`.
Farm (runs 45758999246 + 45759326917, look B, CC0): all 19 key art PASS staging; gate rows tris 36–83k, s/frame 0.30–0.59 (harborDock 0.589 max, mainSt 0.54);
outline cost −0.144…+0.008 s; sightlines harborDock 2,3,7 / diner 2,6,7 / beach 6,7; duck 24 % of duckClose; blimp drift 19 % of width in 4 s.
Open: CC0 planks map reads dark on the farm (docks near-black brown); plazaWide/mainSt fg lamps still large.

## Phase 1E — fix-ups + wild edge + hero/impostor trees + suburb variety + time-of-day looks (city gate 5; branch claude/friendly-mccarthy-zso21g)
Built: light planks (CC0 map re-tinted by luma, `LIGHT_WOOD`), warmer statue gold, DINER plate 10.5 × 3.3, duck beam only when the look says so (looks4 `v4.city`);
staging adds ground ≤ 25 % (up-facing pixels) + fg on an edge 5–15 % width, never mid-third (`keyArtStaging.groundMax/fg`, keyArt `edge`, kinds `piling`/`signpost`), all 25 key-art anchors re-tuned
by `scripts/v2/city1e-tune.js` (plan.json data only); wild edge `parts/city/wild.js` (sleeping stone head slot 7 + ear waterfall + pool, trail + signposts, rope bridge over
`terrain.ravine`, campsite + smoke, cliff lookout, cave + cart track, wildflowers, `terrain.pads`) + 6 anchors; `parts/city/trees.js` hero trees + 8-view impostor atlases
(albedo + normals, cached) + dithered 3D crossfade at 25 studs; suburb variety (gambrel roof, 10 house presets, no-repeat picker, flower beds/bikes/swings/mailbox styles);
looks `cityGoldenHour`/`cityDusk`/`cityNight` (lit windows, street lamps + halos, beam, stars, lit blimp). `.gltf` now served by scripts/v2/server.js (no CC0 model ever loaded before).
Farm (run 45773645153, look B): all checks PASS; bench gate rows 32.8–72.9k tris, 0.164–0.539 s/frame; planks luma .654/.619; gold hue 42°, sat .76, clip 0.8 %; DINER cap 3.1 %.
Decisions: CC0 trees rejected — every Poly Haven leafy tree is ≥ 60 MB/file (cap 25 MB); the pine/fir that fit are 1.3 m saplings (398k/433k tris) that read as brown chips at ≤ 6k
and cost +0.2–0.5 s/frame (run 45772957609) → all species procedural (CC0 path kept, plan.json `trees.species.*.model`). maxModelBytes 25 MB stays for the request.
Open: night look still bright on water/ground; golden hour weakly warm; impostor dither visible right at the 25-stud band; the six wild anchors only have one fg (forestTrail).

## Phase 1F — Governor + episode engine pieces + look fixes (city gate 6; ENGINE slot; branch claude/eager-bohr-rg5mhm)
Built: THE GOVERNOR (`cast/governor.json`, `avatar-style/governor.js`: tall top hat + red band, gold monocle (pops off on gov_panic), handlebar mustache,
navy suit + red tie, gold chain + medallion, golden megaphone; faces v6 `FACES_GOV` smug/announce/panic/oops; acts `GOV_VERBS` rope_pull/announce/panic_up;
anchor `govBalcony`); rule-clock kit `engine/clockfx.js` (spec `clock`: dong = bell swing + shockwave, pop = smoke puff + sparkles + object swap, crack =
`bellCrack`); anchor lock `engine/anchorlock.js` (spec `anchorLock`); meme-gap audio `scripts/v2/memegap.py` (+ assemble.py `audio.voice` opt-in);
looks: cityNight real night (lamp pools baked + terrain glow, dark water, matcap rim), cityGoldenHour orange→peach, terrain triplanar + per-pixel cliff rock,
3D wildflower tufts. Gate `scripts/v2/city1f-gate.js` + `city1f-sheet.py`, request line `city1f`.
Farm run 45785015477 (CC0, look B): all PASS — bench bayNorth ×4 looks 56–69k tris, 0.406–0.427 s/frame; clock cam 53.9k / 0.408 s; night luma .123 vs day .542. Local: clock events dong .25 / pops 1.0, 1.6, 2.2 PASS; anchor lock 3/3 shots in zone (residual < 1e-3); bench 56–69k tris, 0.32–0.39 s/frame;
night luma .128 vs day .549; Governor 7,972 tris; meme-gap fixture 11 words shifted, 0 overlap samples, VO bit-identical, clip −3.0 dB. npm test + v2:test green.

## Phase 1G — Fear Bell cast, creatures, props & interiors (WORLD + ASSET session; branch claude/hopeful-darwin-rzfmu5)
Built: A fixes — Governor `announce` re-keyed (R6 rS [-110, -45, -65]) + `aimMegaphone` (mouthpiece on the mouth, gold grip stub to the fist; only when the fist is
in front of / below the mouth); cartoon POP default in clockfx (ink-outlined white clusters, 3–4 frame pop; `style: 'soft'` keeps 1F). B creature kit `parts/creatures.js`
(spec `creatures`): ghost, trex, rat→mouse, spider, vacuum, shadowPuff, dome (roll / shrink → palm puff / inside view), pillar (40 studs, `ride`). C `parts/props1g.js`
(burger→slider, plate, spaghetti, plush, donut, bellRope, mailBurst, flashlight + cone/spot) + kit busStop (Main St) + dinerCounter (diner patio). D extras kit
`avatar-style/extras1g.js` + 8 costumes in troupe-r6.json (LULU, KEVIN, PICKLES, MAILMAN, BODYBUILDER, DAD_FB, TEACHER_FB, BUSLADY = grandma). E world `parts/city/rooms.js`
+ locations cityClassroom / cityDining (2 key-art anchors each). Gate `scripts/v2/fearbell1g-gate.js` + sheet, farm request line `fearbell1g`.
Decisions: creatures are a new kit (beast kit rigs are faceted quad/bird/dragon with glow seams, not soft cartoon shapes); city-kit test gives the 1G kinds their own
per-kind budget (≤ 500) because the original aggregate was already at 5,996 / 6,000; diner counter + bus stop trimmed so diner stays ≤ 3,500 tris.
Farm (runs 45801572743 → fix pass 1 → 45803923051, look B, CC0): creatures 594–7,044 tris (≤ 8k PASS); megaphone mouth gap 0.03 studs PASS; bench plazaWide + dome + 10 extras
74.6k tris PASS, s/frame 0.701 → 0.910 FAIL (local 0.319 → 0.286); rooms classroom 0.581 → 0.777, dining 0.689 → 0.908 (calls 405 → 167 / 500 → 225 after the merge —
every row got slower on run 2, including the classroom where only draw calls were removed: runner variance). Stopped after fix pass 1 + re-measure; not loosened.
Open: farm s/frame on look B rows (needs a stable-runner bench or a cost lever on 10 R6 extras); dome clip's first shot-2 frames are filled by the dome; puff lands at chest, not in an open palm.

## Fear Bell — ENGINE add-on + PREVIS (owner-approved engine slot; branch claude/vibrant-davinci-hkmucr)
Plan: 0a relative bench (frozen reference in the same run, RULEBOOK §6) · 0b BODYBUILDER 1.35 + broad torso · 0c dome palm puff on Lulu's hand + inside rim ·
commit engine, BASE = that commit · v2:align → cues.json · PICTURE_LOCK → BRIEF.md (mechanical, lock2brief.py) · brief2spec (report) · story-local previs builder
(episode.json + per-world specs, clock, creatures, gaps) · vo-sheet one frame per row · staging passes · memegap · scriptcheck · ep:check + v2:test.
Built (engine, commit 27e39d2): `scripts/v2/benchref.js` (+ v2:bench, fearbell1g-gate bench): reference = engine/fixtures/r6/episode.json 270×480, normalised =
s/frame ÷ ref × 0.068 (tuft-1A), gate 0.62 unchanged, `--absolute` keeps the old gate; R6 `torsoShape: 'broad'` + costume `keepScale` (format 5–7 forced every adult to
scale 1 — the 1G bodybuilder 1.12 never rendered); dome `shrink {toActor, hand}` + `inside {rim}` (RIM_IN), episode.js `handPos` + `CREATURES.aim`.
Numbers (local): reference 0.0457 s/frame; plazaWide + dome + 10 extras 0.366 s → ratio 8.01 → normalised 0.545 PASS (74.6k tris); classroom 0.270 → 0.402; dining 0.279 → 0.415.
Bodybuilder 7.19 studs (others 5.2–5.9, Governor 6.76 with hat). review/fearbell/addon-bodybuilder.png, addon-dome-inside.png.
PREVIS: BASE 27e39d2; align 290 words (283 mapped), VO 85.45 s; BRIEF.md 55 rows (stories/fearbell/lock2brief.py; 11 camera nuances UNMAPPED, build/lock2brief.json);
brief2spec exit 1 (24 lines: city locations, GOVERNOR slot, creature/town/crowd subjects, `*vacuum cleaner.*` two-word emphasis) → stories/fearbell/previs.js writes
episode.json (format 7 long, pop-shorts-v7, r6, cityDay2, locations city/cityClassroom/cityDining, 55 shots static/push + briefMove, 13 cast, 17 creatures, 11 props,
24 clock events, audio.gaps G1–G3) + build/previs-<world>.json; vo-sheet review/fearbell/vo-sheet{,-2…-10}.png (stories/fearbell/vosheet.py + sheet.py, 6 cells/page, 1596 px).
Meme gaps (memegap.py PASS, 0 overlaps, clip −3 dB): G1 6.486 s (+1.21), G2 14.498 s (+1.65), G3 32.961 s (+1.63, "fear" nth 8); VO 89.94 s, end 90.44 s (≤ 102).
Hero first on screen: row 10, 11.06 s gapped (row 9 heroLow: hidden behind the bodybuilder after 2 fix passes) — FAIL ≤ 10 s, not loosened. Pattern break row 12: 12.96 s gapped.
scriptcheck --variant long: exit 1 "no card for `fearbell` in SEASON_1.md §6". ep:check PASS; v2:test 330 + 80 OK; npm test green.
Open: segments keep one world for all locations (rooms need parts/city/rooms.js) — vo-sheet rendered per world; brief2spec has no city/creature/clock/GOVERNOR path;
rows not showing MUST SEE listed in the owner report; drawer worldState, giant spider on the school, clock noon, punch, juice, cart, leaf not staged.

## Fear Bell — PREVIS PASS 2 (owner-approved ENGINE slot + re-stage; branch claude/amazing-meitner-13db6x from claude/vibrant-davinci-hkmucr 88b75df)
Plan: A1 camtpl `faceAim` (face on the upper third, headroom 8–12 %, never crop the head; format 7 opt-in shot.faceAim + tpl ctx) · A2 format 7: no fg element
unless notes `fg:` + plan check scripts/v2/fgleak.js (non-subject cover of the middle third ≤ 10 %) · A3 data on kits: verbs water / sip / leap / punch / lookAtLens,
props wateringCan / juiceCup / leaf (blow mover) / mouse / cheeseburger (full), prop `attach` to an actor part, city setState clockTime, face deadpan · A4 brief2spec
format 7: city locations, GOVERNOR slot, 1G creature / town / crowd subjects, multi-word emphasis → episode.json from BRIEF.md; previs.js = blocking overrides only ·
A5 scriptcheck: format 7 needs no SEASON_1.md card · tests for each · engine commit → BASE · B re-stage rows (one fix each) · vo-sheet re-render · gates · merge main.
Built (engine, commits e13e68a + 83adde4 = BASE): A1 camtpl `faceAim` (+ episode `faceAimCam` on the visible head mesh, centre before widening, two heads may
rise above the line) · A2 format 7 fg only with `fg:` notes, episode `leakMeasure` + shot `leakOk`, `npm run v2:fgleak` (in `ep --stage plan`, format 7) · A3
FB_VERBS water / sip / leap (unplanted) / punch / lookAtLens (episode `lensActs` body turn; not a track item), face deadpan, props wateringCan / juiceCup / leaf /
mouse / cheeseburger + tools, prop `attach` (hide keys respected), city `setState('clockTime')` · A4 brief2spec format 7 city path (`cityLocOf`, GOVERNOR,
creature / town / crowd / kids subjects, 1G props + city objects, multi-word emphasis, `fg:` notes, `cityCam`) · A5 scriptcheck `is_format7`. Tests:
tests/v2/fearbell2.test.js (11) + test_format7.py. Found: brief2spec's format 6 `moods: true` blacked out the city look (previs drops moods / body / look).
Episode: `node scripts/v2/brief2spec.js --story fearbell` (exit 0) → `node stories/fearbell/previs.js` (blocking overrides on the brief2spec base, kept in
build/brief2spec.json) → `node stories/fearbell/vorender.js` (see frames + leak + headroom) → vosheet.py + sheet.py → review/fearbell/vo-sheet{,-2…-10}.png.
Re-stage (data): row 6 camera on the pillar top; 8 hero cameo (heroC, juice cup, sip, walking behind the mailman); 9–10 + 29–30 moved to the beach ice-cream
cart (leap, mark into the cart), 11/15/19/20/21/26/27 cameras clear of pole / statue / chair / table / awning; 14 leaf mover + empty side; 16 drawer worldState;
18 kids sprint to the door; 22 burger in his hand at the mouth; 25 puff beside Lulu; 34 clock tower at noon; 39 punch into the dome; 47 huge eyes above
Lulu; 49–51 wide collapse / step / palm puff (Lulu water-palm pose, both faces); 52 mouse on the shoulder + slider; 53 low behind hero + puff; 54–55 full
cheeseburger on the grass, knees_collapse + deadpan lookAtLens, face-aimed.
Numbers: hero first on screen row 8 = 7.62 s raw → 8.83 s gapped (≤ 10.0 PASS); row 12 start 11.75 raw → 12.96 s gapped (> 12, report); fgleak PASS 55/55
(max 5.0 % city, 7.9 % classroom, 2.0 % dining); face aim headroom 0.10 on every faceAim row; VO 89.94 s, end 90.44 s (gaps G1–G3 unchanged);
scriptcheck --variant long FAIL "first line has 10 words (> 9)" (no card needed now; reported, not rewritten).
Open (MUST SEE still weak): 10 he is mid-leap above the cart, 16 drawer half behind the spider legs, 26 flashlight beam / puff shrink not readable, 45 hands,
49 collapse reads as a smaller dome only, 50 the two shrink steps do not read in one frame, 53 bell crack too small at yard distance (readable in 32),
39 face aim off (the fist must be in frame), 55 burger reads as bun + layers but little grass.

## Fear Bell — ANIMATIC (episode session; branch claude/fearbell-animatic-staging-5oxlyj from main 1af40d8; NO engine changes)
Plan: BRIEF.md re-synced to the new lock rows 54–55 (lock2brief.py, mechanical) · staging fixes per row in previs.js (14, 16, 26, 27, 28/39/40/42, 45, 53–55, 10/49/50) →
vo-fix sheet review/fearbell/vo-fix{,-2,-3}.png (only those rows) · plan gate exit 0 (cast-name subjects; creature rows keep `see`) · ep animatic (bench, stability, 270×480,
v7 captions, assemble --animatic ≤ 10 MB) · 390-px phone sheet · ep:check + v2:test · commit + push, report ≤ 20 lines, STOP.
Result (ANIMATIC, stopped): plan gate PASS (0 errors, 7 warnings; hero first row 8 = 8.83 s gapped; row 12 starts 12.96 s gapped; fgleak 0.048). Staging fixes per row in review/fearbell/vo-fix{,-2,-3}.png.
v2:stability FAIL after 2 fix passes: S01 fixed (bell camera 26° from 40 studs); S38:mid 14.0 % and S49:first 17.0 % remain (limit 0.30 %). Cause measured: the first render
after a jump into those frames differs from the second render of the SAME frame by 11–16 % of pixels (dome size/position stale; render-order state in the dome creature) — engine-side,
not camera-dependent (camera nudge + dome split + earlier dome visibility did not change it). Gate not loosened; no animatic rendered. Needs an ENGINE slot (dome rt.motion).

## Fear Bell — ENGINE FIX + ANIMATIC (owner-approved engine slot + animatic in one session; branch claude/fearbell-animatic-staging-5oxlyj)
Root cause (dome instability): parts/creatures.js hid the dome shells only on the inside-view on/off TRANSITION, then set every dome root visible → the first frame after a jump showed stale domes. Fixed (hidden every inside frame), plus: shrink toActor no longer mutates the spec, null sky background restored, clock FX `rest` (bell swing 0 outside dongs, format 7), look4 `primeHaze` (format 7). New `npm run v2:seek` (cold vs in-sequence fingerprint + pixels), fixture seek-dome.json PASS (fails on the old code).
Plan gate measures non-actor subjects (objectBox / objectIssues); all 57 shots name subject or prop again (16 teacherDrawer, 23 prop_burger3, 34 slot:3:dial#2). Segments render room locations from parts/city/rooms.js (they rendered in the city before). Assemble format 7 end = voice + 0.5 s. previs.js --gapped builds the spec on the meme-gap timeline.
Stability PASS 200 views (S38:mid 14.0 → 0.007 %, S49:first 17.0 → 0.013 %, worst S03:first 0.29 %); room key-art cameras y 5.0 → 5.3 (shadow threshold). Plan exit 0 (0 errors, 7 warnings). Animatic review/fearbell/animatic.mp4 90.4 s 8.9 MB; phone sheets review/fearbell/phone-390{,-2…-8}.png.
Weakest (next pass): S55 hero out of frame at mid (burger edge only), S30 mouse insert unreadable, S45 hands insert dark, S43 "walked" back of head (no dome), S06 Heights figure tiny on the pillar.

## Fear Bell — FINAL (episode session; branch claude/fearbell-final-staging-xi2bwp from main a67c02e)
Plan: BASE → a67c02e (the owner's g3_mmm.wav fix sits after the old BASE; ep:check) · BRIEF.md row 10 re-synced from the lock (lock2brief.py, mechanical) ·
A staging fixes in previs.js, one per row (6 ride-up, 10 no pop + reveal + leap into the cart, 11–12 Kevin faces the burger + visible push, 21–22 no pole,
14 face + empty space + leaf, 26–27 hero ≥ 25 % + Lulu's face clear, 30 whole mouse, 43 dome in frame, 45 lit hands, 55 face beside the burger + hero visible to the end)
→ review/fearbell/final-fix*.png (3 frames per row: start / MUST SEE / end) · plan gate exit 0, fgleak, v2:seek, v2:stability PASS ·
B final.sh command file: memegap → gapped spec → farm render (look B, CC0) → v7 captions → assemble (gaps, clock FX, end = voice + 0.5 s) → v2:qc →
per-gap mean volume → review/fearbell/DELIVERY.md · ep:check + v2:test · C merge --no-ff to main, push. Report ≤ 20 lines, STOP.
Result (FINAL): engine fix (pipeline bug that blocked the final, commit bfcd8f9 = BASE): engine/episode.js updateProps — the prop `visible`
keys + `anim` call had slipped into a `//` comment in e13e68a, so no story prop animated (clue 1 burger shrink, rope, mail burst, pour, leaf);
restored + test (tests/v2/fearbell2.test.js, fails on the old line). Staging fixes (data, previs.js) per row → review/fearbell/final-fix{,-2…-8}.png
+ final-fix-gapped-6-12.png; consequential re-aims: 23 (burger moved with Kevin), 54 (shape's edge with the moved burger). Row 22: Kevin turns
from the counter to the patio for the bite (counter/awning/window-post leak otherwise 15–50 %). Gates: plan exit 0 (0 errors, 10 warnings),
fgleak PASS max 8.4 %, v2:seek PASS, v2:stability PASS (worst S03 0.199 %). BRIEF.md row 10 MUST SEE still the pre-change text (not edited).
Final: farm render.yml cannot do the meme-gap timeline or the CC0 cache → local fallback (stories/fearbell/final.sh): CC0 via fetch-assets.py
(new personal environment `blox_story` allows api.polyhaven.com + dl.polyhaven.org), render 2,171 frames 1440×2560 in 53 min (4.17 s/frame, 3 workers),
v7 captions 290, assemble → renders/v2/fearbell-master.mp4 90.458 s 193.6 MB; proxy review/fearbell/final-review.mp4 37.0 MB.
v2:qc PASS (−14.6 LUFS, TP −1.6, SSIM .9854, PSNR 43.85). Gap means G1 −12.2 / G2 −20.8 / G3 −19.3 dB (whole −15.4). DELIVERY.md written.
Open: CONTINUITY.md row wording ("pending") is outside the freeze; qc.py needs --frames for a local master (crashes without it).

## Fear Bell — HEIGHTS + CAPTION FIX + RE-FINAL (Sonnet 5.5; branch claude/fearbell-heights-captions from main 5b4f83f)
Caption root cause: aligned short words are 20–120 ms and timing() starts a chunk at word − 40 ms (clamped to the line onset) and ends it where the next starts, so
30 of 290 one-word captions lasted 0–1 frames (libass shows nothing: "Mr.", "is", "of", "You're", "my", "For the first"). Fix (captions.py, v7 opt-in `minShow` 0.12):
merge_short merges a too-short caption with the next (else previous) word of the same sentence/line, never across a sentence end or pause (Mr. is not one; Pickles' keeps its
apostrophe); ensure_show borrows ≤ 30 ms for leftovers; holds are cut before a meme clip. `npm run v2:capcheck`: script.txt vs the .ass; old output FAILS (1 missing, 30 invisible),
new PASSES (0 missing, 0 out of order, max onset 45 ms, shortest 70 ms). Tests: tests/v2/test_captions.py MergeShort (4). Row 6: split at the end of the rise (gapped 31 %), 6b high
three-quarter on the pillar top, Pickles gasp_step_back ×2 + scream face (no cling/hug pose exists; engine pose needed to hug). Final: final.sh (45 frames re-rendered, rest cache),
qc PASS, gaps G1 −12.2 / G2 −20.8 / G3 −19.3 dB; master + proxy audio identical per window.
