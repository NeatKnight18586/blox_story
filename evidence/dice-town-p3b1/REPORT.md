# P3B-1 — D15 mechanism and D23 pin proof

**Technical PASS. Creative PARTIAL / human review pending.** Branch from PR32/a78b7f2; no merge.

## Actual evidence

- [D15 mechanism motion](mechanism.mp4):48 frames,1.6s,360×640/30fps,H.264/yuv420p,silent.
- [D23 pin handoff motion](handoff.mp4):72 frames,2.4s,360×640/30fps,H.264/yuv420p,silent.
- [Phone review sheet](phone-review.jpg):390px wide per native source panel; labels are outside screenshots, never in the scene or films.
- Native720×1280: [rest](rest.png), [contact](contact.png), [disabled](disabled.png); [seated pin](seated.png), [removed](removed.png), [transfer](transfer.png), [received](received.png).
- Complete low-resolution frame sheets: [mechanism](mechanism-contact.jpg), [handoff](handoff-contact.jpg).

No native motion export or full editorial interval was rendered. These are local motion windows, not a new episode edit. Existing D15 source interval1220–1332 and D23 interval1997–2129 remain untouched. Suggested proof windows are1220–1268 and1997–2069, end-exclusive. Their exact placement within final shots remains editorial work. Disabled still is a diagnostic counterfactual after pin removal, not an additional story shot or an automatic six outcome.

## Mechanical design

One small chamber: floor/rear/side wall with skirting, support columns/headers/ledges, a hatch/anchor fragment, installed bearing mount and machine plinth. No cellar, new environment library or text panels. Existing canonical avatar/pivots, main appearance colors, hair, notebook and Three.js renderer settings/material language are reused. Leo is teal with the existing side-part hair; Pip is the child-scale rust-clothed rig. Work step supports Pip at crank height.

Input crank plate rotates freely on a central bore around the output axle. A brass off-axis pin spans real holes in both coupling plates. `coupledOutput(input,pin)` transmits angle only while shaft position spans both aligned bores; pull it clear and the input turns without rotating the output paddle. This is explicit kinematics, not a physics simulation or merely an unrelated disabled pose. The crank makes a short operating stroke, not a full-revolution gear train.

The same persistent pin group and shaft/T-handle meshes are used in D15, D23 and the disabled diagnostic. No duplicated prop, parent swap or invisible replacement. D15 presents a six-bearing face approaching the upper orientation; paddle contact then drives the die away. Scale remains6.3 units. The die's height is calculated from its actual rounded mesh vertices so the rocking edge stays on the support level. Visible two/six faces are provided; this is not a complete final six-face die asset.

The paddle uses a0.003-unit virtual contact envelope for rounded/tessellated surfaces. Independent actual vertices remain within0.006 units of the die's finite flat underside through the strike and do not penetrate. This small clearance is explicit, not hidden by a simulation claim.

## Handoff staging

Frames0–16 extract along the pin axis;17–25 hold fully clear of the sleeve. From26 the carry first clears forward, then crosses to Pip. Around53 the pin reaches Pip's support; Leo withdraws during56–65 and the receipt holds through71. The insert camera cuts at local frame24 while the pin is held in the same world position. There is no teleport or duplication across the cut.

Rigid block forearms act as open support surfaces: Leo supports the forward shaft and Pip the rear portion, with orthogonal approach paths. The shaft remains visible and supported while Leo withdraws. No fingers/clenching illusion is claimed. Torso translation stages the cropped arms; walking/foot planting during the cropped carry is not qualified for a wider shot. Tight inserts emphasize the pin rather than adding a full performance or wardrobe pass. A broader character-context view should be chosen when integrating the final D23 shot; it is not automatically approved by this contact proof.

## Verification actually run

- `node tests/dice-town-p3b1.js`: enabled drive coupling, removal disables transmission under the same input, nonnegative analytical gap, sleeve clearance before lateral carry, stable receipt, explicit seeking PASS.
- `npm test`: existing source regression suites PASS. No existing engine/rig/action/story source was modified; preservation.json records byte hashes against a78b7f2.
- Real-browser native seven-state reverse-order screenshot hash/state equality PASS. Both motion clips check persistent body IDs, exactly one pin, identity across mode changes, no page exceptions and selected reverse pixel/state samples. These checks are same browser/backend, not cross-GPU pixel guarantees.
- Independent geometry checks over all enabled/handoff/disabled samples: actual rounded die support error **8.88e-16**; paddle-to-die gap in contact **0.001366–0.004445** world units; pin/hand penetration **0**; hand/hand penetration **0**; maximum pin support gap **1.79e-09**. Axis-aligned rigid arm/shaft bounds and actual paddle vertices are used; not a general rig/room collision solver.
- Every pin vertex stays inside the handoff frame: max absolute normalized screen coordinate **0.910**, leaving at least about4.5% image margin. This does not certify every other prop/body against occlusion.
- Existing FFmpeg encoder/video verifier:48/72 decoded frames,1.600/2.400s,30fps,H.264,yuv420p,square pixels, no audio, continuous timestamps, full decode and actual browser playback/seek PASS. Full probe/playback data are in motion-verification.json.
- Native/contact-sheet review exposed initial wall/head obstruction, a brief forearm intersection and tight T-handle framing; these were corrected before final evidence. No false creative approval inferred from the tests.

## Costs and practical limits

Retained output: seven native stills plus two short360×640 motion proofs, not complete D15/D23 editorial intervals. Final native-still/reverse-check pass **7.29s** wall. The final complete low-resolution motion pass (both clips, encoding and playback verification) took **30.00s** wall. These are partial scopes, not the total cost of the task. Several bounded native staging/camera corrections and low-resolution clip revisions occurred; total CPU/GPU/memory/model-token usage was not profiled and is unavailable. Do not read the last receipt as the total render bill. Raw frame sequences stay in ignored renders/. No new packages, paid assets, audio or native-resolution movie export.

## Honest creative assessment

The installed mechanism and empty sleeve now replace the animatic's labeled plank; the same pin remains trackable across the handoff. The proof is more specific, but still needs human approval for phone-size mechanical readability. Die motion is an authored constrained rock, not a dynamically stable free roll; support/underside checks do not qualify arbitrary future angles. Small bore alignment is clearer at native size than on a phone. Hands are rigid block supports, grip/identity context is limited by close crops, and the room/lighting remain deliberately simple. Some structural edges and the large die dominate the chamber view. No unseen arm/torso/room collision certification or final emotional acting is claimed. Do not advance to D16 or later shots automatically.

## Reproduce

```sh
node tests/dice-town-p3b1.js
npm test
node scripts/dice-town-p3b1-qc.js
node scripts/dice-town-p3b1-proof.js --stills
node scripts/dice-town-p3b1-proof.js
python3 scripts/dice-town-p3b1-sheet.py
```

`--handoff`/`--mechanism` refresh one clip while retaining the other receipt; changes affecting both require full recapture. Native stills can be inspected first; only low-resolution motion proofs are produced. Existing HTTP server, H.264 encoder and browser verifier are imported unchanged. No general event schema or animation framework was added. Stop for review.
