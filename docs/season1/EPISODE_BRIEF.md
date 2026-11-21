# EPISODE BRIEF: the exact template Claude chat sends for every episode

Fill every field. Rules: [STORY_ENGINE.md](STORY_ENGINE.md). Brand: [BRAND.md](BRAND.md). Format: [FORMAT_V6.md](FORMAT_V6.md).

## META
- slug:
- title: (rule + one capitalised emotional word + one emoji + #shorts #roblox)
- pinned comment: (comment question + "Did you find the loophole before me?")
- comment question:
- length target: (s; script 300–400 words, hard max 125 s)

## PREMISE
- feeling:
- rule line: "In this world, …" (≤ 9 words after the comma)
- hero weakness: (the one flaw that also saves the day)
- loved one: name · troupe slot
- loophole: (the rule's exact wording that allows the rescue)
- clue plants: cue times, first (s) · second, slightly wider (s)
- twist line:
- last line: (≠ first line)

## CAST
- HERO (fixed, `cast/hero.json`): outfit unchanged
- <role> → troupe slot (LEAD | SECOND | LITTLE | RIVAL | ELDER) · outfit change
- (one line per role)

## WORLD
- setting:
- locations: (from the set library where possible)
- palette:
- COLOUR SCRIPT: act 1 · act 2 · act 3 (one colour/light mood each)

## BEATS
One row per shot.

| # | cue start–end (s) | VO words | mood | size | move | subject | action verb | expression + word it lands on | effect | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.0–0.0 | | fun\|comedy\|tension\|emotion\|awe\|payoff | wide\|medium\|close\|insert\|ecu | `engine/camera.js` MOVES name | | | | impact\|freeze\|crash\|none | |

## PAYOFF SHOT
- shows:
- hold length: (s)
- light:

## CHECKS
- [ ] hero on screen by 0:05
- [ ] loved one named and on screen by 0:40
- [ ] clue shown twice (second wider)
- [ ] final shot not wide
- [ ] last line ≠ first line

## Markers `brief2spec.js` reads (exact text; `node scripts/v2/brief2spec.js --story <slug>`)
- **VO words:** `*word*` marks an emphasised word → a check-c entry at the word's time in `cues.json`; the row's verb key (or, with no verb, the first word) lands on it.
- **mood:** `fun | comedy | tension | emotion | awe | payoff` (`engine/mood6.json`). **size:** `wide | medium | close | insert | ecu` (`ecu` = a close with `ecu: true`).
- **subject:** a CAST role (`hero`, `friend`), `a+b` for a two-shot (first = subject), or `prop:<name>` for an insert on a library prop.
- **action verb:** a verb of `engine/acting6.js` (`flinch`, `point`, …), or `role:verb`; `-` for none. **expression + word:** `face @ word`, several with `;` (`warm @ whole; cry @ honesty`); `face` alone lands on the cut.
- **effect:** `impact` (hit on the emphasised word) · `freeze` (4-frame hold there) · `crash` (needs `move` crashZoom) · `none`.
- **notes** (comma or `;` separated): `twist` (the fair twist shot) · `payoff` (mood must be payoff) · `gag 1` / `gag 2` / `gag 3` · `loopOpen: name` / `loopClose: name` · `cross` (the camera may cross the 180° line) · `blur` · `loc: <library location>`. Anything else stays a free note.
- Cue times snap to the nearest word onset in `cues.json` (≤ 0.5 s, else an error naming the row). Unknown mood / size / move / subject / verb / face / effect, a word not spoken in the row's cue range, or a location / prop not in the set library (`parts/sets4/anchors.json`, `parts/locations/*.json`, `parts/library6.json`) are errors; missing library items are listed, never invented.
- **blocking notes (P5):** `place: hero 0 3 yaw 0` · `place: kid 40 -40` (park an actor out of frame) · `cycle: sprint 0 1` · `stand: 40` · `aim: 2.7` · `aimx: 1.6` · `fit: .36` · `push: .9` · `look: storm`; CAST line `· at x z · yaw d`; verb column `hero:idle_alive; little:idle_alive` (i-th verb on i-th `*word*`); effect `crash+freeze`.
- **story markers (E2, `engine/story6.js`; opt-in: only a brief that uses one gets `spec.story6`):** in **notes**, `;`-separated. `@ word` = that word's onset in the row; without it a marker lands 0.15 s after the cut (+0.55 s per earlier unworded marker in the row).
  - `drain: <actor> <legs|shoes|stripe|jacket|hands|torso|all> @ <word>`: the region washes to the DUMMY white (#F2F2F4, roughness .85, lift .08) top to bottom over 6 frames, 8-particle grey dust puff. The hero's head never drains (row error); `all` keeps the hero's head, takes a dummy's head.
  - `bloom: <actor> <region|cheeks|nose|arms> [#rrggbb] @ <word>`: the reverse wash from the DUMMY white, bottom to top over 10 frames, soft glow ring; no colour = the actor's own colours back. `bloom: crowd random @ <word>`: every DUMMY in the shot's frame gets one seeded region + tint, staggered over 1.2 s outward from the hero; that shot shows the nearest 24 dummies at full detail.
  - `crowd: dummies <n> <wander | idle | limp | run to <anchor> | pile at <anchor> | flop> [at <anchor>]`: the first marker creates n ≤ 120 crowd dummies (`crowd001…`, costume CROWD, distance LOD ≤ 24 full detail within 18 studs); later markers change their behaviour. wander = slow walk, random turns · limp = sad_walk + 10° lean · run = sprint, arrive spread · pile = a soft 3-high mound of limp bodies (≤ 0.1 interpenetration; the rest stand round it cheering) · flop = knees_collapse, staggered 0–0.4 s (bodies already in a pile stay down).
  - `hand: enter | grab <actor> | carry <actor> to <anchor> | throw <actor> [to <anchor>] | release <actor> | exit`: the giant glove enters from above the clouds (1.0 s), grabs with the pinch (the actor hangs between thumb and index, legs kicking), carries on an arc, releases (fingers open over 4 frames; the actor drops onto the anchor), throws (a tumble arc), exits upward.
  - `tumble: <actor> [to <anchor>]`: an airborne arc (1.75 turns, limbs trail the torso by 0.25 s), dust puff on landing (none in the pool), lie 0.7 s, get up; the actor stays where it landed until its next mark.
  - `airCatch: <hero> <partner>`: the partner leaps off where she stands 1.3 s before the word, the hero jumps 0.6 s before it; on the word she snaps into the P3b carry on his chest (adds the `carry` verb; her ground mark = the carry's meeting mark), they fall together and land with a dust puff.
  - `splash: big @ <word> [at <anchor>]` (30 white-blue particles + a ripple ring; default anchor pool) · `tag: <actor> "<text>"` (nameTag, faces the camera). **Owner exception (Mark, E2b): diegetic in-world game tags are allowed in episode `lastcolor`, shots 14 and 29 only; the no-labels rule (SEASON_1.md §2c) holds everywhere else — brief2spec rejects `tag:` on any other row (engine test fixtures `_…` excepted).** · `spawn: <actor> @ <word>` (pad flash; the actor pops 0 → 1.1 → 1 over 6 frames, hidden before).
  - CAST: `- dummyA → DUMMY` (named full-detail dummies for close-ups, dummyA–E) · `- bitsy → LITTLE · costume BITSY`. Notes `cam: x y z at tx ty tz` (world camera; `fov:` for the lens) and, for `splitScreen` (an emotion move), `camb: …` for the second half.
- **E3 additions (opt-in):** notes `punch @ <word>` / `punch: <s>` (camera punch-in, 8 % over 6 frames, `engine/camera.js` PUNCH) · verb column `verb @ word` (that key lands on the word) · `push: k` with `cam:` (push/lowAuthority end at k of the distance) · `cam:` + drone → a 4-point path, `cam:` + tiltUp → tilts up to the cam target · `prop:<name>` naming a world object (library6 `worldObjects`) needs `cam:` · `hold:` reaches every fall verb in the row · `tag:` shows only inside its own shot.
