# Multiplication — design

Date: 2026-10-25. Size: project. Second of two projects; builds on the learning path
(`docs/superpowers/specs/2026-10-25-learning-path-design.md`, shipped on main).

## Intent and why

The child (Grade 2, British Columbia) asked for "times". Add multiplication as a third operation that teaches the way
her school will: BC introduces multiplication in Grade 3 as "groups of", arrays and repeated addition, connects it to
skip counting, says "memorization of facts is not intended" through Grade 5, and teaches bigger problems by
**decomposing** (breaking apart: 24 × 3 = 20 × 3 + 4 × 3). Whole-number multiplication in BC tops out around
3-digit × 1-digit. Hints should help her *think* — nudging toward a strategy she works out herself — rather than
walk her to the answer.

Success: she can climb from × 2 facts to 3-digit × 1-digit problems; when stuck, the hints and the block picture show
her a strategy she recognises from class, and she still produces the last step herself.

## Goals

- A 9-level multiplication ladder (below), adaptive like the others, unlocked by the learning path when addition is
  at level 6 and subtraction at level 5; announced as "New: multiplication!".
- Problems shown horizontally (`24 × 3 = ▢▢`); she types only the final answer with the existing number pad.
- Hints: one strategy per level; each tap is more specific along that strategy; **the last hint always stops one step
  short of the answer**; only Pass shows the answer.
- A "groups of" picture made of base-ten blocks (unit squares, ten-rods, hundred-flats) that appears on the first Hint
  tap and builds up with each hint.
- Streak, total, scoring, adaptation, sounds and the learning path work for multiplication exactly as for the others.

## Non-goals

- Division; 2-digit × 2-digit or larger; the standard column algorithm; area-model grids.
- Timed fact drills or memorisation modes; choosing an operation.
- Changing how addition and subtraction look or behave.

## Anti-goals (failure even if it "works")

- A hint (not Pass) that reveals the final answer.
- A busy screen before she asks for help: the picture must not appear until the first Hint tap.
- The picture crowding the problem, answer boxes or controls, or not fitting on a phone or iPad landscape.
- Losing or resetting saved progress on upgrade, or an older build wiping newer progress (the v2/v3 lesson).
- Any behaviour change to addition or subtraction from the restructuring (their existing tests must pass unchanged).

## Constraints

- Vanilla TypeScript + Vite PWA, no new runtime dependencies; plain DOM + CSS for the picture (it scales with the
  app's existing size variables and is testable in jsdom).
- Answers fit the existing 4-digit answer limit (`MAX_ANSWER = 4`; the largest product, 999 × 9 = 8991, does).
- Every level shares the existing ladder size (`MAX_LEVEL = 9`).
- Never run `npm run build` during development (dist/ is not the deployed site any more, but keep the habit); deploys
  happen when the user pushes to the `dev` / `prod` remotes.

## Approaches considered

1. **One module per operation (chosen).** Each operation owns its ladder rules, generator, target times, hint steps
   and layout behind a shared interface. Addition and subtraction are moved into that shape first with no behaviour
   change; multiplication is added as a third module. Chosen because multiplication differs on almost every axis
   (layout, hint semantics, picture), and this keeps each operation's rules in one place and leaves a slot for
   division later.
2. **A third branch in every shared file** (`levels.ts`, `generator.ts`, `solver.ts`, `problemView.ts`). Faster to a
   first version, but every shared file grows a third case with different rules, and two hint styles mix in one solver.

Picture rendering: DOM elements styled with CSS (chosen) over SVG, which gains nothing here.

## Decided

### Ladder

"Groups of" convention (user's decision): **the single digit is the number of groups** for multi-digit problems; for
facts, the group size follows the level's strategy (table below). Both written orders appear (2 × 6 and 6 × 2) for facts
(levels 1–7), so she meets turn-arounds early. Levels 8–9 always write the multi-digit number first (24 × 3), matching
the groups rule. (My calls, from the builder check: × 1 and × 0 appear only in level 6; levels 1–5 use 2–9 for the
other factor so no early hint degenerates into the answer.)

| Level | Problems | Group size (what's in each group) | Example → picture | Strategy |
|---|---|---|---|---|
| 1 | one factor 2, other 2–9 | 2 | 2 × 6 → 6 groups of 2 | skip count by 2s |
| 2 | one factor 10, other 2–9 | 10 (one ten-rod) | 10 × 4 → 4 groups of 10 | skip count by 10s |
| 3 | one factor 5, other 2–9 | 5 | 5 × 7 → 7 groups of 5 | skip count by 5s |
| 4 | one factor 3, other 2–9 | 3, drawn as 2 + 1 | 7 × 3 → 7 groups of 3 | double, plus one more |
| 5 | one factor 4, other 2–9 | 4, drawn as 2 + 2 | 6 × 4 → 6 groups of 4 | double, then double again |
| 6 | one factor from {0, 1, 2, 3, 4, 5, 10}, other 0–9 (mixed review) | the {0–5, 10} factor | 7 × 3 → 7 groups of 3 | turn it around if needed, then that table's strategy |
| 7 | both factors 6–9 | the bigger factor, drawn as 5 + the rest | 7 × 8 → 7 groups of 8 (5 + 3) | break apart into 5s and the rest |
| 8 | 2-digit (11–99, not a multiple of 10) × 2–9 | the 2-digit number, as rods + squares | 24 × 3 → 3 groups of 24 | break apart into tens and ones |
| 9 | 3-digit (101–999, not a multiple of 10) × 2–5 | the 3-digit number, as flats + rods + squares | 214 × 5 → 5 groups of 214 | break apart into hundreds, tens and ones |

Notes (my calls): level 9 limits the single digit to 2–5 so the picture stays drawable (BC's own example is
214 × 5); levels 8–9 exclude multiples of 10 because they don't exercise breaking apart. If both factors are the same
at level 7 (7 × 7), either is the group size. For level 6 with two qualifying factors (e.g. 3 × 5), the builder picks
one consistently (e.g. the smaller, so there are more, smaller groups).

### Hints (examples of the intended copy; builder finalises wording)

Rules: each tap adds one step; the last hint stops one step short; the picture grows with the hints. "Stops short"
means no hint states the final answer as a result (e.g. "= 72" or the answer in the tally); test it on the step model
(a flag or the absence of an answer value), not by searching hint text for the answer's digits, since intermediate
numbers can coincide with it. The bubble copy
uses BC's words: "groups of", "count by", "double", "break apart", "turn it around".

- **Skip counting** (levels 1–3, and the 2/5/10 cases of level 6). 6 groups of 2:
  1. "6 groups of 2. Count by 2s." (picture: the 6 groups)
  2. "2, 4, 6, 8, 10… what comes next?" (counts n − 1 groups, highlighting them; she adds the last group)
- **Double, plus one more** (level 4). 7 groups of 3, each drawn 2 + 1:
  1. "7 groups of 3. Each 3 is a 2 and a 1."
  2. "7 groups of 2 is double 7: 14. How many in the 7 ones?"
  3. "7 ones is 7. Now add 14 + 7."
  (My call: this is the user-approved "double plus one more group" expressed on the groups-of-3 picture, so the
  picture and words agree: 2n + n.)
- **Double, then double again** (level 5). 6 groups of 4, each drawn 2 + 2:
  1. "6 groups of 4. Each 4 is two 2s."
  2. "6 groups of 2 is double 6: 12. The other 2s make 12 too."
  3. "Now double 12: 12 + 12." (the stop-short step; she works out 24)
- **Turn it around** (level 6). When the written order puts the group size first (3 × 7 → 7 groups of 3), the first
  hint says so: "3 × 7 is the same as 7 × 3: 7 groups of 3." Then the table's strategy continues.
- **Zero and one** (level 6 only). These are one-step problems, so the single hint is the stop-short step: a question.
  × 0: no blocks, "How many are in 8 groups of nothing?" (or "0 groups of 8"). × 1: one group drawn,
  "How many are in 1 group of 7?"
- **Naming the groups** (all fact levels). The first hint always says "N groups of G" in the groups-rule order, whatever
  the written order; no separate turn-around step is added to levels 1–5.
- **Break apart into 5s and the rest** (level 7). 7 groups of 8, each drawn 5 + 3 in two colours:
  1. "7 groups of 8. Split each 8 into 5 and 3."
  2. "7 groups of 5 = 35. How many in 7 groups of 3?"
  3. "7 groups of 3 = 21. Now add 35 + 21."
- **Break apart into tens and ones** (level 8). 3 groups of 24:
  1. "3 groups of 24. Break 24 into 20 and 4."
  2. "The tens: 3 groups of 2 tens is 6 tens = 60. How many ones?"
  3. "3 groups of 4 = 12. Now add 60 + 12."
- **Hundreds, tens and ones** (level 9). 5 groups of 214: one hint per place (hundreds, tens, ones), then
  "Now add 1000 + 50 + 20." as the stop-short step.

Hints count against the streak and total exactly as today (any hint → not clean).

### Pass

Pass plays every hint step not yet shown, then a final step that states the answer and puts it in the answer boxes
as ghost digits, at the existing 1.5 s per step, ending in the existing "Next →" state.

### Picture

- Lives in the problem area under the equation, above nothing interactive; the hint bubble stays above the problem.
- Blocks: unit square, ten-rod, hundred-flat, in the app's palette; the "5 + rest" and "2 + 1" / "2 + 2" splits use
  two colours. Each group is circled (dashed outline) as in the approved mockup — option 1 of
  `docs/superpowers/specs/assets/2026-10-25-multiplication-three-ways.html`.
- **Levels 8–9 (user's decision): one group drawn in full, the rest as outlines.** For 24 × 3: one circled group drawn
  as 2 rods + 4 squares, then two more circles of the same size labelled "24". The tally does the counting
  ("3 groups of 2 tens = 6 tens = 60"); hint highlights apply to the drawn group and the matching part of each outline
  label. Levels 1–7 draw every group in full (at most 9 groups of 9 squares = 81).
- A running tally line under the groups ("6 tens = 60", "ones = ?") mirrors the hint text.
- Must fit, without overlapping the equation, answer boxes or controls, on every viewport in
  `.context/playwright/shots.mjs` (phones, phone landscape, iPads incl. 6th gen and 10.2" in Safari with tab bar).
  Blocks may scale down; level 9 may draw flats smaller. Verified with the Playwright layout check extended to
  multiplication problems at levels 1, 7, 8 and 9 with all hints shown.

### Layout and entry

- Horizontal equation: first factor, `×`, second factor, `=`, answer boxes. The number of boxes must **not** reveal the
  answer's length (my call, from the builder check): like today's answer row, give a fixed width per level that fits
  the longest possible answer at that level, with entry capped at that length (still within `MAX_ANSWER`).
- No scratch boxes for multiplication. Entry, backspace, submit, wrong-answer fade/shake and the correct bounce work
  as today.

### Target times (my call)

For the "quick" part of scoring: levels 1–7 (facts) 8 s; level 8: 20 s; level 9: 30 s.

### Saved progress

- Progress v4 under `math-practice-progress-v4`: `OpKey` gains `'multiplication'`, with its own ladder state.
  Load chain v4 → v3 → v2 → v1 keys → defaults; older keys never written.
- v3 → v4 upgrade: adds `multiplication: initialOpState()`; `unlocked` unchanged (the learning-path rule unlocks it on
  her next at-level answer if she already qualifies — the user confirmed that's expected).
- Unlock rule: `multiplication: { addition: 6, subtraction: 5 }` in `core/path.ts`.

### Code structure

- `Op` gains `'×'`. `Problem` keeps `{ op, a, b, level }` with `a`, `b` in written order.
- An operation-module interface (approach 1) covering at least: level matching, generation, target time, hint/Pass
  steps, and which layout the view uses. Addition and subtraction move behind it first, unchanged.
- Multiplication's steps describe picture state (groups, split, highlighted parts, tally) and bubble text instead of
  columns, ghosts and scratch values.

## Left to the builder

- The exact module interface and step types, file layout under `src/core/` and `src/ui/`.
- Final hint wording within the rules above; tally wording.
- Block sizes, colours (from the existing palette), and how the picture scales per viewport.
- Level 6 tie-break for two qualifying factors (keep it consistent).
- Tests: generator/level matching for all 9 levels (1,000 seeded problems each, as the existing generator tests do);
  hint steps per strategy, including that no hint step's text or picture states the final answer and Pass's last
  step does; the groups-of rule per level; v3→v4 upgrade with a realistic record; unlock at addition 6 + subtraction
  5 with "New: multiplication!"; UI tests for horizontal layout, entry and picture appearing only after the first
  hint; the Playwright layout check for multiplication.
