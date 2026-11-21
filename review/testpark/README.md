# E1b — testPark fix pass (approval gate)

Stills (1080×1920): `stills/S1_drone` (sign at the north edge, readable) · `S2_fan` · `S3_tower` · `S4_loop` · `S5_ring_sign` · `S6_hand` (glove, pinch) ·
`S7_lineup` = `lineup.png` (front key, neutral faces). Sheets: `contact.png`, `phone-390.png`, `hand-390.png` (open · pinch · fist · point at 390 px).

## Gates (measured; numbers in the json files here)
| gate | number | result |
|---|---|---|
| DUMMY white, day light, torso (mask ∩ UpperTorso), hero tier / CROWD | lit luma 227.0 / 226.2 (≥ 205) · shadow 157.1 / 157.2 (≥ 150) · a* −0.02…−0.58, b* −0.08…−3.70 (≤ 4) | PASS (`white.jsonl`) |
| 120 DUMMY with distance LOD, 270×480 | mean 0.186 s/frame (≤ 0.25); B2 camera inside the crowd: 24 full-detail + 96 CROWD (cap holds) | PASS (`bench-120.json`) |
| glove silhouette against the sky, 390 px | all four in frame on sky; glove 16–34 luma below the sky behind it; ink outline | PASS (`hand-390.json`) |
| pinch gap (grip 0.75) | 0.67 studs = 15.6 px at 390 (closes to 0.07 at grip 1) | visible (`pinch-390.json`) |
| Bitsy body chroma, lineup | C* 58.3 vs kid 54.1, hero 16.2, DUMMY 0.8 | PASS (`lineup-chroma.json`) |
| sign letters in the drone still, 390 px | 17.3 / 17.0 px (≥ 12) | PASS (`sign-drone-390.json`) |
| stability, 3 paths | worst 0.102 % (≤ 0.30) | PASS |
| regression | Nobody 62/62, Touch Grass 20/20 byte-identical | PASS |
| npm test · v2:test | exit 0 · 243 node + 67 py | PASS |

White gate: first reading failed (lit b* +8.4 from the warm sun; shadow luma 147.2, a* −6.1 from the grass-green ground bounce).
Fix pass 1 was the park's own look (world LOOK `hemiGround` concrete grey #C9C9C6, `sunColor` #FFF9F0). The DUMMY material is as specified.

## Three weakest things (phone-390.png, hand-390.png)
1. The glove reads DARKER than the sky (luma 166–186 vs 190–204): from below it sits in its own shade, so the silhouette depends on the ink line; the ink covers only 18–43 % of the outline at 390.
2. The lineup KID's orange (C* 54) is close to Bitsy's pink (58): Bitsy only just wins the chroma gate; she is also the smallest figure and her face is tiny at 390.
3. S2 fan and S1 drone: the fan's dark base and ring fill the left foreground; the dummies in front of the fan still do not read as blown.
