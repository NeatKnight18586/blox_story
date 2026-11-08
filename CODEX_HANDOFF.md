# Current handoff — P2A reusable character casting

PR #7 was reviewed and all F1/F2/P1 source, recovery and browser tests rerun. Both P1 films were regenerated: all 336 PNG hashes and both encoded MP4 hashes match their committed originals. Merge `74708b9a02aaefafbc3d8f9cc3d98f291afbe976` preserves `e1690a0` and all previous commits/assets/evidence. Detailed prerequisite logs: evidence/p2a/pr7-review/.

The user authorized P2A on a new branch from updated main, superseding P1-only/no-torso-variant restrictions for this scope. Read F1_SPEC.md, F2_SPEC.md, AGENTS.md, STATUS.md, P1_PIPELINE.md and P2A_CASTING.md. Version 3 adds up to two stable cast IDs and per-shot independent action/placement/face/appearance. It delegates to P1 timelines and the original action sampler; no animation engine is duplicated. All older shot versions remain supported.

Classic is still the default six-part avatar. Only an explicitly selected tapered torso changes geometry at construction, retaining the same envelope/pivots/oval head/leg geometry. One removable cached bob and vest demonstrate appearance compatibility. Fixed two-shot, close-up and OTS presets resolve once from shot-start placements. The original 12-second reassurance.json acting test uses existing idle/look-react, a reused workshop and the P1 H.264 exporter. Evidence and verified limitations: evidence/p2a/REPORT.md.

Preserve both gaits and all prior tests/evidence. No walking transitions, audio, large character library, physics engine, editor, story generator or automatic next phase. Additional torso reference matching is unverified beyond the documented restrained direction; native iPad/Safari is untested. Stop after the P2A implementation PR for review.
