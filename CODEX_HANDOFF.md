# Current handoff — P1 reusable shot pipeline

PR #6 was reviewed against PRODUCTION_FEASIBILITY.md and rerun (`npm test`, `npm run render:feasibility`, `npm run sheet:feasibility`), including actual 216-frame WebGL rendering, reverse pixel determinism, H.264 decode/playback and original evidence review. It is merged with history preserved at `717dbfcc0ab8d0afdbc100db7d46a7734ce90d27`, retaining `cdf87d1` and all previous commits/assets/evidence.

The user then authorized P1 on a separate branch. Read F1_SPEC.md, F2_SPEC.md, AGENTS.md, STATUS.md, PRODUCTION_FEASIBILITY.md and P1_PIPELINE.md. The implementation generalizes JSON, extracts just the existing workshop/chest, samples explicit prop events and provides resumable verified rendering. See evidence/p1/REPORT.md for executed results and limitations. The original version 1 feasibility list remains an unchanged pixel regression; the independent version 2 list exercises the same renderer with two different shots, camera/placement/palette/appearance choices and open/close events.

F1 anatomy/head/pivots/appearance, F2A and both gaits are preserved. No walking transitions, audio, story generator, editor, broad environment framework or torso redesign. The tapered/hourglass torso remains a future opt-in proposal in PRODUCTION_FEASIBILITY.md, requiring separate approval and regression checks. P1 must stop after its pull request for review. Do not automatically implement the next phase.

Earlier animation handoffs remain in F2_HANDOFF.md and Git history. Historical no-MP4/no-environment restrictions apply to those completed stages and do not cancel the current explicit P1 authorization.
