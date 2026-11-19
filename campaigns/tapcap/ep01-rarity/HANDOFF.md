# HANDOFF — TapCap EP01 "Rarity's Just Paint"  (≤ 30 lines; read with ../RULES.md, spec.yml, shots.yml)
## Done (2026-11-19, Setup + Pass A) — NOT approved yet
- Setup: folders, `.gitignore` (refs/, vo/*, review/ never committed), `../RULES.md` (7 hard rules + TC-01…TC-07), linter hook:
  `scripts/v2/plan.js` loads RULES.md for any spec under campaigns/tapcap/ (`engine/tapcap.js`, tests `tests/v2/tapcap.test.js`).
- Master asset `../assets/slimeguy` (one parametric model, 9 colours + demo, 3 paints, 5 faces, tap); Clix `../assets/clix` (bust, 3 hand poses).
- Gate: `node campaigns/tapcap/scripts/pass-a.js` → `qa/proportions.json` (TC-02 PASS: head 32.5 · torso 29.3 · switch 3.8 · base 34.3 %)
  + `review/pass-a/pass-a-sheet.png` (gitignored; sent directly).
## Approved
- nothing yet
## Open notes
- REFS + VO MISSING: no side-by-side, no ref-based measurement, aligner not run. Re-run pass-a.js after the drop (sheet picks refs up).
- Head 33 % is measured as the visible band incl. the drip skirt (row majority, front ortho). Confirm against the ref.
- Tap: at the full 4 % press the keycap covers the switch completely (measured 0 %). Physically right; say if the sponsor wants a sliver (3 %).
- Clix bust from primitives is toy-like, not Pixar quality. Needs a sculpted GLB or a decision (see review).
- §3 says full Clix reveal S36–S37 only, but the table puts a Clix close-up in S38 and S37 is two click macros. Which is right?
- TC-06 vs "no locked-off shots": S1 pushes in. Proposal: S40 replays S1's move; final frame of S40 = final frame of S1.
- `pop-shorts-v6` does not exist (latest v5): Pass C adds v6 = v5 + accent #B98CFF.
- No mechanical click in the sfx set and *.wav is gitignored: Pass C synthesizes `click` in scripts/v2/sfx.py.
- fps 24 assumed (repo format v5). Tap 3/2/4 frames at 24 fps.
## Next step
- Owner: drop refs + VO, answer the open notes, then "approve" or notes on Pass A. Then Pass B (world + lighting, 6-still sheet).
