# Blank Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Some add/sub problems put the blank somewhere other than after "=" (`6 + □ = 10`, `10 = □ + 4`, `8 + 3 = □ + 5`), at the levels BC teaches it, and a new style re-settles her levels once.

**Architecture:** A problem gets an optional `shape` (and `c` for the both-sides shape); `answerOf` becomes "the number she types". A new rules file says which shapes each add/sub level allows; `nextProblem` applies one about 1 time in 3. Shapes get their own hint steps and their own view. Progress moves to v10 with a `styleVersion`; on load, a table says which operations re-calibrate.

**Tech Stack:** TypeScript, Vite, Vitest (jsdom for UI tests), Playwright layout check.

**Spec:** `docs/superpowers/specs/2026-11-20-blank-shapes-design.md`

## Global Constraints

- Shapes only on `+` and `-`, only at the levels in the spec's table; none at levels 5–9; `balance` (`8 + 3 = □ + 5`) only for `+` level 2.
- About 1 problem in 3 at a shape level: one constant, `SHAPE_SHARE = 1/3`.
- Hints for shapes stop one step short; only Pass shows the answer (`passOnly` step carries the ghost digits).
- A blank problem counts toward the ladder like any other. No change to scoring, streaks, Robo, the world.
- Progress v10 under key `math-practice-progress-v10`; the v9 key is read once, never written. Every existing field survives.
- Re-level: style version 1 re-calibrates addition and subtraction once (level kept, window cleared, `calibrationLeft` back to 10); a new player is not re-levelled; a locked operation is untouched.
- Existing behaviour with no shape must not change. `rng` is drawn for a shape only when the level allows shapes and the share is above 0.
- Her iPad is the target (810pt portrait); rotation must not overlap the blank, answer, bubble, picture or controls.
- Run the whole suite (`npx vitest run`) and `npx tsc --noEmit` at the end of every task.

## Review Focus

- Typing the sum instead of the blank (`6 + □ = 10`, she types 10) is wrong and gets "try again", not accepted. (Task 1, Task 5)
- The same numbers in two shapes are two problems for the repeat check, not one. (Task 3)
- A subtraction shape never makes a negative blank or a negative `c`; `balance` never has `c >= a + b`. (Task 2)
- Re-level fires once: loading the saved v10 again does not reset her again; a brand-new player and locked operations are not touched. (Task 6)
- Pass on a shape problem fills the blank, then Next works, and rotating mid-hint keeps the hint on the right box. (Task 5, Task 7)

---

### Task 1: A problem can carry a shape; `answerOf` is what she types

**Files:**
- Modify: `src/core/types.ts`, `src/core/arith.ts`
- Test: `src/core/arith.test.ts`

**Interfaces:**
- Produces in `types.ts`: `export type Shape = 'missing-b' | 'missing-a' | 'flipped' | 'balance'` and `Problem { op; a; b; level; shape?: Shape; c?: number }`. Meaning (the sum `a op b = r`, `r = resultOf(p)`): `missing-b` is `a op □ = r`; `missing-a` is `□ op b = r`; `flipped` is `r = a op □`; `balance` (op `+` only) is `a + b = □ + c`.
- Produces in `arith.ts`: `resultOf(p: Problem): number` (the old `answerOf`: result of `a op b`), and `answerOf(p: Problem): number` (the number typed: `resultOf` with no shape; `b` for `missing-b` and `flipped`; `a` for `missing-a`; `a + b - c` for `balance`). `answerColumns` keeps using `answerOf`.

- [ ] **Step 1: Write the failing tests** in `arith.test.ts`: `answerOf` for `{op:'+',a:6,b:4,level:1,shape:'missing-b'}` is 4; `missing-a` `{op:'-',a:12,b:5,level:2,shape:'missing-a'}` is 12; `flipped` `{op:'+',a:5,b:7,shape:'flipped'}` is 7; `balance` `{op:'+',a:8,b:3,c:5,shape:'balance'}` is 6; no shape is unchanged for all four ops; `resultOf` of the first is 10; `answerColumns` of the `balance` example is 1 and of `{op:'+',a:9,b:8,c:1,shape:'balance'}` is 2.
- [ ] **Step 2: Run** `npx vitest run src/core/arith.test.ts`. Expected: FAIL (`resultOf` not defined).
- [ ] **Step 3: Implement** `Shape`, the two optional fields, `resultOf`, and `answerOf` as above.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS (no shape anywhere yet).
- [ ] **Step 5: Commit** `feat: a problem can carry a blank shape; answerOf is the typed number`.

### Task 2: Which shapes each level allows, and `matchesLevel`

**Files:**
- Create: `src/core/shapes.ts`
- Modify: `src/core/levels.ts` (`matchesLevel`)
- Test: `src/core/shapes.test.ts`, `src/core/levels.test.ts`

**Interfaces:**
- Consumes: `Shape`, `Problem` (Task 1); `Rng` from `src/core/rng`.
- Produces in `shapes.ts`: `SHAPE_SHARE = 1 / 3`; `shapesFor(op: Op, level: number): Shape[]` (empty when none); `withShape(p: Problem, share: number, rng: Rng): Problem`.
- `shapesFor` table: `+` L1 `['missing-b']`; `-` L1 `['missing-b']`; `+` L2 `['missing-a','flipped','balance']`; `-` L2 `['missing-a','flipped']`; `+` and `-` L3 and L4 `['missing-b','missing-a']`; everything else `[]`.
- `withShape`: if `shapesFor` is empty or `share <= 0` return `p` and do not draw `rng`; otherwise draw once for the share (`rng() < share`), then pick one allowed shape uniformly. For `balance` choose `c` in 1..9 with `c < a + b`, `c !== a`, `c !== b`.
- `levels.ts` `matchesLevel(p)`: today's rule, and when `p.shape` is set it must be in `shapesFor(p.op, p.level)`, and `balance` needs an integer `c` with those same bounds.

- [ ] **Step 1: Write the failing tests**: `shapesFor` equals the table for each op and level 1–9 (a loop asserting levels 5–9 and `×`/`÷` are `[]`); `withShape` with share 0 returns the same object and a spy `rng` is never called; with share 1 at `+` L2 over 1000 seeded problems every result has a shape from the allowed list, `balance` has `c` in bounds and `answerOf >= 1`; at `-` L1..L4 `answerOf >= 1`; at L5 with share 1 it never sets a shape; at share `SHAPE_SHARE` over 3000 seeded draws at `+` L2 the fraction with a shape is within 0.28–0.38; `matchesLevel` rejects `{shape:'balance'}` at `-` L2, `{shape:'missing-a'}` at `+` L1, and `balance` with `c >= a + b`.
- [ ] **Step 2: Run** `npx vitest run src/core/shapes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `shapes.ts` and the `matchesLevel` extension per the Interfaces block.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: shape rules per level and matchesLevel`.

### Task 3: `nextProblem` applies a shape and tells shapes apart

**Files:**
- Modify: `src/core/session.ts`
- Test: `src/core/session.test.ts`

**Interfaces:**
- Consumes: `withShape`, `SHAPE_SHARE` (Task 2).
- Produces: `nextProblem(p: Progress, recent: Problem[], rng: Rng, shapeShare: number = SHAPE_SHARE): Problem`. The repeat check `same(x, y)` also compares `shape` and `c`.

- [ ] **Step 1: Write the failing tests**: with `shapeShare = 1` and addition at level 2, `nextProblem` returns a problem with a shape and `matchesLevel` true; with `shapeShare = 0` it never has one; `recent` containing `{op:'+',a:6,b:4,level:1}` does not block `{op:'+',a:6,b:4,level:1,shape:'missing-b'}` (call the repeat check through a small exported `same` or by forcing the rng); the existing "avoids the last 10 problems" test still passes with the default share.
- [ ] **Step 2: Run** `npx vitest run src/core/session.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the optional parameter, call `withShape(generate(...), shapeShare, rng)` on the final problem, and extend `same`.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. If a seeded test now depends on a non-shape problem, pass `0` as the share in that test.
- [ ] **Step 5: Commit** `feat: nextProblem applies a blank shape`.

### Task 4: Hints for shapes

**Files:**
- Create: `src/core/operations/shapeHints.ts`
- Modify: `src/core/solver.ts` (`solve` sends a problem with a shape to the new file)
- Test: `src/core/operations/shapeHints.test.ts`

**Interfaces:**
- Consumes: `Problem`, `Step` (`src/core/operations/types.ts`), `answerOf`, `resultOf`, `digitsOf`.
- Produces: `solveShape(p: Problem): Step[]`. Every shape has exactly 2 hint steps followed by 1 step with `passOnly: true`. Hint steps have `column: null`, empty `scratch`, empty `ghosts`. The `passOnly` step's `ghosts` spell `answerOf(p)` (`{column: i, digit}` with the ones digit at column 0) and its text states the solved sentence, e.g. `6 + 4 = 10, so the missing number is 4.`
- Suggested hint copy (builder may reword, keep two steps): `missing-b` and `flipped`, `+`: "You start at {a} and want {r}. How many more is that?" then "Count up from {a} until you reach {r}."; `-` `missing-b`/`flipped`: "You start with {a} and end with {r}. How many went away?" then "Count up from {r} to {a}. How many steps?"; `missing-a`, `+`: "Something plus {b} makes {r}. What is {r} take away {b}?" then "Count back {b} from {r}."; `-` `missing-a`: "Take away {b} and {r} is left. What did you start with?" then "Start at {r} and count up {b}."; `balance`: "Both sides must be the same amount. What is {a} + {b}?" then "The left side is {a + b}. So {c} + something must also be {a + b}."

- [ ] **Step 1: Write the failing tests**: for every shape and op, over 200 seeded problems from `withShape(generate(..), 1, rng)` at the levels that allow it: `solveShape` returns 3 steps, the first two are not `passOnly` and have no ghosts and no scratch, the third is `passOnly`, its ghost digits read back to `answerOf(p)`, and no hint-step text contains the `passOnly` text; `solve(p)` (the solver entry) returns the same steps for a shape problem and the column steps for a problem without one; `hintLimit(solve(p))` is 2.
- [ ] **Step 2: Run** `npx vitest run src/core/operations/shapeHints.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `solveShape` and the dispatch in `solve`.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: hints for blank shapes`.

### Task 5: The view, and wiring into the app

**Files:**
- Create: `src/ui/blankProblemView.ts`
- Modify: `src/ui/app.ts` (`render`, `AppDeps.shapeShare`, pass it to `nextProblem`), `src/main.ts` (dev-only `?shapeShare=<0..1>`, stripped from builds like `roboRng`), `src/styles.css`, `src/ui/testUtil.ts`
- Test: `src/ui/blankProblemView.test.ts`, `src/ui/app.test.ts` (new cases), existing suites

**Interfaces:**
- Consumes: `ProblemViewModel` (`src/ui/problemView.ts`), `answerOf`, `maxAnswerLength`.
- Produces: `renderBlankProblem(container: HTMLElement, vm: ProblemViewModel): void`. It draws the sum on one line with the blank as the answer boxes in place: `missing-b` `a ＋ [ ][ ] = r`, `missing-a` `[ ][ ] ＋ b = r`, `flipped` `r = a ＋ [ ][ ]`, `balance` `a ＋ b = [ ][ ] ＋ c` (use `−` for subtraction). The box group keeps `data-role="answer"` and the classes `answer-row`, `faded`, `correct`, `focused` that the shake and styles already use; each box is a `.cell` with `data-col`; a ghost row above it uses `[data-ghost]` exactly as `renderHorizontalProblem` does. The number of boxes is `answerOf(p)`'s digit count (at least 1). The root `.problem` element carries `data-shape`, `data-a`, `data-b`, `data-c` so tests read the problem.
- `app.ts`: `render()` picks `renderBlankProblem` when `problem.shape` is set. `AppDeps.shapeShare?: number` is passed to `nextProblem`; `testUtil.setup` defaults it to `0` so existing tests keep their problems, and its `current()` and `correctAnswer()` read the `data-` attributes when present.

- [ ] **Step 1: Write the failing tests**: for each shape, `renderBlankProblem` output has the text order above (read `container.textContent` with whitespace removed, boxes empty), the right number of `.cell` boxes in `[data-role="answer"]`, and `data-shape`; typed digits fill the boxes from the right; `faded`/`correct`/`focused` classes follow `entry.faded`, `phase`, `entry.focus`; ghosts from the vm appear as `[data-ghost]`. In `app.test.ts` with `shapeShare: 1` at addition level 1 (`6 + □ = 10` style): typing the correct number finishes the problem; typing the sum instead is wrong and the boxes fade; two hint taps show two bubbles with no ghost digits and a disabled Hint button; Pass shows the ghost digits and then Next works.
- [ ] **Step 2: Run** `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** the view (reuse `renderHorizontalProblem`'s cell pattern and CSS classes; add only what the inline layout needs), the `render()` switch, the dep and the dev param.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`; then `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: blank shapes in the app`.

### Task 6: Progress v10 and the re-level table

**Files:**
- Create: `src/core/styles.ts`
- Modify: `src/core/progress.ts` (version 10, `styleVersion`), `src/storage.ts` (v10 key, `V9_STORAGE_KEY`, `upgradeV9`, validation, apply re-level on load), `src/ui/testUtil.ts` if it builds progress
- Test: `src/core/styles.test.ts`, `src/storage.test.ts`

**Interfaces:**
- Produces in `styles.ts`: `STYLE_VERSION = 1`; `STYLE_RELEVEL: Record<number, OpKey[]> = { 1: ['addition', 'subtraction'] }`; `relevel(p: Progress): Progress`. For each version `v` with `p.styleVersion < v <= STYLE_VERSION`, each listed op that is in `p.unlocked` gets `{ ...state, window: [], calibrationLeft: 10 }` (level kept; use `initialOpState`'s calibration constant, exporting it from `adaptive.ts` if needed); the result has `styleVersion: STYLE_VERSION`. Equal versions return `p` unchanged.
- `Progress` gains `styleVersion: number` and `version: 10`; `defaultProgress()` sets `styleVersion: STYLE_VERSION`.
- `storage.ts`: `STORAGE_KEY = 'math-practice-progress-v10'`, `V9_STORAGE_KEY = 'math-practice-progress-v9'`; `upgradeV9(p): Progress` sets `version: 10, styleVersion: 0`; `isValidProgress` requires `styleVersion` an integer in 0..`STYLE_VERSION`; `load()` returns `relevel(...)` of whatever it parsed or upgraded (valid v10, or any older key through the chain); the chain adds v9 ahead of v8.

- [ ] **Step 1: Write the failing tests** in `styles.test.ts`: a progress with `styleVersion: 0`, addition level 5 with a full window and `calibrationLeft: 0`, subtraction unlocked, multiplication locked, comes back with addition and subtraction at the same levels, empty windows, `calibrationLeft: 10`, `styleVersion: 1`, multiplication and `unlocked` unchanged; `relevel` of an already current progress is the same object; a locked operation listed in the table is not touched. In `storage.test.ts`: a realistic v9 record loads as v10 with every field kept and the two operations re-calibrated; saving afterwards writes only the v10 key and leaves the v9 string byte-identical; loading the saved v10 record again does not reset `calibrationLeft` after she has answered (re-level fires once); a brand-new store returns the default with `styleVersion` 1 and calibration untouched beyond the default; a v10 record with `styleVersion: -1` or `1.5` is rejected and falls back to v9, then defaults. Update every existing storage test that names v9 or key `-v9`.
- [ ] **Step 2: Run** `npx vitest run src/core/styles.test.ts src/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `styles.ts`, the progress change and the storage chain. Also replace `version: 9` and the v9 key in any other fixture or helper that builds a progress by hand (search for `version: 9` and `progress-v9`).
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: progress v10 with a style version that re-levels once`.

### Task 7: Layout check, notes, docs

**Files:**
- Modify: `.context/playwright/shots.mjs` (fixture to v10 with `styleVersion: 1`, key `math-practice-progress-v10`; a shapes flow), `.context/running.md`, `.context/decisions.md`, `.context/wip.md`
- Test: the Playwright layout check itself

**Interfaces:**
- Consumes: the dev-only `?shapeShare=1` URL value (Task 5).

- [ ] **Step 1: Add the shapes flow** to `shots.mjs`: per view (`ipad102-p`, `ipad102-p-tab`, `ipad102-l-tab`, `ip15`), with addition at level 2 and `?shapeShare=1`, play every shape, taking a screenshot at: fresh problem, after hint 1, after hint 2, after Pass, and after a rotation mid-hint; each state runs the existing no-overlap checks against the blank, answer, bubble, picture and controls.
- [ ] **Step 2: Run the check** as `.context/running.md` item 3 says (`node shots.mjs`, do not pipe it through `tail`). Expected: exit 0 except the one accepted failure listed there.
- [ ] **Step 3: Write the notes**: `running.md` (new flow, `?shapeShare`), `decisions.md` (the shapes, the re-level table and how to add a new style: bump `STYLE_VERSION` and add a `STYLE_RELEVEL` entry), `wip.md` (what to check on her iPad: a shape in each view, the hints stopping short, and that her levels re-settle over the first 10 problems).
- [ ] **Step 4: Run** the whole suite, `npx tsc --noEmit` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `test: layout check for blank shapes; notes`.
