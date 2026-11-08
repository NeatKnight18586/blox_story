# AGENTS.md — blox_story: Codex operating rules
## Source of truth
Read **F1_SPEC.md** first: F1 v3 is the CURRENT product contract. Then read CODEX_HANDOFF.md, STATUS.md, README.md and existing code/tests. The previous Kai/Mira-first instructions are SUPERSEDED. If documents conflict, F1_SPEC.md wins; STATUS.md controls what has actually been verified.

## Current task boundary
The user authorizes names100 V1 only under stories/names100/V1_VISUAL_BRIEF.md (authoritative). Review/merge clean PR #9 preserving history. Then Gate 1: minimal cached facial emotion, at most three narrative bedroom props, readable cold/warm lighting; compare selected 360×640 stills to PR #9, with at most one focused correction if needed. Gate 2 only if better: a 3–5s low-res excerpt, never the full 463-frame slice/1641-frame episode. Gate 3: affected regressions once, genuine paired art/motion/resources/checklist, PR, stop. Preserve native [482,945), counter 100 through 788 / 99 at 789, ghost through 889 and restoration [890,926], identities and all old APIs/assets/tests/hashes. No voice, captions, music, lip sync, new rig/engine, town, wardrobe library or 720×1280 story export. Original proof files remain immutable.

## Goal and user constraints
One neutral classic R6-like **six-part** block avatar first, then removable appearance layers (face/colors and one optional cosmetic). Original code-rendered Three.js, not official Roblox models. User is on iPad, wants autonomous execution, no manual modeling, recording, installs or gameplay capture. Minimize explanations and usage without sacrificing accuracy.

## Scope discipline
- Current work is only the bounded names100 low-resolution reveal proof. No walking transitions, complete episode, Blender/Roblox Studio, Remotion, soundtrack, broad environment library, wardrobe or general-purpose engine. Temporary frames must stay out of Git.
- Keep existing source committed while migrating. Old `character.js` and Kai/Mira presets are legacy, not the F1 goal. Preserve functionality via history and replace paths only when the new implementation is testable.
- Start with the neutral master, not two customized figures. Use simple proportions from F1_SPEC.md, with one softly rounded oval cylindrical head (latest user correction in F1_SPEC.md) and five beveled rectangular blocks.
- No required full rig or separate fingers, hands, shoes or neck meshes. Distinct styling belongs to appearance layers.
- Keep a simple vanilla Three.js ES module preview; currently pinned 0.187.0. A minimal test server/dependency install is fine when justified; avoid framework rebuild.
- Keep deterministic `applyPose(avatar,poseName,t)`, persistent root and named pivots. No mesh regeneration when switching pose/face/cosmetic. Use caches and attach/detach layers as appropriate.
- Reuse only the core geometry, rig concepts, and tests that actually help the new goal. It is acceptable to replace old implementation when new acceptance tests exist; do not blindly preserve old character visuals.

## Test before calling it done
- Source parsing and real module imports.
- API tests for the canonical six-part base, five named pivots, deterministic reset, independent face, removable accessory and mesh identity.
- Real Three.js/WebGL preview captures: front, three-quarter, side, face close-up, blank face, cosmetic attached/removed. Review mobile silhouette, joints, ground contact, face and lighting.
- Stub/mock tests alone do NOT count as visual evidence. No AI concept images used as fake screenshots.
- Reference user images are attached in a separate ChatGPT exchange and may not be accessible in Codex; follow the numerical spec and admit any reference-availability gap.

## Completion report
Commit the tested implementation, update README.md and STATUS.md with exact commands and capture paths; mark PASS only for genuinely completed source + visual checks, else PARTIAL/FAIL. Provide concise evidence and the next blocker. Verify real encoded metadata, full decode/playback, frame completeness/determinism and cuts; provide MP4/contact sheet/resource measurements. Keep later additions as proposals only. The optional tapered torso is authorized in P2A with classic preserved as default. Stop after the names100 scene-proof PR for visual review; do not automatically implement the next phase.
