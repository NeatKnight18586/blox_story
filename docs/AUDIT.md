# Retention Engine — Phase 0 audit (2026-11-19, read-only)

Scope: every rule in the owner's prompt §1 (and the §0 non-negotiables) checked against the code as of `0087b8f`.
Measured episode: **Toy House** (`stories/toyhouse`, the last episode with a final render, 53 shots, 81.75 s).
Tests this session: `npm test` exit 0, `npm run v2:test` 163 node + 63 py pass (after `npm ci`; the fresh container had no `node_modules`).
Rule IDs below are provisional; Phase 1 keeps them as written unless the owner changes them.
Status: **exists** = already enforced or built · **partial** = some of it is built, or it is built but not checked · **missing** = nothing yet.
Effort: S ≤ ½ session · M ≈ 1 session · L = several sessions or blocked on rendering cost.

## 1. Pipeline map (what exists today)

| Area | Where | Notes |
|---|---|---|
| Renderer | `engine/episode.html` + `episode.js` (three.js in headless Chromium via Playwright) | Data-driven from `stories/<slug>/episode.json`; per-shot frame cache keyed by code + spec hash (`scripts/v2/render.js`) → shot-level re-renders already work |
| VO → cues | `scripts/v2/align.py` | Takes `voice.flac`/`.wav`/`.mp3` + `script.txt`; sherpa-onnx + NW alignment, or ElevenLabs forced alignment if a key is set → `cues.json` (word starts/ends) |
| Beats → shots | `scripts/v2/beats.py` (owner timestamp list → shots, Toy House anchors); per-episode generators (`scripts/v2/toyhouse-episode.js`) | Hand-written generator per episode, about 1k lines of shot data. No clause or stress-aware planner |
| Camera | `engine/camera.js` (pure): push, pull, orbit, track, crane, whip, gamecam, static-drift, drone, heroLow, snap, tiltUp, crashZoom, topDown, splitScreen, lowAuthority, aisleTrack; `openHit` (frame-0 punch + micro-shake); `fit` framing; speed cap | Shots are given as raw `from/to {position,target,fov}`, so the presets do not yet take only target + duration + intensity. No lens names (mm) |
| Plan gates | `engine/plancheck.js` (v2 §5.2), `plancheck5.js` (format 5: 75–90 s, avg 1.2–2.2 s, static ≤ 2.5, moving ≤ 3.5, first-second motion + reveal, clock on time words), `seasoncheck.js`, `readcheck.js`, `stability.js`, `scripts/v2/qc.py` | `v2:plan` runs in the farm's plan job **before** render; `v2:qc` gates the release |
| Captions | `scripts/v2/captions.py` + `captions/pop-shorts-v5.json` | Lilita One, 1–3-word groups, band 58–74 %, keywords yellow **#FFD542** |
| Lighting | `engine/look.js`, `look4.js` + `looks4.json` (AgX, PMREM sky, height fog, halo sprites, baked AO), `look5b.js`, `look6.js` | Presets are per set (toyNight, toyDawn, comedy, mystery…), not per mood. No bloom pass, no DOF; motion blur = 2 sub-frames on whip/crashZoom (`motion5b.blurOffsets`) |
| Characters | `avatar-style/body5.js` (R6, satin Standard r .45 / matcap), `faces5.js` (owner 48-cell sheet), `hair4.js`, builds `adult_f` (subtle hourglass), `youth`, `elder_f`; hero `cast/hero.json` | Faces v5 is the default for body v5; faces2/3/4 still selectable |
| Worlds | `parts/` (materials, terrain, biomes, vegetation, water), `parts/sets4/` (Toy House set library), `parts/location.js` (Phase R generic JSON location loader + CC0 PBR) | Realism spike: lit CC0 street = 9–13 s/frame @1440 on the farm vs 0.69 budget |
| Finishing | `scripts/v2/assemble.py` (grade, captions, −14 LUFS, sfx auto-placed with `--spec`, `music.mp3` if present, format-5 hold 0.85 s) | |
| Farm | `.github/workflows/render.yml` (plan → 5–6 shards → assemble → qc → draft release), `assets.yml`, `cleanup-branches.yml` | Standard `ubuntu-24.04` runners, artifacts retained 1 day, no LFS (no `.gitattributes`), no licence file ✓ |
| Contact sheets | `scripts/v2/sheet.py` (frames dir/video → ≤ 1600 px sheet, `--frames`, `--labels shots.json`) | No `--shots 12-19` selector |
| Story docs | `docs/season1/SEASON_1.md` (§2 steal like an artist, §2b originality, §4 lanes, 30 cards), `STORY_BIBLE.md`, `SERIES_LOG.md`, `docs/season1/V4.md` (owner decisions D1–D4) | |
| Session docs | `CLAUDE.md` (≈ 75 lines, plus `docs/V2_BRIEF.md` 887 lines and `PROGRESS.md` 1,459 lines to read) | Too heavy for the new token rules |

## 2. Rule table

### 1a Story engine
| ID | Rule | Status | Evidence today | Files that will change | Effort |
|---|---|---|---|---|---|
| R-STORY-01 | Two-beat hook (rule + break) in the first 12–18 words | partial | Toy House: first 18 words end at 5.28 s; no check exists | `tools/validate_spec.py` (hook_rule/hook_break), `tools/qa_episode.py` | S |
| R-STORY-02 | Act I ≈ 0:04–0:25: three concrete consequences | partial | `seasoncheck.js` beats B1–B9 (old format); no micro_examples field | spec schema `micro_examples[3]`, QA beat timing | S |
| R-STORY-03 | Act II: intimate anchor + visible ticking counter | partial | Toy House clock rule ("clock in frame on time words", `plancheck5.timeMentions`) | spec `anchor`, `counter`; QA counter sightings | M |
| R-STORY-04 | Act III: logical fix fails and reveals the inverted premise | missing | `twist` field in seasoncheck only | spec `false_solution`, `inversion` | S |
| R-STORY-05 | Act IV: bittersweet payoff; final line echoes line 1; hard cut | partial | Toy House ends on a crane, then holds 1.07 s | spec `payoff_type`, `loop_line_echo`; QA end rule | S |
| R-STORY-06 | Premise = ≥ 2 unrelated sources + ≥ 1 core element twisted | partial | SEASON_1 §2b (prose rule, owner check) | `tools/validate_spec.py` (`sources ≥ 2`, `what_was_transformed`) | S |
| R-STORY-07 | A Volze premise may be a source; its rule, twist and setting cannot all survive | partial | §2b prose | validator: source `kind: volze` requires transformed ∈ {rule, twist, setting} | S |
| R-STORY-08 | Never reuse another creator's twist; renamed plot = copy | partial | §2b prose (owner judgement) | ledger fields; can only be checked by the owner | S |
| R-STORY-09 | Sources: PD tales freely; modern films/books only the "what if" | missing | — | `STORY_ENGINE.md`, validator source `kind` enum | S |

### 1b Brand
| ID | Rule | Status | Evidence today | Files that will change | Effort |
|---|---|---|---|---|---|
| R-BRAND-01 | Third person; first 2 words "In this town/world…" | partial | `egg` opens "In this town"; **Toy House opens "Once a year" and has 13 first-person sentences** (V4 D1 made it first person) | QA check on `cues.json` words 1–3; `docs/season1/V4.md` D1 marked superseded | S |
| R-BRAND-02 | Recurring R6 hero in every episode | exists | `cast/hero.json` slot HERO (v5, faces v5) | note in hero.json ("first-person narrator" → third) | S |
| R-BRAND-03 | Hero's signature prop + signature colour in the first 3 s | partial | Colour yes (bare yellow head #FFD542, charcoal jacket, blue strip); **no signature prop exists**; no first-3-s check | `parts/props.js` or `parts/sets4/props*.js` (prop), QA (`hero_in_first_3s`) | M |
| R-BRAND-04 | Realism contrast: photographic world, clean blocky R6 | partial | Phase R/R2 CC0 loader works; lit CC0 = 9.6–13.3 s/frame, contrast 0.008–0.22 (fails) | Phase 5 | L |
| R-BRAND-05 | Roblox-native twists, readable as general fiction | partial | Season 1 cards use game rules | spec field `roblox_context_starts_at_s ≥ 5` | S |
| R-BRAND-06 | Own caption accent + one rounded heavy font (not white/#FFD700) | partial | Font Lilita One ✓; **accent #FFD542 is Volze's yellow in effect** (ΔE small vs #FFD700) | `captions/pop-shorts-*.json`, Phase 6 | S |
| R-BRAND-07 | `series.yml` with season/episode numbers | missing | `SERIES_LOG.md`, `docs/season1/STATE.md` only | new `series.yml` | S |

### 1c Algorithm and policy
| ID | Rule | Status | Evidence today | Files that will change | Effort |
|---|---|---|---|---|---|
| R-ALGO-01 | Design against swipe-away in the first 1–3 s | partial | plancheck5 "first second: motion + reveal" | folded into R-HOOK-03/04 | S |
| R-ALGO-02 | Targets: viewed ≥ 70 %, APV ≥ 70 % (elite 80 %) | missing | no postmortem data in repo | `docs/postmortems/TEMPLATE.md` (Phase 7) | S |
| R-ALGO-03 | Length is earned, not maximised | missing | format v5 fixed 75–90 s | `docs/LENGTH_TIER.md` | S |
| R-ALGO-04 | Variety across hook type, setting, anchor, counter, twist, ending (no templated storylines) | partial | SEASON_1 §4 lanes + rotation | `docs/VARIETY_MATRIX.md` generator | M |
| R-ALGO-05 | Sad allowed, never gratuitously distressing (teen/general) | partial | STORY_BIBLE tone notes | `STORY_ENGINE.md`; owner check | S |

### 1d View jails
| ID | Rule | Status | Evidence today (Toy House) | Files that will change | Effort |
|---|---|---|---|---|---|
| R-HOOK-01 | Effort is irrelevant; only hook + retention graph count | missing (process) | — | RULES_CARD, postmortem | S |
| R-HOOK-02 | First 5 s understandable without Roblox; Roblox context ≥ 5 s | missing | — | spec field + validator | S |
| R-HOOK-03 | Frame 1 = motion + the rule's visual; no greeting, static establishing shot or intro | partial | plancheck5 checks motion + `reveal` in the first second ✓ (T01 push, reveal) | QA re-uses it | S |
| R-HOOK-04 | VO starts ≤ 0.3 s | missing check | 0.00 s ✓ | QA | S |
| R-MID-01 | New info/escalation every ≤ 6 s | missing | no beat data with types | spec beats + QA | M |
| R-MID-02 | Counter visibly advances in Act II (≥ 3 sightings) | partial | clock rule on time words only | QA (`see` contains counter id) | S |
| R-MID-03 | Reversal at 55–75 % of runtime | missing | — | spec `reversal_at_s` / shot flag + QA | S |
| R-LEAK-01 | No dead air > 0.4 s | missing | **15 VO gaps > 0.4 s** (4.09 s 0.46, 6.86 s 0.55, 9.44 s 0.68 …) | QA; see conflict C1 | S |
| R-LEAK-02 | No shot > 2.5 s without camera motion or a cut | partial | plancheck5 static ≤ 2.5 ✓, moving ≤ 3.5; 6 shots > 2.5 s (T34 3.10, T53 3.45) are moving, so they pass this rule | QA | S |
| R-LEAK-03 | Postmortem against the retention graph every episode | missing | — | `docs/postmortems/` | S |
| R-END-01 | Video ends ≤ 0.3 s after the last word; no hold | **violated** | assemble `V5_HOLD = 0.85`; Toy House end − last word = **1.07 s** | `scripts/v2/assemble.py` (new opt-in `endPad`), QA | S |
| R-END-02 | No outro signals (thanks, subscribe, part 2, end card, logo, fade-to-black) | partial | no outros exist; `fadeColor` effect exists unchecked | QA (caption text + effects scan) | S |

### 1e Length
| ID | Rule | Status | Evidence | Files | Effort |
|---|---|---|---|---|---|
| R-LEN-01 | Default 60–105 s | **conflict** | plancheck5 75–90 s (owner format v5) | `LENGTH_TIER.md`, QA tier lookup | S |
| R-LEN-02 | 106–165 s only after 3 consecutive APV ≥ 70 % + enough beats | missing | — | `LENGTH_TIER.md` + postmortem | S |
| R-LEN-03 | Hard cap 175 s | partial | older formats cap 168 s | QA | S |

### 1f Cinema grammar
| ID | Rule | Status | Evidence (Toy House) | Files | Effort |
|---|---|---|---|---|---|
| R-CUT-01 | Avg cut/camera event 1.5–2.2 s, from VO word timestamps | partial | avg **1.54 s** ✓; plancheck5 band is 1.2–2.2; cuts on words (`cutTol` 2 frames) ✓ | QA band; planner (Phase 4) | M |
| R-CUT-02 | Nearly every VO clause gets its own visual beat | missing | hand-made per episode | cut planner | M |
| R-CAM-01 | Zero locked-off shots | partial | every shot moves (push default 5.5 %) ✓; `static-drift` move still allowed | QA rejects `static-drift`/`static: true` | S |
| R-CAM-02 | Macro/wide alternation: two wides or two macros in a row at most twice | missing | **11 adjacent wide-wide / insert-insert pairs** | QA, planner | S |
| R-CAM-03 | Whip on clues, snap on reveals, slow push on emotion | partial | moves exist; no shot-intent link | planner presets by beat type | M |
| R-LENS-01 | Lenses: 18–24 mm wide, 35 mm action, 85 mm+ shallow DOF emotion | partial | raw vertical fov per shot; **no DOF in the renderer** | `engine/camera.js` lens presets (mm → fov), DOF in Phase 5 | M/L |
| R-SIGN-01 | 3–6 diegetic signs, ≤ 3 words, readable in ≤ 1 s on a phone | partial | `textPlate`, Toy House zone signs (KARTS, BLASTER ARENA…), ruleui min cap 3 %; no count/size check | sign helper + QA | M |
| R-ANIM-01 | Crisp key poses, snaps, freezes, instant face swaps; FX tweened | exists | `poses.js` snap poses (2 frames), shot `freeze`, faces v5 swaps, `effects.js` | — | — |
| R-HERO-01 | Exactly 3 hero shots (frame 1, reversal, final loop frame) | missing | seasoncheck `moneyShot` only | spec `hero_shots[3]`, QA | S |
| R-LOOP-01 | Final frame composition leads into frame 1 | missing | — | loop helper (Phase 4) + QA (camera/pose distance) | M |
| R-JOLT-01 | One quick, subtle shake at 0:00 only, never at scene starts | partial | `OPEN_HIT` exists (frame 0, 8 frames); **Toy House uses no `openHit` → no jolt**; `shake` effect can be placed anywhere | QA (openHit on shot 1 only, no `shake` at cuts) | S |

### 1g Reference look
| ID | Rule | Status | Evidence | Files | Effort |
|---|---|---|---|---|---|
| R-LOOK-01 | Photoreal PBR worlds at real building scale, characters small | partial | Phase R `parts/location.js` + CC0 (works, 3–20× over frame budget) | Phase 5 | L |
| R-LOOK-02 | 5 mood presets with key light + colour temperature per act | partial | many per-set looks; not the 5 moods | `looks4.json` (data) + `docs/bible/LOOK.md` | M |
| R-LOOK-03 | Chunky R6, matte/satin, small outfit details | exists | body5 satin, `regions` (lapel, strip) | — | — |
| R-LOOK-04 | Crowds of 6–20 R6s in most shots | partial | `spec.crowds` ≤ 60 instanced; not checked per shot | QA (warning only) | S |
| R-LOOK-05 | Low angle, wide lens, close; foreground limb; Dutch tilts; motion blur on whips; shallow DOF on emotion | partial | heroLow/lowAuthority ✓, roll in sampleCamera, 2-sub-frame blur ✓; no foreground-limb preset, no DOF | camera presets (Phase 4), DOF (Phase 5) | M |
| R-LOOK-06 | Cute-creepy creatures rendered more realistically | partial | dragon (≤ 4k), landform rig | none until an episode needs one | — |
| R-CAP-01 | 1 word (max 2) at a time, rounded heavy, black outline, clear of Shorts UI | partial | v3/v5 groups **1–3 words**, band 58–74 %, Lilita One + outline | new caption style (Phase 6) | M |
| R-CAP-02 | Captions on VO word timestamps ± 1 frame | partial | built from `cues.json` word starts; no ± 1 frame test | test in Phase 6 | S |
| R-CAP-03 | Brand accent on stressed words | partial | `*word*` keywords in script.txt → yellow | colour choice Phase 6 | S |
| R-LABEL-01 | No name tags/labels on characters; diegetic signs OK | exists | `engine/nolabels.js` (`labels: false` / season 1), `noLabels` gate in `v2:plan` | make it the default for every new spec | S |

### §2 workflow and token rules
| ID | Rule | Status | Evidence | Files | Effort |
|---|---|---|---|---|---|
| R-FLOW-01 | Passes: set → blocking → sequences → final, with an owner gate at each | partial | E1 (animatic gate) → E2 (final) in `/new-episode`; no set or sequence passes | `CLAUDE.md`, new command doc | S |
| R-FLOW-02 | Sessions read `RULES_CARD.md` + `episodes/EPxx/spec.yml` + `HANDOFF.md` only | missing | CLAUDE.md sends sessions to V2_BRIEF §0–3 + PROGRESS.md (2,346 lines between them) | `CLAUDE.md` | S |
| R-FLOW-03 | Visual checks only via contact sheets with shot numbers | exists | `sheet.py`, rule "never open single frames" | `tools/contact_sheet.py` (`--shots`) | S |
| R-FLOW-04 | Re-render only changed shots | exists | per-shot hash cache in `render.js` | — | — |
| R-FLOW-05 | `HANDOFF.md` ≤ 30 lines at session end | missing | PROGRESS.md entries ≤ 40 lines | `episodes/EPxx/HANDOFF.md` | S |
| R-FLOW-06 | Final render refuses on any QA FAIL; override only `--allow RULE_ID`, logged | partial | `v2:plan` and `v2:qc` gate the farm; no rule-ID override log | `render.yml` + `scripts/v2/render.js --final` | S |

## 3. Non-negotiables the current code or docs violate

1. **Third person** (§0): `docs/season1/V4.md` D1 says "first person for the hero"; `cast/hero.json` note says "first-person narrator"; Toy House narration is first person (13 sentences). The code doesn't enforce first person; the docs do. Fix: mark D1 superseded and add the check R-BRAND-01. The script itself is never touched.
2. **I never write narration**: `docs/season1/SEASON_1.md` §5b "How the remaining scripts are written (by Claude Code, from the card)" and the 30 invented story cards. Both contradict "You never write narration" and "You don't invent stories". Fix: mark §5b and the slate superseded (kept as history, not deleted). `/new-episode` already forbids editing scripts ✓.
3. **SFX default off**: `assemble.py --spec` auto-places sfx unless the spec says `"sfx": false` (default **on**). Fix: default off, `sfx: on` opt-in.
4. **No BGM**: `assemble.py` mixes `stories/<slug>/music.mp3` if the file exists. Nothing generates music, so this isn't a violation today, but it should become an explicit flag (default off).
5. **Every episode a new world**: `docs/season1/V4.md` D4 "a reusable library of locations; each episode re-dresses them"; card 30 `afk` "reuse a shot from each of five earlier episodes". Fix: D4 superseded. Builders and modules stay (tooling); a location layout may not be reused, and the variety matrix tracks it.
6. **Opening jolt at 0:00**: present as `openHit`, but the latest episode doesn't use it and nothing checks that it isn't used elsewhere.
7. **Captions not Volze-like**: keywords in #FFD542 (≈ #FFD700); the hero's skin is the same #FFD542.
8. **Faces**: faces v5 (48-cell sheet) is the default, but `faceStyle` v2/v3/v4 remain selectable per spec. Fix: QA fails any `faceStyle` ≠ v5 on new specs (legacy code stays, frozen).
9. **No licence, no charges**: compliant (no LICENSE, no LFS, standard runners, 1-day artifacts). **But** farm run 44430704419 (assets.yml) didn't start: GitHub annotation "recent account payments have failed or your spending limit needs to be increased". GitHub blocks every Actions run, even free public-repo minutes, while an account payment is failing. The owner has to clear it in GitHub billing settings; no paid feature is needed.
10. **No bacon hair; modest hourglass; age builds**: compliant (hair v4 list has no bacon style; `adult_f` subtle hourglass; `youth`, `elder_f`).

## 4. Conflicts and impossibilities (decisions needed; I won't change anything silently)

- **C1 Dead air vs untouched voice.** R-LEAK-01 (no silence > 0.4 s) can't be met by the edit: the VO is never trimmed (V4 D3), and Toy House's VO has 15 pauses > 0.4 s. Proposal: QA reports each gap with its timestamp as a **VO** finding (fix = regenerate the VO line), and as a picture FAIL only if there is no cut or camera event inside the gap.
- **C2 Final resolution.** Prompt: final 1080×1920. Standing owner decision A2: native 1440×2560 master + 1080 proxy. Proposal: keep 1440 master (sharper after YouTube re-encode) unless the owner says 1080; the tier table reports both.
- **C3 Phase 5 effects vs the frame budget.** V4 session rules ban bloom passes, volumetric fog and real-time AO; the budget is 0.69 s/frame. Phase R2 measured lit CC0 at 9–13 s/frame on the farm. Full DOF + bloom + volumetrics at final will not fit the old budget. Proposal for Phase 5: bloom and DOF as FFmpeg/2D post passes driven by per-frame depth (cheap), height fog instead of volumetric, baked AO. Report the real s/frame per tier and keep the whole render inside free Actions limits (6 h per job, 20 concurrent jobs for public repos).
- **C4 Length.** Format v5 75–90 s vs default 60–105 s. Proposal: new `format: 6` rule set in QA; v5 stays for old specs.
- **C5 Captions.** v3/v5 group 1–3 words; the new rule is max 2. The band is 58–74 %; the safe zone is to be defined in Phase 6.
- **C6 File layout.** Prompt: `episodes/EPxx/spec.yml`, `tools/*.py`. Repo: `stories/<slug>/`, `scripts/v2/`. Moving the frozen paths isn't allowed. Proposal: `episodes/EPxx/{spec.yml, HANDOFF.md, qa/}` with a `slug:` field pointing at `stories/<slug>/` (engine data, voice, cues). New tools go in `tools/`, existing scripts stay in `scripts/v2/`.
- **C7 Session rules in CLAUDE.md.** It names branch `claude/engine-v2` and points at V2_BRIEF + PROGRESS.md; this session's branch is `claude/blox-story-retention-engine-2ey3ot`. Phase 1 rewrites the session section; the frozen-file ground rules stay.
- **C8 YAML.** PyYAML 6.0.3 is present here; the GitHub ubuntu runner image normally has it too (to be confirmed on the first farm run). No new dependency; the validator exits with a clear message if it is missing.
- **C9 Cut planner input.** "Stressed words" aren't in `cues.json`. Proposal: stress = the owner's `*word*` marks in `script.txt` (already parsed for captions) plus the beats prompt; no prosody model.
- **C10 Opening jolt vs "first frame has motion".** Both hold together: openHit at frame 0 (8 frames, punch 7 %, amp .05) plus a camera move on shot 1.

## 5. Toy House against the new rules (preview of Phase 3)
Avg shot 1.54 s ✓ · max moving shot 3.45 s (T53) · VO start 0.00 s ✓ · first 18 words end 5.28 s (hook ≤ 5 s ✗) · opener "Once a year" ✗ · first-person sentences 13 ✗ · end − last word 1.07 s ✗ (≤ 0.3) · 15 VO gaps > 0.4 s ✗ (C1) · wide/insert same-type adjacent pairs 11 ✗ (≤ 2) · opening jolt absent ✗ · labels off ✓.
