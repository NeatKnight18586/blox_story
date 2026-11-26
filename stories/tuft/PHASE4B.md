
## tuft (E5) Phase 4B — STAGING: BLOCKED before part A (Sonnet 5.5)
Done: BASE = af8a2c5 (commit 1ba2399, ep:check PASS). Scratch tools only (outside the repo): per-shot contact sheet, actor-position dump.
Blocker (engine, frozen, not touched): with `moods: true` (brief2spec hard-codes it) + beasts + `post: 'cine'`, every beast material fails to compile:
"THREE.WebGLProgram … ERROR: 0:69: 'uMoodSat'" — engine/episode.js:62 `inject` (mood6 onBeforeCompile wrapper) runs twice on a material that already chained
`prev = m.onBeforeCompile` (engine/cinelook.js:169, beastrt.js:32), so the uniform line is declared twice. Result: NO beast is drawn in any frame (Tuft, Nightfang, Volt … absent in the 0–31 s sheet; the hook shows a plaza, not an eye). With `moods:false` the same segment compiles clean (0 shader errors vs 5).
Engine ask: in `inject` add `|| sh.fragmentShader.includes('uniform float uMoodSat')` to the early return (1 line), or add `moods` to FLAG_KEYS so the Brief can set it. No staging was committed: placing cameras on beasts that cannot be seen would be guesswork.
Findings for the staging pass once unblocked: world = location `street` anchor + `place:` offset; cast defaults are E4 offsets (hero x −34 …); colossal Tuft is 63 studs tall (scale 67), kids 4.3; 61 shots render a 5 fps part in ≈45 s.
