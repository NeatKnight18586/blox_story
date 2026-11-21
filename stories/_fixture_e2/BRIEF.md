# EPISODE BRIEF: _fixture_e2 (E2 fixture: synthetic cues, no voice; every story marker once, in the episode order)

## META
- slug: _fixture_e2
- title: In this world, every fall drains your colour 😢 #shorts #roblox
- pinned comment: Did you find the loophole before me?
- comment question: Would you jump for her?
- length target: 24 (fixture)

## PREMISE
- feeling: hope
- rule line: "In this world, every fall drains a dummy's colour"
- hero weakness: clumsy
- loved one: Bitsy · LITTLE
- loophole: a caught fall is not a fall
- clue plants: 1.4 · 12.8
- twist line: I caught her before she fell
- last line: Colour came back to everyone

## CAST
- HERO (fixed, `cast/hero6.json`): outfit unchanged · at 2 0
- bitsy → LITTLE · costume BITSY · at 0 34
- dummyA → DUMMY · at 7 2 · yaw -30
- dummyB → DUMMY · at -6 -4 · yaw 20

## WORLD
- setting: an open test park
- locations: testPark
- props: giantFan, launchTower, spawnPad, pool, giantHand, nameTag
- palette: white dummies, the hero's colours draining, pastel blooms
- COLOUR SCRIPT: act 1 · bright · act 2 · white · act 3 · pastel bloom

## BEATS
Coordinates: CAST / place are plaza-relative (plaza anchor (0, 0.15, 8)); `cam:` is world coordinates.

| # | cue start–end (s) | VO words | mood | size | move | subject | action verb | expression + word it lands on | effect | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 0.0–1.4 | Every fall here drains colour | fun | wide | orbit | hero | - | - | none | crowd: dummies 40 wander; loopOpen: colour; cam: 14 10 40 at 2 2 14 |
| 2 | 1.4–2.8 | Then Bitsy spawned in pink | fun | medium | orbit | bitsy | - | - | none | spawn: bitsy @ spawned; cam: 3.6 3.2 49.5 at 0 2 42 |
| 3 | 2.8–3.7 | Everyone knows her name | comedy | medium | static-drift | bitsy | - | - | none | tag: bitsy "Bitsy"; cam: 3 3 49 at 0 2.4 42 |
| 4 | 3.7–5.2 | The wind threw me far away | comedy | wide | whip | hero | - | - | none | tumble: hero to pool @ threw; cam: 2 8 36 at 10 3 13 |
| 5 | 5.2–6.1 | Right into the pool | comedy | medium | static-drift | hero | - | - | none | splash: big @ into; cam: 20 4.2 25.5 at 24 1.2 18.4 |
| 6 | 6.1–7.9 | My legs went white then my stripe | tension | medium | push | hero | - | - | none | drain: hero legs @ legs; drain: hero stripe @ stripe; cam: 24.5 4.2 30 at 24 2.6 18 |
| 7 | 7.9–8.8 | Then a hand came down | comedy | wide | static-drift | bitsy | - | - | none | hand: enter @ Then; cam: 9 3 60 at 0 9 42; fov: 60 |
| 8 | 8.8–9.8 | It pinched my Bitsy | comedy | medium | whip | bitsy | - | - | none | hand: grab bitsy @ pinched; cam: 11 7 60 at 0 7 42 |
| 9 | 9.8–11.2 | and carried her up the tower | fun | wide | orbit | bitsy | - | - | none | hand: carry bitsy to towerTop @ carried; cam: 22 16 52 at -8 14 12; fov: 60 |
| 10 | 11.2–12.8 | It let go right at the top | tension | wide | static-drift | bitsy | - | - | none | hand: release bitsy @ go; hand: exit @ top; cam: -4 45 8 at -30 41 -22 |
| 11 | 12.8–15.4 | She fell and I jumped up to catch her in the air | awe | wide | crane | hero | - | - | none | twist; place: hero -30 -38 yaw 180; airCatch: hero bitsy @ catch; cam: -12 8 -36 at -29 9 -31; fov: 72 |
| 12 | 15.4–16.8 | Every dummy ran to help | fun | wide | orbit | hero | - | - | none | crowd: dummies 40 run to towerBase @ ran; cam: 8 15 22 at -16 1 -16 |
| 13 | 16.8–17.8 | They piled up soft | comedy | wide | static-drift | hero | - | - | none | crowd: dummies 40 pile at cushion @ piled; cam: 4 22 8 at -12 0 -20 |
| 14 | 17.8–19.2 | and colour bloomed on all of them | fun | wide | orbit | hero | - | - | none | bloom: crowd random @ bloomed; cam: 2 16 4 at -12 1 -20; fov: 60 |
| 15 | 19.2–20.8 | Even my own colour came back | payoff | close | push | hero | - | smile @ back | none | payoff; bloom: hero all @ colour; cam: -27.6 4.6 -35.6 at -30 4.3 -31.1 |
| 16 | 20.8–21.8 | The dummies flopped down | comedy | wide | static-drift | hero | - | - | none | crowd: dummies 40 flop @ flopped; cam: 4 14 6 at -12 1 -20 |
| 17 | 21.8–24.0 | Colour came back to everyone at last | emotion | close | splitScreen | hero | - | - | none | loopClose: colour; cam: -28.4 4.6 -37 at -30 4.3 -31.1; camb: -33.6 4 -36 at -31.6 3.4 -31.1 |

## PAYOFF SHOT
- shows: the hero's colour blooms back while he holds Bitsy
- hold length: 1.6
- light: payoff key

## CHECKS
- [x] hero on screen by 0:05
