# Blank shapes (missing-number problems) — design

Date: 2026-11-20. Size: project. Builds on the add/sub levels (`src/core/operations/addition.ts`, `subtraction.ts`) and the
research in `docs/research/2026-11-20-bc-curriculum-recommendation.md` (item 1) and
`docs/research/2026-11-19-bc-curriculum-gaps.md`.

**Status: APPROVED by the user, 2026-11-22**, including the calls marked "my calls" (1 in 3 share, 70/20/10 stage mix, short hints that stop one step short, no shape in the welcome).

## Intent and why

The child is in Grade 2 (British Columbia). Today every add/sub problem has the same shape: two numbers, an operator,
and the answer after "=". Children who only ever meet that shape come to read "=" as "write the answer here" instead of
"is the same amount as". Grade 2 understanding of the equal sign predicted later algebra reasoning better than IQ and
attention combined, and regular practice with the blank in other places, and with operations on both sides, builds the
"same as" reading (sources in the research doc). BC teaches it explicitly: Grade 2 "6 + n = 10", Grade 3 one-step
equations with the unknown at the start, middle or end (□ + 15 = 20, 12 + □ = 20, 6 + 13 = □).

Being good at the arithmetic is not the same as being ready for the shape. A child doing two-digit + two-digit has
not necessarily seen `23 + □ = 27`. So **shapes have their own small ladder that starts at the bottom for everyone**,
whatever her arithmetic level (user, 2026-11-20). The same rule applies to any new style of problem added later: it
starts at its own beginning and calibrates before it reaches the level she has earned elsewhere.

Success: a share of add/sub problems put the blank somewhere other than after "=" (including an expression on each
side), starting with the easiest and climbing at her pace; she answers with the same number pad; when stuck, the hints
help her find the missing number by counting up, making 10 or undoing the operation, without showing the answer until
Pass; and a miss on a shape never costs her an arithmetic level.

## Goals

- **A "blank shape" on add/sub problems.** No new operation and no new unlock. Each of addition and subtraction gets a
  **shape ladder** of 3 stages (user chose these stages, 2026-11-20), using the existing adaptive machinery (a 5-answer
  window, a 10-problem calibration at the start, level up on a good window, down on two misses).

  | Stage | Numbers (arithmetic level they come from) | Shapes (`□` = the blank she types) |
  |---|---|---|
  | 1 | sums/minuends to 10 (L1) | `+`: `6 + □ = 10` (make 10). `−`: `10 − □ = 6` |
  | 2 | sums 11–18 (L2) | `+`: `□ + 5 = 12`, `12 = 5 + □`, `8 + 3 = □ + 5` (both sides). `−`: `□ − 5 = 7`, `7 = 12 − □` |
  | 3 | two-digit, no carry or borrow (L3 or L4) | `+` and `−`: `23 + □ = 27`, `□ + 12 = 35` (the blank is one found by counting up, no regrouping) |

  Stage 3 uses level 3 or level 4 numbers, whichever her arithmetic level allows, chosen evenly. No carry or borrow
  blanks, no 3-digit blanks, none for × or ÷. The both-sides shape appears only at `+` stage 2.
- **Everyone starts at stage 1** for both operations, including a child already at a high arithmetic level; she
  climbs through calibration quickly (two perfect answers in a row go up). Subtraction's shape ladder starts when
  subtraction is in the mix (the ladder exists from the start but has no problems until then).
- **Her arithmetic level caps the stage:** a shape stage never exceeds her arithmetic level for that operation (and
  never 3), so a child at arithmetic level 2 never meets two-digit blanks.
- **Shape problems score on the shape ladder only (my call).** A miss on `23 + □ = 27` never lowers her add/sub level,
  and a clean answer never raises it. Streak, total, day streak, Robo and the world react exactly as today.
- **Frequency (my call, user did not answer):** about 1 of 3 add/sub problems uses a shape, one number
  (`SHAPE_SHARE = 1 / 3`). Within shape problems the stage comes from her shape ladder the way levels come from the
  arithmetic one today: mostly her stage, sometimes one below, sometimes one above (never past the cap).
- **No shape during the 3-problem welcome** after an unlock (my call): the new operation arrives in its ordinary form.
- **The blank is typed into place.** The answer boxes sit where the blank is inside the sum (e.g. `6 + [ ][ ] = 10`),
  with the same number pad and the same answer-box behaviour as today (faded on a wrong answer, "correct" colour,
  shake). The blank is always at least two boxes wide (more if the answer has more digits), so a 10 fits: typing the
  sum of `9 + [ ] = 10` shows 10 and is wrong, and the box count does not give away the answer's digit count.
- **Hints for shapes are their own, short, and stop one step short** (my call): e.g. "What do you add to 6 to make 10?",
  then counting up from 6. Each tap goes one step further; the last hint stops before the answer; only Pass shows it.
  They do not use the column hints.
- **Adding any later style** means adding its own ladder state to progress (with a migration) and starting it at its
  bottom. There is no global "re-level" switch.

## Non-goals

- A new operation, a new unlock, a "puzzles" mode or a place she goes to on purpose.
- Blanks in multiplication or division (not taught as missing-number until Grade 4/5; revisit later).
- Blanks at carry/borrow levels or at the 3-digit levels.
- The later items from the recommendation (skip-counting, place value, mental-strategy hints, coins, even/odd). The
  mental-strategy hints (item 3) will want to reuse this design's hint style; do not block on it.
- Choosing a shape by hand; timed drills; new sounds or Robo scenes.

## Anti-goals

- Losing existing progress. The save moves to v10 (adds the two shape ladders); every field she has stays, and the v9
  key is read, never written, so a rollback still finds her last v9 save.
- A shape failure costing her an arithmetic level, or a new style dropping her into problems she has never seen.
- Making ordinary problems rarer than about 2 in 3 for an operation in the mix.
- Hints that give the answer (the last hint always stops one step short).
- Any change that makes today's problems or levels behave differently when no shape is used.

## Constraints from the code (what is true today)

- `Problem` is `{ op, a, b, level }`; `Op` is `'+' | '-' | '×' | '÷'`. `answerOf(p)` (`src/core/arith.ts`) is the only
  correctness check and always means the result of `a op b`; `src/ui/app.ts` compares the typed answer with it.
- `matchesLevel`, `generate` and the generator's retry loop (`src/core/generator.ts`) treat a problem as `a, b, level`;
  `nextProblem` (`src/core/session.ts`) avoids repeats by comparing `op, a, b`. A shape must be part of what makes
  two problems "the same".
- `recordResult` adapts the ladder only when `problem.level` equals the current level for that op; a shape problem
  must adapt the shape ladder instead, and only when it was at her current stage.
- `adaptive.update` and `pickLevel` clamp to `MIN_LEVEL..MAX_LEVEL` (1..9); the shape ladder tops out at 3.
- `targetMs` and `maxAnswerLen` are computed from the answer; they must be computed from the number the child types.
- Add/sub render with the column view (`renderColumnProblem`: scratch boxes, operands, rule, answer row); × and ÷ use
  the horizontal view (`renderHorizontalProblem`). Neither draws the blank inline.
- Hints come from `solve(p)` returning `Step[]` (text, optional column, scratch, ghost digits keyed by answer column,
  `passOnly`); `revealState`/`hintLimit` merge them; `app.ts` renders them.
- Progress is v9 under `math-practice-progress-v9`; `src/storage.ts` has one upgrade function per version, each
  version its own key, older keys read once and never written.
- Hidden test surface: ~830 unit tests, `tsc` clean, a Playwright layout check (`.context/running.md`) that screenshots
  problems per view and checks nothing overlaps; its fixtures use the current progress format.
- Her iPad is the target (iPadOS 18, 810pt wide in portrait; rotation must not break layout).

## Approaches considered

- **A. A blank "shape" on existing add/sub problems, tied to her arithmetic level.** Rejected after discussion
  (2026-11-20): readiness for a shape is not the same as arithmetic skill, a shape miss would cost an arithmetic level,
  and a child past level 4 would never see a blank.
- **A+. Shapes as a small ladder of their own on the existing operations (chosen by the user).** Starts at the bottom
  for everyone, scores separately, reuses the adaptive code; no new operation or unlock.
- **B. A fifth operation with its own 9 levels,** unlock rule and a "New: puzzles!" moment. Larger than needed; can
  still be the later step if shapes outgrow three stages.
- **C. A separate drill mode.** Ruled out: a place she goes on purpose, the opposite of the mix.

## Decided by the user

- Shapes on the add/sub problems (not a new operation), placed where they fit the BC curriculum.
- Each shape/style has its own ladder that starts at the bottom for everyone, and the three stages in the table.
- The level placement in the table ("looks reasonable").

## My calls (marked so they can be corrected)

- About 1 in 3 add/sub problems use a shape; stage picked 70% current, 20% below, 10% above (never past the cap).
- Shape problems score only on the shape ladder; no shape during the welcome.
- The stage cap by arithmetic level, and stage 3 drawing from levels 3 or 4.
- The hint style and the "stops one step short" rule.
- The inline blank is drawn as typed answer boxes inside the sum.

## Left to the builder

- Data shape: how a problem records its shape and stage (optional fields on `Problem`), and how `answerOf`,
  `matchesLevel`, `targetMs`, `maxAnswerLen`, the repeat check and `solve` consult it.
- How the view draws the blank inline for each shape (including the both-sides shape), how ghost digits and the hint
  highlight attach to it; a new view or an extension of the horizontal one.
- The exact hint wording and number of steps per shape.
- How the adaptive functions take a maximum level, and how the cap blocks a level-up past her arithmetic level.
- Tests: shape generation per stage obeys the table; every shape has one correct answer and it is the typed one;
  a shape miss never changes the arithmetic ladder; hints never reveal the answer before Pass; the same numbers in
  different shapes are different problems; unchanged behaviour with no shape; v9 → v10 keeps every field; Playwright
  layout fixtures cover a shape problem in each view (portrait, landscape, small phone) with no overlap.
