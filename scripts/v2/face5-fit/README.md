# Faces v5 fit (dev tool; needs numpy, scipy, scikit-image, Pillow — not part of `npm test`)
Fits vector primitives (segments, cubics, polylines, rings, D mouths, tapers, drops, hearts, stars) to the ink of
`docs/season1/refs/faces-v5/sheet.png` and writes the layout table `avatar-style/faces5-data.js` (CELLS5 + MEASURE5).
Run from the repo root with a work dir `W` (pickles go there): `python3 scripts/v2/face5-fit/run1.py W` (auto fit, ~3 min on 4 cores) →
`run2.py W` (specials) → `run3.py W` (domes, hearts, `>` `<`, zzz) → `run4.py W` (tongue, shades) → `gen.py W` (writes the data file).
Check with `node scripts/v2/face5-gates.js` (IoU ≥ 0.80 per cell, stroke ±10 %). The sheet is only read here and in the gate, never at runtime.
