# 02 `ragdoll` — scene plan (targets; real cut times come from `cues.json` word onsets)

Cast (troupe): LEAD = Stan · RIVAL = Flip, the best tumbler in class · SECOND = Stan's mom (launched by the cannon in
B2) · LITTLE = the kid whose shoes Stan carries · ELDER = the mayor (sash, slides everywhere) · crowd ≤ 60 · AFK ×2.
New poses this episode (pure functions of t, seeded per actor, added to `engine/poses.js`): `flop` (limp pile), `tumble`
(rolling downhill along `groundY`), `launched` (arc with loose limbs), `slide` (on the back, arms up), `plank` (Stan
tipping over rigid). No physics engine: paths are authored curves, limbs get seeded lag.
World: one steep terraced hill town (alpine terrain, suburb dressing); ramps instead of stairs, the catch-net at the
bottom, a cliff under it, a black cable running up the main street to a summit hidden in cloud until shot 17.

| # | Target | Line(s) | Shot | Camera | Notes |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | In this town, nobody can stand up. | wide, `spectacle` | `openHit`; `drone` down the main street: dozens of people tumbling downhill, one launched overhead | Clue 1: a faint glowing cog icon on the summit, top of frame |
| 2 | 0:03–0:06 | Everyone is a ragdoll. Everyone except Stan. | close | `snap` to Stan standing perfectly straight while bodies roll past both sides | hero face ≥ 20 % by 5.0 s; a tumbling kid bounces off him |
| 3 | 0:06–0:10 | People here don't walk… They tumble to work. | 3 `beat` shots | hard cuts on "flop", "roll", "tumble" | a teacher rolls into class; briefcase arrives first |
| 4 | 0:10–0:15 | A cannon fires the grown-ups… Most of them land in their chairs. | wide → insert | `track` the arc of Stan's mom; cut to an office: she lands in a chair, the next man lands in a plant | laugh 1 |
| 5 | 0:15–0:20 | Stairs are slides… three tries and one apology. | 2 mediums | slide-stairs; two floppy arms missing each other | Clue 2: every doorknob and coat hook is at standing height, out of reach |
| 6 | 0:20–0:26 | And the town is built on a hill… carries them home. | wide | `crane` down to the pile at the bottom; the big net lifts them at dusk | plants the net and the cliff edge beneath it |
| 7 | 0:26–0:32 | Then there's Stan… Like a lamp. | medium | orbit, eye level; he stands beside an actual lamp, same pose | |
| 8 | 0:32–0:38 | The other kids call him Stiff Stan… can't even slouch. | 3 quick mediums | cuts: cannon misfires (he just steps out) · he tries to roll (walks sideways) · slouch attempt | Flip cartwheels through each shot |
| 9 | 0:38–0:44 | Every recess… Carrying everyone's shoes. | wide | `gamecam` behind the tumbling class; Stan walking after with an armful of shoes | AFK cameo 1: standing frozen at the fence, the only other upright figure, opacity 0.4 |
| 10 | 0:44–0:50 | More than anything, he wants to flop… Like a board. | medium, night | static; bedroom, he tips forward rigid onto a pile of pillows (`plank`) | laugh 2 |
| 11 | 0:50–0:55 | But standing has one good thing. Stan can see far. | over-shoulder | slow push over his shoulder, the whole hill below at flop height vs his eye line | |
| 12 | 0:55–1:03 | …something strange. A thick black cable… You can't roll uphill. | insert → `tiltUp` | follow the cable up the street into cloud | Clue 3 (spoken); a tumbler tries to roll uphill and rolls back |
| 13 | 1:03–1:09 | Then one night, the big net snapped… Just a cliff. | wide, low | `heroLow` FOV 64 under the net; ropes snap one by one; `shake` | deadline: the pile starts to move |
| 14 | 1:09–1:15 | The whole town started sliding… One very calm cow. | 4 `beat` shots | cuts on "beds", "cars", "mayor", "cow" | the cow chews, sliding |
| 15 | 1:15–1:21 | They grabbed for each other… Do something, Stan! | medium | floppy hands slipping apart; LITTLE slides past reaching up | everyone turns to look at him |
| 16 | 1:21–1:26 | Stan looked down at the cliff… needed him to flop. | close, hold | static-drift; his eyes go down, then up the cable | low point; music drops out |
| 17 | 1:26–1:33 | So Stan did the one thing… Then he ran. | wide → `gamecam` | he climbs against a river of sliding people; cloud parts at the summit | the reversal starts; first time the camera goes above the cloud |
| 18 | 1:33–1:40 | At the very top, there was a switch… one more. On. | wide, `tiltUp` | reveal a house-sized toggle panel: RAGDOLL above, ON lit green | **money shot**: one block-kid under a giant floating switch. Original panel art, no real game UI |
| 19 | 1:40–1:43 | Stan pushed it with his whole body. Click. | close | shoulder into the toggle; `flash`; it slams to OFF | 6 frames of silence after "Click" |
| 20 | 1:43–1:49 | All over the hill… they stood up. | wide | `drone` down the hill: bodies stop at the cliff edge and rise in a wave | the largest visual change; the cow stands on two legs, then thinks better of it |
| 21 | 1:49–1:56 | Nobody was born floppy… on the first try. | inserts | a hand reaches a doorknob at last · a clean handshake · a queue standing stiffly | second surprise; clue 2 pays off |
| 22 | 1:56–2:02 | And they were so bored. So they voted… Just for weekends. | wide | town square, everyone standing in rows, yawning; hands go up | laugh 3; a hand-painted board in the square: WEEKDAYS off / WEEKENDS on (in-world sign, not UI) |
| 23 | 2:02–2:10 | That Saturday… best fall of his life. He taught the town… | wide → close | Stan at the summit, the town chanting below; he lets go and tumbles the whole street, laughing | `tumble`; AFK cameo 2: at the same fence, tipped over flat like everyone else |
| 24 | 2:10–2:14 | In this town, nobody can stand up. Not on weekends, anyway. | same as shot 1 | same `drone` path: everyone tumbling, Stan in the middle of them, the cog icon now bright | final frame rhymes with frame 0; hold to end |

Audio cue sheet for the owner's music: bouncy, silly 0:00–0:50 · curious 0:50–1:03 · alarm and drums 1:03–1:21 · near
silence 1:21–1:26 · climbing build 1:26–1:40 · hard stop on "Click" · big warm release 1:43 · silly again from 1:56 to end.
