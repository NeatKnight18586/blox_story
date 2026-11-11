# "In this town…" — series format bible (v1)

One page. Every episode is checked against this before anything is built.
Sources: our frame-by-frame analysis of the Waterville reference Short, the "in this town / in this world" story pattern, and what Dice Town taught us.

## The promise
One town, one absurd rule, one kid who collides with it, one twist that changes what the rule meant. Viewers should be able to explain the episode to a friend in one sentence.

## Series identity
**A new cast every episode** (owner decision). What stays constant is the format itself: the "In this town…" cold open, the narrator's voice, the look, and the shape of the story. Characters are built fresh per story from the shared rig, hair and clothing system, so a new cast costs a preset file, not new code.

## Structure (2:00–2:30, 380–470 words at 1.25× narration)
| Time | Beat | Must contain |
|---|---|---|
| 0–3 s | Cold open | The rule in 8 words or fewer, over the most striking image, already moving |
| 3–20 s | Three demonstrations | Three quick visual gags, each bigger than the last |
| 20–40 s | The kid | Who is bad at, exempt from, or curious about the rule; what they want |
| 40–75 s | Escalation | Attempts and consequences; **midpoint reveal at ~60 s** |
| 75–110 s | Stakes and choice | What it costs; a false ending |
| 110–135 s | Twist and payoff | The rule meant something else; the image the whole episode built toward |
| Last 5–8 s | Button | One emotional line that recontextualises the rule (the quotable line) |

## Retention rules
1. A **re-hook every 15–20 s**: a question, a reveal, or a visual escalation.
2. A **new image every 1.5–2.2 s** (65–90 shots). The camera never sits still.
3. **Faces first:** about 60% of shots are close or medium on a face or a hand-sized insert; about 15% wides.
4. Every narrated sentence gets a picture that *shows* it; nothing is explained twice.
5. Expressions change **on the word** that causes them.
6. Captions always on, short, never over a face.
7. The first frame must work as the thumbnail.
8. End on feeling, not explanation. Happy or bittersweet, never bleak.

## What gives the "dopamine"
- A rule simple enough to predict, then gags that out-run the prediction.
- Fast cause → effect: every action visibly triggers the rule.
- One satisfying mechanism or secret revealed.
- A reunion, a kindness, or a sacrifice at the end.
- A last line worth quoting.

## Pitch rubric (1–5 each, 35 max)
Hook image · Rule clarity · Gag density · Twist strength · Emotional payoff · Set reuse (5 = mostly existing kit) · Novelty

## Workflow (owner decision: voice-over first)
1. Pitch → script (`stories/<ep>/SCRIPT.md`).
2. The owner records the ElevenLabs voice-over and sends the WAV **before any visuals are built**.
3. `scripts/episode-align.py <ep> <wav>` writes word timings; every shot is anchored to a spoken phrase, so the edit is built on the real performance, never on estimates.
4. Animatic + automatic lint → first ~15 s at native 1080p as the proof gate → full render → captions v2 + review file (voice stays private, out of Git).

## Production guardrails
- Original characters, sets and names only; no Roblox assets or logos.
- Native 1080×1920, 30 fps. Shots are anchored to narration **words**, never to estimated times.
- Sound effects, when used, ship as a separate stem.
- After publishing, the retention graph decides the next revision of this page.
