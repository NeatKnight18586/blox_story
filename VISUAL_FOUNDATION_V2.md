# blox_story — Visual Foundation V2 (four-style casting library)

**Status:** experimental draft PR #21, NOT merged. Current Names100 native master and its PR #20 remain unchanged.

## Art direction — simple and finished beats complicated and awkward

This is **original stylized block-game cinema**, not a copied Roblox UGC hairstyle.
Four curated, natural silhouettes are enough to cast the first several Shorts.

| ID | Suggested role | Design intent |
| --- | --- | --- |
| `neat_side_part` | short option A | compact side-part, gentle diagonal fringe, tidy temples |
| `soft_textured_crop` | short option B | slightly irregular short locks; no spiky tubes or exaggerated bangs |
| `low_bun` | hair-up option | softly swept sides, small low nape bun, eyes exposed |
| `shoulder_length` | hair-down option | modest face-framing lob, rounded ends, no extreme length |

The names describe **hair geometry, not character gender**. Any character can wear any style. The existing **legacy `bob`** remains for old film fidelity; it is not one of the four newly promoted options.

New cast selection requires only stable IDs:

```json
{
  "skinToneId": "warm",
  "hair": "neat_side_part",
  "hairColorId": "espresso"
}
```

Other appearance fields (clothing, body variants, expression) are unchanged. Eight curated skin tones and eight hair colors remain available; no color/mesh guessing per episode.

## Technical contract

- One canonical six-part body with existing pivots; hair attaches to `avatar.pivots.head`.
- Hair is assembled once per actor, cached by ID, and smoothly follows head turns. No texture assets, rig changes or new libraries.
- Hair geometry is a **small ellipsoid crown + a few closed, broad tapered 3D clumps**, rather than many independent tubes or rounded blocks.
- Small controlled tonal changes (within a single chosen base hair color) preserve definition but never use striped or bacon-style color bands.
- Hats and hair remain mutually exclusive to avoid intersection.
- Existing animation, ghost transparency, story/counter/captions, audio and all archived film hashes should remain unchanged.
- V2 optional 3-band toon material and layered backlot remain **off by default** and should be applied only after a before/after visual approval, not because toon is trendy.

## Look-development gate, without spending Codex coding credits

GitHub workflow `.github/workflows/visual-v2-proof.yml` runs:
1. Original regression tests and V2 casting tests.
2. Standard versus toon 720×1280 full-body comparisons (4 × 2).
3. Four-angle (front/three-quarter/side/rear) plus head-turn hair-close-ups at actual 720×1280 (4 × 5).
4. Human creative review of the actual evidence at phone scale. Tests alone cannot approve aesthetic quality.

**Technical PASS does not mean cinematic PASS**. Reject a style if the hair blocks expressions, creates an implausible bald/helmet gap, clips the upper shoulder when turning, looks detached, or depends on an ornate high-poly model. One narrowly targeted correction only, then freeze the four catalog IDs.

## Why a small collection is the professional choice

Roblox's rigid accessory workflow uses head fitting and an attachment, rather than creating a new head/body per wig. For Roblox Marketplace uploads specifically, a rigid accessory must be single-mesh, watertight and within its triangle budget; **these editable Three.js groups are only for our video renderer**, not currently Marketplace export assets.

Sources:
- https://create.roblox.com/docs/avatar/rigid-accessories/specifications
- https://create.roblox.com/docs/art/accessories/accessory-fitting-tool
- https://threejs.org/docs/pages/BufferGeometry.html

## Future Shorts — limited-animation production playbook

First lock a shot and readable silhouette. Keep stage depth using **foreground hero, midground reusable sets, and simple background layers**. Prefer short gaze shifts, anticipatory poses, purposeful holds, cut changes and re-used walk cycles over large amounts of movement. Render keyframes before short motion excerpts; use safe resumable final WebGL export. Add captions/counter/audio in the FFmpeg stage, not the rig. Keep any shot-specific new prop or outfit behind a visible story need.

**Publishing is separate.** PR #20's approved Names100 master is not rerendered to try V2 wigs. After the four hairstyles pass human art review, use them as preset IDs for later episodes.
