# E1 — testPark world + cast (approval gate)

Stills (1080×1920): `stills/S1_drone` (plaza drone, 40 DUMMY) · `S2_fan` · `S3_tower` (base to top) · `S4_loop` (cart upside down at the loop top) ·
`S5_ring_sign` (ring, sign wall behind) · `S6_hand` (giantHand, pinch, over the plaza) · `S7_lineup` = `lineup.png` (HERO, Bitsy, kid, DUMMY).
Sheets: `contact.png` (all 7), `phone-390.png` (all 7 at phone width).

## Gates (measured)
| gate | number | result |
|---|---|---|
| v2:stability, 3 camera paths (drone over plaza, crane up the tower, track past ring + coaster), 9 views | worst 0.086 % (P3_ring:mid), limit 0.30 % | PASS (`stability-paths.json`) |
| 120 DUMMY, 270×480 | 0.202 s/frame (limit 0.25), 72k tris, 1.4k calls; crowd DUMMYs use costume CROWD (bg tier) | PASS (`bench-120.json`) |
| same, hero-tier DUMMY | 0.571 s/frame | not used for crowds (would FAIL) |
| sign text at 390 px (S5) | two lines, letters 19 px tall, text 196 px wide | measured PASS (`sign-390.json`); owner check |
| regression Nobody 62 / Touch Grass 20 frames, 270×480 | 62/62, 20/20 byte-identical vs HEAD before E1 | PASS |
| npm test · v2:test | exit 0 · 241 node + 67 py | PASS |
| determinism | 10-frame re-render of paths.json identical | PASS |

## Three weakest things in phone-390.png
1. **S6 giantHand**: from this angle the cuff reads as a cup or hat and the pinch does not read; palm and fingers clump into one white shape.
2. **S2 fan**: the ring is cropped on the right, and the five dummies in front look like they are standing, not blown; the dark base slab reads as a stripe on the floor.
3. **S7 lineup**: lit from behind, so faces sit on the shadow side; the DUMMY reads grey, not #E9E9EC white; Bitsy's face is small at 390.
Also: the tower's switchback stairs read as zigzag clutter; the spawn-pad flash column (S1) reads as a glass jar; the sign is not readable in the drone shot (only in the S5 ring shot).

Season 1 note: `nameTag` exists as a library prop but is a floating label: no Season 1 spec may show it (no labels, §2c); none of these stills use it.
