# S1 — BlockStory visual style candidate

**PASS for four stills; pending creative approval.** Authority: [STYLE_LOCK_BRIEF.md](stories/names100/STYLE_LOCK_BRIEF.md). [Four-panel board](evidence/names100-s1/style-board.png) · [approved baseline comparison](evidence/names100-s1/comparison.png) · [phone-size review](evidence/names100-s1/phone-board.png). No episode look is approved until user review.

| Scene | Palette / dominant fact |
| --- | --- |
| Town, g35 NEW | Muted cobalt `#10243a/#324b65`, amber practical `#ffb76e`; Eli's100-name allowance. Foreground Eli, middle home threshold, distant staggered facades. |
| Bedroom, g700 | Moonlit cyan `#172f43`, pale Mara and dark readable MARA letters; one warm lamp pool beside his notebook. Curtain/window provide depth, not clutter. |
| Reunion, g1370 | Apricot sky/key `#c5aa98/#ffc89c` against cool `#263b50` shadows; gold/green family and coral Mara at a purposeful doorway. |
| Forgotten, g1600 | Town stays warm, Eli retains his approved opaque blue-gray desaturation; foreground isolation and turned-away people carry the ending. |

**Form/materials:** preserve six broad block parts, oval head, pivots, cap/blue Eli, bob/tapered/coral Mara and existing sparse faces. Matte sets at roughness.92, restrained bevels, solid palette colors. No texture/bloom/lens/wardrobe stack. Character recipes remain unchanged.

**Light:** common key from(-3,9,5), warm dawn key with cool sky/ground fill; keep eyes readable. Night uses cobalt fill and isolated amber practicals. Fixed ACES exposure1. Mild distance fog gives depth without hiding the subject. No changing exposure to rescue individual faces. Mara's six shared-geometry depth helpers suppress internal back surfaces; visible ghost opacity remains.58 through889 and restoration890–926 stays intact.

**Composition:** fixed9:16 cameras, distinct foreground/middle/background, one dominant fact. S1 uses field of view46–54° and family-height framing. Keep meaningful heads/tag inside98% NDC bounds; the final wide keeps every body inside that margin too. Preserve intentional gaze-away acting; do not force every character to face camera. The S1 opening is one new still within a94-frame schedule, not a rendered opening sequence.

**Dressing budget:** bedroom reuses lamp/notebook/curtain. Shared courtyard adds two facade masses plus three detail assemblies: porch/stoop, sidewalk boundary and one distant lamp. Home doorway, windows and pavement connect the town to the reunion. No decorative props, extra live crowds or generated town.

**Stable sources:** [style-town.json](stories/names100/style-town.json), [style-bedroom.json](stories/names100/style-bedroom.json), [style-ending.json](stories/names100/style-ending.json) opt into `look: "s1"`; original shot files/films are unchanged. [look-style.js](production/look-style.js) dresses the existing [courtyard](production/assets/courtyard.js)/[bedroom](production/assets/bedroom.js); [render.js](production/render.js) remains the existing explicit-frame Three.js renderer. Counters789/1529, restoration890–926 and all original actor samples/cuts are preserved.

Reproduce: `npm test` and `npm run test:style`. [Verification/costs/limits](evidence/names100-s1/REPORT.md). Recommendation: retain S1 as the coherent three-set candidate for creative review. Still-only certification: no new motion, full opening/ending/episode,720p video, audio or final WAV alignment. Native Safari/cross-GPU identity and whole-sequence continuity remain unverified.
