# CONTINUITY — permanent changes to the town
One row per permanent change an episode leaves on the island (RULEBOOK §2). Every later episode builds the city with these world flags on
(spec flag / `world.setState` key named in the last column), so the town remembers. Add the row in the episode's FINAL session.

| episode | permanent change | where (plan.json anchor / district) | asset / world flag |
|---|---|---|---|
| — | (none yet: Season 1 city episodes start at 1D) | — | — |
| Fear Bell (pending: the episode that cracks it) | the Hall's bronze bell is CRACKED for good (dark jagged crack down its front + one branch) | slot 2 belfry (plaza, Governor's Hall) | `world.setState('bellCrack', true)` / spec `clock: [{fx: 'crack', at}]` (parts/city/downtown.js, Phase 1F) |
