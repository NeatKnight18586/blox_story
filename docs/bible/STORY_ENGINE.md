# Story engine: steal the engine, never the plot (R-STORY-*)

The owner writes every story and every line of narration in chat (N-VO-01). This file is what Claude Code checks a spec against and
builds visuals for. It is a skeleton, not a fill-in-the-blank: R-ALGO-04 forces variety on top of it.

Reference model: the Volze channel (~7M average views per Short over its last 10 uploads). We copy its **mechanics**, not its stories.

## The four acts
- **R-STORY-01 Two-beat hook (first 12–18 words):** [the universal rule of this world] + [the rule breaks today / one person is the
  exception]. Example shape: "In this town, nobody sleeps. Except tonight." Spoken by 5.0 s (R-HOOK-04).
- **R-STORY-02 Act I (≈ 0:04–0:25):** three concrete, slightly absurd or darkly funny consequences of the rule ("A wedding lasts three
  blinks"). They prove the world has logic. Spec field `micro_examples[3]`; each one is a visual beat of its own.
- **R-STORY-03 Act II:** an intimate anchor (someone the hero protects or depends on: spec `anchor.who`, `anchor.relationship`) plus a
  visible ticking counter (number, countdown, lanterns, rings: spec `counter.type/start/end`). It shows on screen ≥ 3 times and advances (R-MID-02).
- **R-STORY-04 Act III:** the hero's logical fix fails (`false_solution`) AND the failure reveals the premise was inverted (`inversion`:
  the "monster" was protecting them, the curse was a gift). This is the reversal; it lands at 55–75 % of runtime (R-MID-03).
- **R-STORY-05 Act IV:** bittersweet payoff through sacrifice or lateral thinking (`payoff_type`: sacrifice | lateral | reunion | reveal).
  The final line echoes/loops the first (`loop_line_echo`); the video hard-cuts the instant it lands (R-END-01, R-LOOP-01).

## Transformation rules (origin ledger in every spec)
- **R-STORY-06:** ≥ 2 unrelated `sources[]`, ≥ 1 core element twisted, written down in `what_was_transformed`.
- **R-STORY-07:** a Volze premise may be one source, but its rule, its twist AND its setting cannot all survive. At least one must change
  (the validator requires `what_was_transformed` to name rule, twist or setting when a source has `kind: volze`).
- **R-STORY-08:** never reuse another creator's twist. Changing names or settings of a known plot is a copy, not a transformation (owner check).
- **R-STORY-09 Source kinds:**
  1. `emotional`: emotional plot-twist originals;
  2. `roblox`: Roblox game/meme culture as world rules (obby checkpoints, "oof", natural-disaster rounds, respawning, server shutdowns,
     AFK, badges, trading, admin commands, 2016 classic-era nostalgia): mechanics only, never trademarked characters;
  3. `fantasy`;
  4. `retold`: public-domain fairy tales, myths, fables and urban legends are free to retell; for modern films/books borrow only the
     "what if" question, never characters, scenes or titles;
  5. `volze`: allowed only under R-STORY-07.

## Roblox context
Roblox context may arrive only after the universal hook (`roblox_context_starts_at_s` ≥ 5, R-HOOK-02). The first 5 s must work for
someone who has never played: a mystery, problem, decision, ranking or shared nostalgia.

## Tone
Sad is fine, never gratuitously distressing or emotionally manipulative (R-ALGO-05). This is a teen/general audience.

## Where stories come from
`docs/STORY_BANK.md` (Phase 2) has empty slots by category; the owner fills it from chat. Claude Code never invents stories.
Superseded: `docs/season1/SEASON_1.md` §5b (Claude Code writing scripts) and its 30-card slate are history, not instructions.
