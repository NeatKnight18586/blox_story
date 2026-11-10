# Dice Town P3B-2B — One-Pass Recognition Readability Correction

**Status:** Directed specification only. No visual changes or new film produced. Base on PR #35 `codex/dice-town-p3b2-mother-proof` commit `6c0fdad`. Implement on an isolated descendant of this specification branch.

**Recommended Codex model:** GPT-6.1 Sol. **Reasoning effort:** Medium.

## Specific diagnosis from actual evidence
Reviewed `evidence/dice-town-p3b2/phone-review.jpg`, `chair.png`, `all-105-frames.jpg`, `REPORT.md`, and the actual `production/dice-town-p3b2/{scene,motion}.js` source.

Technical PASS is preserved: 105 frames/3.5s, deterministic seeking, actor/face identity and reach clearance. Creative PARTIAL: mother's head and subtle face changes occupy little of the 390px composition; her dark, rounded low-bun hair reads like a cap, and her appearance doesn't clearly convey an older family member. The movement can read as a generic happy greeting. The chair is correctly present but appears newly made and generic. These are **shot identity/composition issues**; do not rebuild the rig or add more animation systems.

## Implementation scope: one corrective pass only
**D35 (local proof 0–104, matching source [3090,3230))**: Preserve the existing anticipation → focus → relief → restrained reach timing, motion function, cast, room, and basic blocking. Improve only *mother identification and phone-width face readability*:
1. In `production/dice-town-p3b2/scene.js`, use the existing mother avatar, `low_bun` asset and cached face expressions. Adjust the hair's visible swept/frontal shape and subtle gray highlights so it reads as a hairstyle, not a near-circular cap. Keep material/style consistent with the stylized Roblox-inspired universe; no asset importing or new hair framework.
2. Add at most one small clothing cue if camera-visible (e.g. an unobtrusive shawl/collar or apron edge), integrated cleanly with existing torso. Mother's age should be legible without exaggerated wrinkles or stereotyped makeover. Any newly identified accessory/color becomes a reusable appearance detail for the future D19 family photo, but **do not implement D19**.
3. Tighten the existing over-Pip-shoulder camera composition a little to make the mother's face/expression more legible at 390px, **while preserving Pip's small foreground silhouette and the complete reaching gesture**. Aim for a visibly larger head within the phone frame than in PR #35, not an arbitrary FOV change. Keep jamb and floor depth, continuity, no cropped story-critical gesture, no giant blank margins, no visible edge of the room.
4. Ensure the facial transition is readable at source 0, 40, 95, with no smirk, broad unearned grin, eye drift or expression pop. Retain explicit-time interpolation. Prefer editing camera/appearance before revising easing or animation.

**D36 (one still only):** Reuse the existing yellow chair and room, preserving exact spatial position/orientation. Make a **small** age/story cue: mild seat/back wear or one distinctive painted detail that can be repeated in the future D19 photo. Keep the old-color wall patch behind the chair and a visible inhabited table/wall context; no new furnishings, separate texture-generation system, text cards or extra props.

## Creative acceptance criteria
- Muted at 390px phone width: a small boy has arrived; the mature adult recognizes him; anticipation, relief and invitation are clearly distinct.
- The mother is visually recognizable as an older member of his family; face/hair is discernible, not simply a generic adult in a boxy outfit.
- **No unintended overlaps:** mother reaching arm clears jamb/head/Pip throughout, body/room and foreground silhouette stay clean, chair/table don't clip.
- House looks grounded: jamb, wall returns and continuous floor; no floating stage or raw visible boundaries.
- D36 close-up identifies a preserved chair with a recognizable detail, rather than making it look magical or ornate.
- Maintain native pose repeatability and previous tests. Report any criterion that remains unachievable using the existing rig.

## Evidence budget / workflow
1. **First** produce native WebGL keyframe stills of D35 local frames 0/40/95 and one D36 still. Make a side-by-side PR #35 → corrected phone-size comparison (native-source panels).
2. Inspect those four stills for recognition/hair, eye-lines, reach, framing and chair continuity. If the original stills already meet a criterion, reuse rather than changing it.
3. Only then, **if composition/appearance changed**, export one 360×640/30fps silent 3.5s local WebGL motion proof; 105 frames. If correction remains static, still run targeted motion state/visibility validations. Do not generate native 3.5s film or full 117s episode.
4. Run targeted D35/D36 identity, collision/framing, deterministic reverse-seek, H.264/decode/playback checks as appropriate, and existing source regressions. Preserve evidence from PR #35 and earlier.
5. Return a concise `REPORT.md` with precise changes, native before/after, actual render costs, and honest creative LIMITATIONS. Do **not** report creative PASS solely for test success.

## Hard exclusions
No new mother rig, facial atlas, body anatomy, global hair library, family photograph scenes, lip sync, hug, extra family members, kitchen extension, sound, music, captions, montage, unrelated animation or set redesign, or complete episode export. Do not merge. New draft implementation PR should target this brief branch and stop for human creative review. No repeated polishing loops in the same task.

**Future dependency only:** D19 younger family imagery must reuse this mother's recognizable features and the D36 chair detail; handle later after the D35 correction is approved.
