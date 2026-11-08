# AGENTS.md — blox_story: Codex operating rules
## Source of truth
Read **F1_SPEC.md** first: F1 v3 is the CURRENT product contract. Then read CODEX_HANDOFF.md, STATUS.md, README.md and existing code/tests. The previous Kai/Mira-first instructions are SUPERSEDED. If documents conflict, F1_SPEC.md wins; STATUS.md controls what has actually been verified.

## Current task boundary
F1 is integrated (PR #1). PR #3 (F2A) is merged after regression tests. The user now authorizes F2B1 only: a foundational explicit-time forward walk, actual geometry/contact measurements, tests and genuine side/three-quarter/vertical WebGL evidence. Walking transitions are NOT authorized. Read F2_SPEC.md and F2_HANDOFF.md. F1_SPEC.md remains authoritative for anatomy/appearance; F2_SPEC.md governs future motion.

## Goal and user constraints
One neutral classic R6-like **six-part** block avatar first, then removable appearance layers (face/colors and one optional cosmetic). Original code-rendered Three.js, not official Roblox models. User is on iPad, wants autonomous execution, no manual modeling, recording, installs or gameplay capture. Minimize explanations and usage without sacrificing accuracy.

## Scope discipline
- Current work is F2B1 only. Do not implement walking transitions, episodes, F3/F4, MP4, Blender, Roblox Studio, Remotion, soundtrack, environment library or full wardrobe.
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
Commit the tested implementation, update README.md and STATUS.md with exact commands and capture paths; mark PASS only for genuinely completed source + visual checks, else PARTIAL/FAIL. Provide concise evidence and the next blocker. Submit the F2B1 PR and stop for review; do not proceed to walking transitions or F3.
