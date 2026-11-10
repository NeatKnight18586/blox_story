# Dice Town P3B-4 — camera-bounded world grounding

**Technical PASS for five static views; creative PARTIAL / awaiting review.** Isolated descendant of direction `212968d`. No merge, motion export, timeline change or earlier P3B edit.

## Actual native evidence

[Plaza before/after at390px](plaza-comparison.jpg) · [Gate before/after at390px](gate-comparison.jpg). Labels are outside images; all panels derive from actual native WebGL PNGs.

Five corrected720×1280 stills: [D01 master](after-D01.png), [D28 sunrise-angle alternate](after-D28.png), [D33 closed](after-closed.png), [D33 open](after-open.png), [D38 Leo at open gate](after-D38.png).

Corresponding native baselines: [D01](before-D01.png), [D28](before-D28.png), [closed](before-closed.png), [open](before-open.png), [D38](before-D38.png). These are **new native captures of the unmodified animatic source**, not upscaled boards or historical native-production frames. Their hashes independently match that original browser entry. Old proxy cards visible in baselines are accurately retained; none introduced into the new gate.

## What changed and why

One opt-in adapter imports the existing animatic scene. Old source files, rigs, assets, shared sky and renderer are unmodified. New geometry is only visible in this entry.

**A:** retain three original shops, tower,6.3-unit die, Leo and the existing floating baker. Replace the raised concentric stage surfaces with one near-flush8.3-radius paving inset, connected to land and one4.6-wide street outlet atX=-6 between the existing facades. Two shallow facade returns frame the receding street; existing three sky roof silhouettes remain. Original die bottom is lowered0.34 to sit atY0.02 on the new paving; scale unchanged. Existing radial joints lie just above the inset. A few transverse paving joints connect the foreground, without random prop filling.

D01 uses the existing result3 and physical rule board. Resident is staged in a distinct left screen lane; Leo is readable to the right. Other two residents are hidden in this proof to avoid crowd occlusion, not deleted or redesigned. D28 retains the animatic's last result5 using existing pip geometry/material and the shared sunrise-colored sky/light; no new weather/lighting preset or morning action. Rule3 board is absent in D28. Faces use existing cached expressions, with no new facial geometry or appearance recipe.

**G:** two leaves hinge on posts tied into wall returns and a threshold. Open positions are static ±1.24radians; closed positions0. A5.4-wide road continues through the gate. Two nearby shallow exterior facades, the green destination-home facade and two distant roof/facade silhouettes support depth. The cream jamb/green house identity repeats D35 dimensions/colors (jambs±2.45,6.5high; lintel5.18wide) without copying its interior or implementing another home scene. The destination door is closed, not a portal/back-wall card. D38 reuses Leo at the same open gate and road axis; no notebook label or kitchen vignette.

**Layout limitation:** A and G are separate camera-bounded footprints, not a surveyed connected city. Both travel along negativeZ with matching stone road/roof/home vocabulary. A's street centerX=-6 and G'sX=0 are visual continuity, not a verified continuous geographic route. D34 movement and the connecting route are not implemented.

## Exact camera / source inputs

Coordinates: position → look-at, verticalFOVdegrees. Baseline `k` is the existing held animatic state, not a new global timestamp.

| View | Unmodified baseline | Corrected |
|---|---|---|
| D01,k0 | [8,11.5,27]→[-1,5.5,0],53 | [10,11,27]→[-2,4.5,-2],57 |
| D28,k0 | [8,10,13]→[-1,3.5,-1],43 | [8,10,21]→[-1,4.6,-3],54 |
| D33 closed,k0 | [73,7,12]→[65,3,-1],48 | [4,7.5,23]→[0,3.2,-6],52 |
| D33 open,k1 | same camera as closed | same camera as closed |
| D38,k1 | [69,5,8]→[65,3.4,1],35 | same widest gate camera, Leo at[-0.7,0,4.5] |

A uses the existing P2A held pose sample55; G reuses pose sample104 with static placement. No new animation or moving camera. Both new A cameras and all three G states are verified; this does not certify other future crops. D28 is deliberately widened from the original die insert to expose and test the sunrise/world horizon.

D01[0,66),D02[66,169),D28[2585,2669),D33[2898,2985),D34[2985,3090),D38[3389,3513), full38-shot/3513-frame plan and117.098231s narration remain unchanged. D02 optional sixth frame was not needed for this bounded widest-view proof.

## Geometry / budget

Each footprint has one140×160 land slab,0.25thick, topY0; extends under all camera views and beyond fog. A street4.6×65; G road5.4×95, with shallow stone edge strips. Paving inset diameter16.6,thickness0.045,top0.02. Gate opening6wide; leaves3×4.9×0.22; posts0.65×7×0.8; each return16×6.3×0.6; threshold6×1.2 plan. No terrain, street generator, interiors or unseen city grid.

New shallow facades `(X,Z;width,height)`:
A(-11,-26;5.4,7.2),(-1.7,-31;4.5,6.6).
G(-7.5,-12;5.5,7.3),(7,-16;5.8,8.3),home(0,-25;8,7),distance(-12,-43;7,9),(12,-48;8,10).
Each stucco depth2.4, roof depth2.7; shared compact shape/material function, not a new asset framework. Existing sky/fog hides far geometry; no new post effects or external assets.

## Validation

- `npm test` and all existing Dice Town source tests (P1/P1B/P2A/animatic/P3B1/P3B2/P3B3): PASS. [Output](regressions.log).
- `node scripts/dice-town-p3b4-qc.js`: actual transformed critical mesh vertices inside five fixed cameras. Die/Leo/resident in A; gate leaves/destination in G; Leo inD38. Camera containment intentionally excludes long wall/ground extents and distant buildings. D01 resident right bound-0.44298 vs die left-0.39667: approximately9px separation at390px, so full resident silhouette has its own horizontal lane.
- Twenty lower-view rays per camera all hit continuous land. Sun fully in all five views; both shared cloud clumps fit A, at least one fully fits G. Existing second G clump may be partly cropped. This is sampled ray/framing verification plus actual image inspection, not a general terrain continuity proof.
- Open gate central bounding corridor3.71074wide. Destination-center first-solid sightline hits the actual home door for both open/D38 views; no leaf/post blocking it. Threshold, road and facade bases meet continuous land. No actor walk or hinge animation sweep certified. [Geometry receipt](geometry-qc.json).
- All ten native before/after screenshots equal reverse-order state/hash samples, no page errors. Five new images also match fresh-load reverse order, so layout/face/visibility does not depend on prior baseline visits. Five baseline hashes equal captures from the **unmodified** original animatic entry at720×1280. [Capture receipt](capture.json), [independent/cold checks](repeat-verification.json).
- Final native D01/open/D38 and both390px comparison sheets inspected. Specific framing/corner crops from initial stills were repaired before final capture. No MP4 or audio produced.
- [Preservation receipt](preservation.json): all1248 earlier tracked files compared byte-for-byte before the allowed AGENTS/README/STATUS updates. Earlier films/evidence, P3B character/prop sources, shared engine/sky and original tests/timetable unchanged.

## Actual cost / commands

Final ten-native-image capture plus ten reverse comparisons27.978s internally,28.364s wrapper wall. Resource receipt:1.229s user/0.152s system collected child CPU;94452KiB max-child RSS. **These are wrapper child metrics, not summed Chromium-process-tree CPU/memory or GPU measurements.** Three earlier diagnostic image batches, geometry checks, independent/cold checks, source tests and review are excluded; no complete task cost/token measurement claimed. [Receipt](resources.json). No dependencies installed, no raw film frames generated.

Commands: `node scripts/dice-town-p3b4-capture.js`; `python scripts/dice-town-p3b4-sheet.py`; `node scripts/dice-town-p3b4-qc.js`; `node scripts/dice-town-p3b4-repeat.js`; `npm test`; existing `tests/dice-town*.js`. Preview `/production/dice-town-p3b4/`; console `__grounding.render('D01'|'D28'|'closed'|'open'|'D38',true)`.

## Remaining visual limitations / stop

World grounding is clearer, especially the installed gate, open route and destination. Facades remain simple and roof rhythm is still repetitive. Plaza road is partly occluded by the existing die/shop arrangement; this is a plausible outlet, not a complete town street vista. Broad foreground/sky margins are retained for these widest environment proofs; they are not final emotional shot framing. Existing hard shadows/contact bias remain, and no performance redesign was attempted. D38 is a site-continuity view, not approval of its final acting/portrait composition. D02/D09/D10/D21/D34 and other unfinished animatic views were not changed or certified; no claim that all38 shots are grounded.

Creative acceptance remains human review. No merge, movement, full film, extra setup family or next phase.
