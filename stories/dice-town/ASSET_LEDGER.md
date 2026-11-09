# Asset / dependency ledger

| Asset | Classification / origin | Needed |
|---|---|---|
| Six-part oval avatar, named pivots, appearance/face factories | Reuse unchanged S6 source | P1 |
| Three.js 0.187.0, Playwright 1.56.1, existing HTTP server | Reuse; no added dependencies | P1 |
| Soft textured crop | Isolated standalone `appearance/v2-final-hair.js` from `origin/feat/visual-foundation-v2-optin` b6e3511; copied verbatim as `production/dice-town/hair.js`; only dependency Three.js; no branch merge | P1 |
| Plaza, arched shop factory, pitched roofs, awnings, radial paving, physical signs | Small opt-in geometry/material extension | P1 |
| Ivory die, three upper pips / one front / two side | Small opt-in static prop; no event-system extension | P1 |
| Leo jacket hem, strap, notebook and three cached face choices | Small opt-in appearance layer; original head unchanged | P1 |
| Pip + three supporting posed avatars | Four static extras; not generic animated crowd support or changed P2A contract | P1 |
| Die impact, latch, boundary, levitation motion | Deferred explicit-frame mechanics; must prove screen readability | P2 |
| Fair-roll story, family/chair payoff, time logic | Unlocked proposals requiring review | P3 |
| Licensed/import-ready modular town kit if procedural art is insufficient | Deferred alternative; inspect license/style/scale before purchase or import | After P1 review |
| Narration, sound, captions, full film, post stack, facial library | Deferred; private audio/caches stay outside Git | P3–P5 |

Base: `origin/codex/names100-s6-native-master` c4dbd75. Inspected S7 release f819347, ground/sky lookdev 9ca80cb and V2 b6e3511. These refs remain untouched. No arbitrary crowd rig, generic portal/physics API, asset pack or paid dependency is introduced.
