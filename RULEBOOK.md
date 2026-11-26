# RULEBOOK — the one doc every session reads (owner reset, 2026-11-25)
Where an older doc (now in docs/archive/) conflicts, this list wins. Read this, then only the files your prompt names.

## 0. Session habits
- One phase per session; report ≤ 20 lines (numbers + PASS/FAIL + 5 weakest items), then STOP.
- Find code via CODEMAP.md + grep -n; never explore the repo; never read evidence/; look only at contact sheets ≤ 1600 px.
- Reuse before build (docs/LIBRARY.md); every new reusable piece gets one LIBRARY.md line the same session.
- Episode sessions never touch engine code (npm run ep:check must pass). Engine work only in an owner-approved ENGINE slot (max one per week, only when an episode needs it).
- Never promise a feature the engine lacks: verify with a 1-frame-per-shot smoke render before building on it.
- A measured check that fails after two fix passes: stop and report the number; never loosen it.
- Scripts, picture locks and story decisions are made by the owner in chat. Claude Code never writes or edits script.txt, PICTURE_LOCK.md or BRIEF.md content.

## 1. Production loop (target: 5 episodes/week, ≤ 3 Claude Code sessions each, Sonnet unless the prompt names Opus)
- Chat: idea → questions → script + PICTURE LOCK (one row per sentence: MUST SEE, sync word, camera template, location) → owner voices it in ElevenLabs.
- Session 1 PREVIS: 1-frame-per-row vo-sheet with existing assets; fix staging until every row shows its MUST SEE. No look/world polish.
- Session 2 ANIMATIC: stability + read + plan gates, 270×480 animatic, phone sheet.
- Session 3 FINAL: farm render + v2:qc PASS + DELIVERY.md.

## 2. World
- One permanent ISLAND with districts (Downtown + Governor's Hall, School + homes, Harbor + beach, Wild edge) and meme-worthy landmarks. Laid out once; each district is detailed the first time an episode needs it, then reused and redressed forever.
- Every world/town built for an episode is saved as a reusable set (parts/locations/ + one LIBRARY.md line).
- The city: parts/city/ (plan.json is the source of truth).
- Some episodes leave a permanent mark on the town; record it in docs/CONTINUITY.md and apply it as a world flag.
- Look = Roblox Studio: crisp, bright, saturated plastic; CC0 kitbash (Poly Haven etc. via the farm) for textures, skies, rocks, trees, props; Claude places and arranges, never hand-models what a CC0 asset can supply. No film grain, haze near camera or moody grade. Depth blur only on close-up inserts.
- Crowds: posed or looping instanced crowds may be large (hundreds); only acting characters are costly.

## 3. Cast
- Recurring hero (cast/hero.json): current look and flaw, adult-sized, first-person narrator. The GOVERNOR: recurring comic rule-maker (design pending). Rigid classic R6, characters on twos at 24 fps, no name tags or labels ever.
- STILL WORLD, MOVING CAMERA: characters mostly posed; acting only for the hero and the Governor at key beats.

## 4. Story + hook
- Every rule has a CLOCK: a recurring visible event every 2–4 s (fast clock) or an episode-level cycle/counter (slow clock).
- Hook: world-first montage of the rule's consequences (one shot per spoken noun); the hero on screen by 0:10; the established pattern is BROKEN within the first 12 s. Hook formulas rotate (owner reviews each).
- The rule object stays visible across shots and sits in a fixed screen zone (anchor lock).
- One "watched" shot per episode (rule object or a character looks into the lens). 1–2 readable in-world signs / a 0.3 s flashed detail as rewind bait.
- Ending: cut on the twist (end ≈ 0.5 s after the last word), final shot a close-up or two-shot. An open mystery is optional, never default.
- Every episode ships a pinned self-question; a dilemma choice only when the owner picks it.
- Length A/B: SHORT 60–75 s vs LONG 85–100 s (alternate for the next 6 episodes, then decide from data).

## 5. Camera
- Shots use named templates only (engine/camtpl.js), chosen by what the sentence does: rule → establish/insert; feeling → mcu/cu; action → wide/track; reveal/twist → snap or crashZoom to cu; dialogue → ots/two. The noun being spoken is the biggest thing in frame. Default people angle: low worm's-eye, slow push.
- One authored WOW shot per episode, picked from 2–3 rendered candidates. Never hand-typed coordinates.
- Cut mid-motion (motion blur on whips/snaps).

## 6. Pace (measured)
- Novelty event every ≤ 1.0 s in the hook (0–12 s) and ≤ 1.5 s after: FAIL. Emotion/awe shots ≤ 3.0 s.
- Voice gaps > 0.4 s: WARN (caught at script stage).
- Captions: ONE word at a time, bold yellow with thick black outline, fixed lower-centre zone.

## 7. Brand + safety
- Never show the Roblox logo/wordmark or imply official. Family-safe (no gore, no on-screen death, no romance, no real brands). Steal methods, never another creator's rule, names, images or twists.
- Banned rules (already used in the niche): battery percentage, no frowning, never step on the ground, giant mouth, never go outside, luck number, Simon says, five-second floor, hide from the Seeker, crying turns you into your pet, photo day.
- Borrow the engine of a famous story, never its characters, names, imagery or beats. Monsters are scared off, bonked or out-thought, never killed.
- A new episode differs from the previous three in ≥ 5 of 8 SERIES_LOG.md columns (setting, rule type, hook form, twist type, ending type, palette, landmark, ground plan).

## 8. Measure
- Log 48 h numbers per episode in docs/RESULTS.md: views, stayed %, avg % viewed, ret@0:10, ret@end, shares/1k, subs/1k, length variant.

## 9. Commands (only ones that exist; npm run … from the repo root)
- `codemap` → CODEMAP.md (regenerate after adding files) · `test` (node-only, must stay green) · `v2:test` (pure-logic) · `v2:preflight`.
- `ep -- --story <slug> --stage <align|spec|plan|animatic|final>`: chains a stage's commands, logs to stories/<slug>/logs/, ≤ 20 lines, stops at the first FAIL.
- `ep:check -- --story <slug>`: engine freeze; diff vs stories/<slug>/BASE (first commit writes BASE) may touch only stories/<slug>/, beasts/*.json, parts/locations/*.json, cast/*.json.
- `v2:align -- --story <slug>` (voice → build/cues.json; copy to stories/<slug>/cues.json) · `v2:plan -- --story <slug>` (§5.2 gate, exit 1 on error).
- `v2:bench -- --story <slug>`: tris and s/frame per shot (PASS ≤ 90k tris, ≤ 0.62 s/frame for Season 1 worlds).
- `v2:read -- --story <slug>`: readability checks on rendered frames → review/<slug>/read.json.
- `v2:stability -- --story <slug>` (or --spec): camera-nudge flicker gate (4 mm, ≤ 0.30 %); must pass before any animatic/final is shown.
- `v2:render -- --spec <episode.json> --out <dir> [--final | --width 270 --height 480 --every 2 --aa 0]`; farm: .github/workflows/render.yml (dispatch, or stories/<slug>/render.request).
- `python3 scripts/v2/sheet.py <frames dir|video> [--frames a,b] [--labels shots.json] [--stats]`: contact sheets.
- `python3 scripts/v2/captions.py --story <slug> --spec <episode.json> --out <file.ass>` · `python3 scripts/v2/assemble.py --story <slug> --frames <dir> --captions <ass> --out <master.mp4> [--proxy …] [--animatic]`.
- `v2:qc -- --story <slug> --video <master>`: final gate (loudness, SSIM/PSNR, sharpness) → review/<slug>/qc.json; must pass before a final reaches the owner.
- `python3 scripts/v2/scriptcheck.py --story <slug>`: script checks, reported to the owner, never fixed by rewriting.
- Brief → spec: `node scripts/v2/brief2spec.js` (reads stories/<slug>/BRIEF.md + cues.json). Masters and stories/*/build/ never go in git.
- Format 7 (opt-in, default stays 6): Brief `SPEC FLAGS: format: 7, lengthVariant: short|long`; end = voice + 0.5 s; max end 77 s (short) / 102 s (long); hero on screen by 10.0 s; final shot not wide / not pull.
- lengthVariant: short = 60–75 s, long = 85–100 s. `python3 scripts/v2/scriptcheck.py --story <slug> --variant short|long`: short 200–250 words, long 280–330.
- Format 7 pace (plancheck6): dead-stretch window 1.0 s before 12.0 s, 1.5 s after (emotion/awe 3.0 s); voiceGap WARN for any silence > 0.4 s between words.
- Captions `pop-shorts-v7` (default for format 7): one word at a time, #FFE135, outline 20, fixed y 1250; check `python3 scripts/v2/caption-phone.py --style v7`.
