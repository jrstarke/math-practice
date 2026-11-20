# Blank shapes (missing-number problems) — design

Date: 2026-11-20. Size: project. Builds on the add/sub levels (`src/core/operations/addition.ts`, `subtraction.ts`) and the
research in `docs/research/2026-11-20-bc-curriculum-recommendation.md` (item 1) and
`docs/research/2026-11-19-bc-curriculum-gaps.md`.

## Intent and why

The child is in Grade 2 (British Columbia). Today every add/sub problem has the same shape: two numbers, an operator,
and the answer after "=". Children who only ever meet that shape come to read "=" as "write the answer here" instead of
"is the same amount as". Grade 2 understanding of the equal sign predicted later algebra reasoning better than IQ and
attention combined, and regular practice with the blank in other places, and with operations on both sides, builds the
"same as" reading (sources in the research doc). BC teaches it explicitly: Grade 2 "6 + n = 10", Grade 3 one-step
equations with the unknown at the start, middle or end (□ + 15 = 20, 12 + □ = 20, 6 + 13 = □).

Success: at the levels where BC teaches it, a share of add/sub problems put the blank somewhere other than after "="
(including an expression on each side), she answers with the same number pad, and when she is stuck the hints help her
find the missing number by counting up, making 10 or undoing the operation, without ever showing the answer until Pass.

## Goals

- **A "blank shape" on add/sub problems** (user chose this over a new operation and over a drill mode, 2026-11-20).
  Same two ladders, same adaptation, same scoring, same unlock rules. No new operation.
- **Placed by what BC teaches when (user: "as they make sense among the levels for the curriculum"; user reviewed the
  placement 2026-11-20: "looks reasonable"):**

  | Level | Numbers | Shapes allowed (besides today's "a ± b = ?") |
  |---|---|---|
  | + L1 (sums to 10) | 1–9 | make-10 blank `6 + □ = 10` |
  | − L1 (from ≤10) | | `10 − □ = 6` |
  | + L2 (sums 11–18) | | start unknown `□ + 5 = 12`; equals-first `12 = 5 + □`; both sides `8 + 3 = □ + 5` |
  | − L2 (from 11–18) | | start unknown `□ − 5 = 7`; equals-first `7 = 12 − □` |
  | + L3–4 (two-digit, no carrying) | | `23 + □ = 27`, `□ + 12 = 35` (the blank is one the answer is easy to find by counting up, no regrouping) |
  | − L3–4 (no borrowing) | | the same idea for subtraction |
  | L5–9 (carry/borrow, to 1000) | | none: today's problems only |

  The exact shapes per level are a starting point the builder may tune against what reads naturally, provided the
  principle holds: blanks only where no carry or borrow is involved, and the both-sides shape only at + L2.
- **Frequency (my call, user did not answer):** at a level that allows shapes, about 1 problem in 3 uses a shape and
  the rest stay today's form. One number in one place so it is easy to tune.
- **The blank is typed into place.** The answer boxes sit where the blank is inside the sum (e.g. `6 + [ ][ ] = 10`),
  with the same number pad and the same answer-box behaviour as today (faded on a wrong answer, "correct" colour,
  shake).
- **Hints for shapes are their own, short, and stop one step short** (my call): e.g. "What do you add to 6 to make 10?",
  then counting up from 6, or "10 − 6": what's left. Each tap goes one step further; the last hint stops before the
  answer; only Pass shows it. They do not use the column hints (carry/borrow columns would be nonsense here).
- **Re-level when a new style arrives (user, 2026-11-20: "each time we add a new style/shape of problem, we may want to
  re-level set").** Progress gets a `styleVersion`; a table says which operations re-settle at each style version.
  When she loads a save older than the current style version, those operations keep their level as the starting point,
  clear their score window and get the 10-problem calibration again (two perfect answers move up fast, a miss moves
  down), once. This release is style version 1 and re-levels addition and subtraction (my call: the user said "may
  want"; it is cheap, keeps her level, and the table makes turning it off a one-line change). Future new shapes bump
  the version and name their operations, with no new storage key. A new player is not re-levelled.
- A blank problem counts toward the level ladder like any other (my call: if a shape trips her up it holds her level
  back, which is the right signal). Streak, total, scoring, day streak, Robo and the world react exactly as today.

## Non-goals

- A new operation, a new ladder, a new unlock, a "puzzles" mode or a place to go on purpose.
- Blanks in multiplication or division (not taught as missing-number until Grade 4/5; revisit later).
- Blanks at carry/borrow levels or at the 3-digit levels.
- The later items from the recommendation (skip-counting, place value, mental-strategy hints, coins, even/odd). The
  mental-strategy hints (item 3) will want to reuse this design's hint style; do not block on it.
- Choosing a shape by hand; timed drills; new sounds or Robo scenes.

## Anti-goals

- Losing existing progress. The save moves to v10 (adds `styleVersion`); every field she has stays, and the v9 key is
  read, never written, so a rollback still finds her last v9 save.
- Making the ordinary problems rarer than 2 in 3 at a shape level, or the app feeling like a different game.
- Hints that give the answer (the last hint always stops one step short).
- Any change that makes today's problems or levels behave differently when no shape is used.

## Constraints from the code (what is true today)

- `Problem` is `{ op, a, b, level }`; `Op` is `'+' | '-' | '×' | '÷'`. `answerOf(p)` (`src/core/arith.ts`) is the only
  correctness check and always means the result of `a op b`; `src/ui/app.ts` compares the typed answer with it.
- `matchesLevel`, `generate` and the generator's retry loop (`src/core/generator.ts`) treat a problem as `a, b, level`;
  `nextProblem` (`src/core/session.ts`) avoids repeats by comparing `op, a, b`. A shape must be part of what makes
  two problems "the same" for that, or the same numbers in a different shape would be suppressed or repeated oddly.
- `targetMs` and `maxAnswerLen` are computed from the answer; they must be computed from the number the child types.
- Add/sub render with the column view (`renderColumnProblem`: scratch boxes, operands, rule, answer row); × and ÷ use
  the horizontal view (`renderHorizontalProblem`: `a × b =` then answer boxes). Neither draws the blank inline.
- Hints come from `solve(p)` returning `Step[]` (text, optional column, scratch, ghost digits keyed by answer column);
  `revealState`/`hintLimit` merge them; `app.ts` renders them. Add/sub steps are column-by-column.
- Progress is v9 under `math-practice-progress-v9`; `src/storage.ts` has one upgrade function per version, each
  version its own key, older keys read once and never written.
- Hidden test surface: ~830 unit tests, `tsc` clean, a Playwright layout check (`.context/running.md`) that screenshots
  problems per view and checks nothing overlaps; its fixtures use the current progress format.
- Her iPad is the target (iPadOS 18, 810pt wide in portrait; rotation must not break layout).

## Approaches considered

- **A. A blank "shape" on existing add/sub problems (chosen by the user).** Same ladders and progress; new hints and a
  new inline-blank view. Smallest change that adds the idea without adding a new thing to learn.
- **B. A fifth operation with its own 9 levels,** unlock rule, progress v10 and a "New: puzzles!" moment. Cleaner pacing,
  but a much larger change (`Op`, registry, unlocks, progress migration, Robo's unlock moment). Can still be the later
  step if a ramp of her own turns out to be needed.
- **C. A separate drill mode.** Ruled out: a place she goes on purpose, the opposite of the mix.

## Decided by the user

- Approach A, with shapes placed where they fit the BC curriculum.
- The level placement above ("looks reasonable").

## My calls (marked so they can be corrected)

- About 1 in 3 problems use a shape at the levels that allow one.
- The hint style and the "stops one step short" rule.
- Blank problems count toward level-up like others.
- No shapes at levels 5–9, and none for × or ÷.
- The inline blank is drawn as typed answer boxes inside the sum.

## Left to the builder

- Data shape: how a problem records its shape (an optional field on `Problem`, a second type, etc.), and how
  `answerOf`, `matchesLevel`, `targetMs`, `maxAnswerLen`, the dedupe check and `solve` consult it.
- How the view draws the blank inline for each shape (including the both-sides shape), and how ghost digits and the
  hint highlight attach to it; whether this is a new view or an extension of the horizontal one.
- The exact hint wording and number of steps per shape; whether counting up is shown with the existing picture or text.
- The tuning of exact shapes per level inside the table's principle, and how generation guarantees an answer in range
  (no negative numbers, no zero blank unless meant).
- Tests: shape generation per level obeys the table; every shape has one correct answer and it is the typed one; shapes
  never appear at L5–9; hints never reveal the answer before Pass; the same numbers in different shapes are different
  problems; unchanged behaviour at levels with no shapes; Playwright layout fixtures cover a shape problem in each view
  (portrait, landscape, small phone) with no overlap.
- Whether the frequency lives next to the level rules or in one constant.
