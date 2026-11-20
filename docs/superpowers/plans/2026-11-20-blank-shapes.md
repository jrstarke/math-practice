# Blank Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** About 1 in 3 add/sub problems put the blank somewhere other than after "=" (`6 + □ = 10`, `10 = □ + 4`, `8 + 3 = □ + 5`), on a 3-stage shape ladder of its own that starts at stage 1 for everyone.

**Architecture:** A problem gets optional `shape`, `stage` and `c`; `answerOf` becomes "the number she types". Progress v10 adds one shape ladder (`OpState`, stages 1–3) each for addition and subtraction; shape problems adapt that ladder and never the arithmetic one. `src/core/shapes.ts` holds the stage table and builds shape problems from the existing generators. Shapes get their own hint steps and their own view.

**Tech Stack:** TypeScript, Vite, Vitest (jsdom for UI tests), Playwright layout check.

**Spec:** `docs/superpowers/specs/2026-11-20-blank-shapes-design.md`

## Global Constraints

- Shapes only for `+` and `-`; three stages; stage table: stage 1 numbers from level 1, `+` `missing-b`, `-` `missing-b`; stage 2 numbers from level 2, `+` `missing-a`, `flipped`, `balance`, `-` `missing-a`, `flipped`; stage 3 numbers from level 3 or 4, `+` and `-` `missing-b`, `missing-a`. `balance` only for `+` stage 2.
- Everyone starts at stage 1 for both operations. A stage never exceeds her arithmetic level for that operation, and never 3.
- About 1 in 3 add/sub problems: `SHAPE_SHARE = 1 / 3`. Stage is her shape level 70% of the time, one below 20%, one above 10%, never past the cap. No shape during the welcome after an unlock.
- A shape problem adapts only the shape ladder, and only when it was at her current stage. It never changes the arithmetic ladder, never unlocks anything, and never plays a level-up (`levelChange` stays 0). Streak, total, day streak, welcome countdown, Robo and the world react as today.
- Hints for shapes stop one step short; only Pass shows the answer (the `passOnly` step carries the ghost digits).
- Progress v10 under key `math-practice-progress-v10`; the v9 key is read once and never written; every existing field survives.
- Existing behaviour with no shape must not change. `rng` is drawn for a shape only for `+`/`-`, outside the welcome, with a share above 0.
- Her iPad is the target (810pt portrait); rotation must not overlap the blank, answer, bubble, picture or controls.
- Run the whole suite (`npx vitest run`) and `npx tsc --noEmit` at the end of every task.

## Review Focus

- Typing the sum instead of the blank (`6 + □ = 10`, she types 10) is wrong and gets "try again". (Task 1, Task 6)
- A shape miss or success never changes her arithmetic level; a child at arithmetic level 6 starts at stage 1; stage never exceeds the cap. (Task 4)
- The same numbers in two shapes are two problems for the repeat check. (Task 4)
- A subtraction shape never makes a negative blank; `balance` never has `c >= a + b`. (Task 3)
- Pass on a shape problem fills the blank, Next works, and rotating mid-hint keeps the hint on the right box. (Task 6, Task 7)

---

### Task 1: A problem can carry a shape; `answerOf` is what she types

**Files:**
- Modify: `src/core/types.ts`, `src/core/arith.ts`
- Test: `src/core/arith.test.ts`

**Interfaces:**
- Produces in `types.ts`: `export type Shape = 'missing-b' | 'missing-a' | 'flipped' | 'balance'`; `Problem { op; a; b; level; shape?: Shape; stage?: number; c?: number }`. With `r = resultOf(p)`: `missing-b` is `a op □ = r`; `missing-a` is `□ op b = r`; `flipped` is `r = a op □`; `balance` (op `+`) is `a + b = □ + c`. For a shape problem `level` is the arithmetic level its numbers come from and `stage` is its shape stage.
- Produces in `arith.ts`: `resultOf(p: Problem): number` (the old `answerOf`); `answerOf(p: Problem): number` (the typed number: `resultOf` with no shape; `b` for `missing-b` and `flipped`; `a` for `missing-a`; `a + b - c` for `balance`). `answerColumns` keeps using `answerOf`.

- [ ] **Step 1: Write the failing tests** in `arith.test.ts`: `answerOf` for `{op:'+',a:6,b:4,level:1,shape:'missing-b'}` is 4; `{op:'-',a:12,b:5,level:2,shape:'missing-a'}` is 12; `{op:'+',a:5,b:7,level:2,shape:'flipped'}` is 7; `{op:'+',a:8,b:3,c:5,level:2,shape:'balance'}` is 6; no shape unchanged for all four ops; `resultOf` of the first is 10; `answerColumns` of the balance example is 1 and of `{op:'+',a:9,b:8,c:1,level:2,shape:'balance'}` is 2.
- [ ] **Step 2: Run** `npx vitest run src/core/arith.test.ts`. Expected: FAIL (`resultOf` not defined).
- [ ] **Step 3: Implement** the type changes, `resultOf` and `answerOf`.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: a problem can carry a blank shape; answerOf is the typed number`.

### Task 2: Shape ladders in progress v10

**Files:**
- Modify: `src/core/adaptive.ts`, `src/core/progress.ts`, `src/storage.ts`, `src/ui/testUtil.ts` and any fixture or helper that builds a progress by hand (search `version: 9` and `progress-v9`)
- Test: `src/core/adaptive.test.ts`, `src/storage.test.ts`

**Interfaces:**
- `adaptive.ts`: `SHAPE_MAX_STAGE = 3`; `update(s: OpState, score: number, maxLevel: number = MAX_LEVEL)` (a level-up past `maxLevel` is `change: 0`); `pickLevel(s: OpState, rng: Rng, maxLevel: number = MAX_LEVEL): number` (result never above `maxLevel`; the existing 70/20/10 rule otherwise).
- `progress.ts`: `export type ShapeKey = 'addition' | 'subtraction'`; `Progress` gets `version: 10` and `shapes: Record<ShapeKey, OpState>`; `defaultProgress()` sets both to `initialOpState()`.
- `storage.ts`: `STORAGE_KEY = 'math-practice-progress-v10'`; `V9_STORAGE_KEY = 'math-practice-progress-v9'`; `upgradeV9(p): Progress` adds `shapes` (both `initialOpState()`) and sets `version: 10`; `isValidProgress` requires `shapes` with both entries passing `isValidOpState` and `level` in 1..`SHAPE_MAX_STAGE`; the load chain tries v10, then v9 (then the existing chain through `upgradeV9`).

- [ ] **Step 1: Write the failing tests**: `update` with `maxLevel` 3 at level 3 and a perfect window gives `change: 0`; at level 2 it still levels up to 3; `pickLevel` with `maxLevel` 2 over 1000 seeded draws from level 2 never returns 3; defaults unchanged when `maxLevel` is omitted (existing tests). Storage: a realistic v9 record loads as v10 with every field kept and `shapes` both stage 1 with `calibrationLeft: 10`; saving afterwards writes only the v10 key and leaves the v9 string byte-identical; a valid v10 record round-trips; a v10 record with a `shapes` level of 4 or a missing entry is rejected and falls back to v9, then defaults. Update every existing storage test that names v9 or the `-v9` key.
- [ ] **Step 2: Run** `npx vitest run src/core/adaptive.test.ts src/storage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the three files per the Interfaces block; update hand-built progress fixtures.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: progress v10 with a shape ladder for addition and subtraction`.

### Task 3: The stage table, and building a shape problem

**Files:**
- Create: `src/core/shapes.ts`
- Modify: `src/core/levels.ts` (`matchesLevel`)
- Test: `src/core/shapes.test.ts`, `src/core/levels.test.ts`

**Interfaces:**
- Consumes: `Shape`, `Problem` (Task 1); `Progress`, `ShapeKey` (Task 2); `generate` (`src/core/generator.ts`); `Rng`.
- Produces in `shapes.ts`: `SHAPE_SHARE = 1 / 3`; `shapesFor(op: Op, stage: number): Shape[]` (the table, empty for other ops or stages); `numberLevelsFor(stage: number): number[]` (`1 → [1]`, `2 → [2]`, `3 → [3, 4]`); `stageCap(p: Progress, key: ShapeKey): number` (`Math.min(SHAPE_MAX_STAGE, p[key].level)`); `makeShapeProblem(op: '+' | '-', stage: number, arithLevel: number, rng: Rng): Problem` (numbers level drawn evenly from `numberLevelsFor(stage)` that are `<= arithLevel`; base from `generate(op, thatLevel, rng)`; shape drawn evenly from `shapesFor`; for `balance`, `c` in 1..9 with `c < a + b`, `c !== a`, `c !== b`; returns the base with `shape`, `stage`, and `c` when balance; `level` is the numbers level).
- `levels.ts` `matchesLevel(p)`: today's rule at `p.level`; when `p.shape` is set also `p.stage` is an integer 1..3, `numberLevelsFor(p.stage)` includes `p.level`, the shape is in `shapesFor(p.op, p.stage)`, and `balance` has an integer `c` with the bounds above.

- [ ] **Step 1: Write the failing tests**: `shapesFor` equals the table for `+` and `-` stages 1–3 and is `[]` for stage 4, 0 and for `×`/`÷`; over 1000 seeded problems per op and stage with `arithLevel` 9, every `makeShapeProblem` result passes `matchesLevel`, has `stage` as asked and `answerOf >= 1`; stage 3 with `arithLevel` 3 only ever has `level` 3, and with 9 has both 3 and 4; `balance` only appears for `+` stage 2 and `c` is in bounds; `matchesLevel` rejects `balance` for `-`, `missing-a` at `+` stage 1, a shape with no `stage`, and `balance` with `c >= a + b`.
- [ ] **Step 2: Run** `npx vitest run src/core/shapes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `shapes.ts` and the `matchesLevel` extension.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: stage table and shape problems`.

### Task 4: `nextProblem` and `recordResult` use the shape ladder

**Files:**
- Modify: `src/core/session.ts`
- Test: `src/core/session.test.ts`

**Interfaces:**
- Consumes: `makeShapeProblem`, `stageCap`, `SHAPE_SHARE` (Task 3); `update`, `pickLevel` with `maxLevel` (Task 2).
- Produces: `nextProblem(p: Progress, recent: Problem[], rng: Rng, shapeShare: number = SHAPE_SHARE): Problem`. After `pickOp`, when the op is `+` or `-`, `shapeShare > 0`, and the 3-problem welcome is not running for that op, draw `rng() < shapeShare`; if so `stage = pickLevel(p.shapes[key], rng, stageCap(p, key))` and the problem is `makeShapeProblem(op, stage, p[key].level, rng)`. The repeat check `same(x, y)` also compares `shape` and `c`.
- `recordResult`: a problem with a shape updates `progress.shapes[key]` with `update(p.shapes[key], score({...a, targetMs: targetMs(problem)}), stageCap(p, key))`, only when `problem.stage === p.shapes[key].level`; returns `levelChange: 0`, `unlocked: []`; the arithmetic ladder, unlocks and everything else behave as for any answer (streak, total, day, welcome).

- [ ] **Step 1: Write the failing tests**: with `shapeShare` 1 and a default progress (addition at level 1) `nextProblem` returns a stage-1 `missing-b` problem that passes `matchesLevel`; with share 0 it never has a shape and the rng sequence equals today's; an addition-level-6 progress with share 1 gets stage 1 first and never stage above 3; with arithmetic level 2 and `shapes.addition.level` 3 it never returns stage 3; during a welcome (`welcome: {op:'subtraction', left:3}`) with share 1 it returns no shape; `recent` holding `{op:'+',a:6,b:4,level:1}` does not suppress `{...,shape:'missing-b',stage:1}`; `recordResult` of a clean shape answer at the current stage moves `shapes.addition` window and leaves `addition` byte-identical; of a missed one never lowers `addition.level`; a shape answer at a different stage changes nothing but streak/total; two perfect shape answers in calibration raise `shapes.addition.level` to 2 only when arithmetic level is at least 2; the existing "avoids the last 10 problems" test still passes at the default share.
- [ ] **Step 2: Run** `npx vitest run src/core/session.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions per the Interfaces block.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. If a seeded test now depends on a non-shape problem, pass `0` as the share in that test.
- [ ] **Step 5: Commit** `feat: shape problems on their own ladder`.

### Task 5: Hints for shapes

**Files:**
- Create: `src/core/operations/shapeHints.ts`
- Modify: `src/core/solver.ts` (`solve` sends a problem with a shape to the new file)
- Test: `src/core/operations/shapeHints.test.ts`

**Interfaces:**
- Consumes: `Problem`, `Step` (`src/core/operations/types.ts`), `answerOf`, `resultOf`, `digitsOf`.
- Produces: `solveShape(p: Problem): Step[]`. Every shape has exactly 2 hint steps then 1 step with `passOnly: true`. Hint steps have `column: null`, empty `scratch`, empty `ghosts`. The `passOnly` step's `ghosts` spell `answerOf(p)` (`{column: i, digit}`, ones digit at column 0) and its text states the solved sentence, e.g. `6 + 4 = 10, so the missing number is 4.`
- Suggested copy (builder may reword, keep two hint steps): `missing-b`/`flipped` `+`: "You start at {a} and want {r}. How many more is that?" then "Count up from {a} until you reach {r}."; same shapes `-`: "You start with {a} and end with {r}. How many went away?" then "Count up from {r} to {a}. How many steps?"; `missing-a` `+`: "Something plus {b} makes {r}. What is {r} take away {b}?" then "Count back {b} from {r}."; `missing-a` `-`: "Take away {b} and {r} is left. What did you start with?" then "Start at {r} and count up {b}."; `balance`: "Both sides must be the same amount. What is {a} + {b}?" then "The left side is {a + b}. So {c} + something must also be {a + b}."

- [ ] **Step 1: Write the failing tests**: for every shape and op over 200 seeded `makeShapeProblem` problems per stage that allows it: `solveShape` returns 3 steps; the first two are not `passOnly` and have no ghosts and no scratch; the third is `passOnly` and its ghost digits read back to `answerOf(p)`; no hint-step text contains the `passOnly` text; `solve(p)` returns the same steps for a shape problem and the existing column steps for one without; `hintLimit(solve(p))` is 2.
- [ ] **Step 2: Run** `npx vitest run src/core/operations/shapeHints.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `solveShape` and the dispatch in `solve`.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: hints for blank shapes`.

### Task 6: The view, and wiring into the app

**Files:**
- Create: `src/ui/blankProblemView.ts`
- Modify: `src/ui/app.ts` (`render`, `AppDeps.shapeShare`, pass it to `nextProblem`), `src/main.ts` (dev-only `?shapeShare=<0..1>`, stripped from builds like `roboRng`), `src/styles.css`, `src/ui/testUtil.ts`
- Test: `src/ui/blankProblemView.test.ts`, `src/ui/app.test.ts` (new cases), existing suites

**Interfaces:**
- Consumes: `ProblemViewModel` (`src/ui/problemView.ts`), `answerOf`.
- Produces: `renderBlankProblem(container: HTMLElement, vm: ProblemViewModel): void`. It draws the sum on one line with the blank as the answer boxes in place: `missing-b` `a ＋ [ ][ ] = r`, `missing-a` `[ ][ ] ＋ b = r`, `flipped` `r = a ＋ [ ][ ]`, `balance` `a ＋ b = [ ][ ] ＋ c` (`−` for subtraction). The box group keeps `data-role="answer"` and the classes `answer-row`, `faded`, `correct`, `focused` that the shake and styles already use; each box is a `.cell` with `data-col`; a ghost row above it uses `[data-ghost]` exactly as `renderHorizontalProblem` does. The box count is the digit count of `answerOf(p)` (at least 1). The root `.problem` carries `data-shape`, `data-a`, `data-b`, `data-c`.
- `app.ts`: `render()` uses `renderBlankProblem` when `problem.shape` is set. `AppDeps.shapeShare?: number` goes to `nextProblem`. `testUtil.setup` defaults it to `0` so existing tests keep their problems, and its `current()` and `correctAnswer()` read the `data-` attributes when present.

- [ ] **Step 1: Write the failing tests**: for each shape `renderBlankProblem` gives the text order above (`container.textContent` with whitespace removed, boxes empty), the right number of `.cell` boxes in `[data-role="answer"]`, and `data-shape`; typed digits fill the boxes from the right; `faded`/`correct`/`focused` follow `entry.faded`, `phase`, `entry.focus`; vm ghosts appear as `[data-ghost]`. In `app.test.ts` with `shapeShare: 1` on a default progress (stage 1, `6 + □ = 10` style): typing the correct number finishes the problem; typing the sum instead is wrong and the boxes fade; two hint taps show two bubbles with no ghost digits and a disabled Hint button; Pass shows the ghost digits and then Next works; the arithmetic level in the saved progress is unchanged after a shape miss.
- [ ] **Step 2: Run** `npx vitest run src/ui`. Expected: FAIL.
- [ ] **Step 3: Implement** the view (reuse `renderHorizontalProblem`'s cell pattern and CSS classes; add only what the inline layout needs), the `render()` switch, the dep and the dev param.
- [ ] **Step 4: Run** the whole suite and `npx tsc --noEmit`; then `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: blank shapes in the app`.

### Task 7: Layout check, notes, docs

**Files:**
- Modify: `.context/playwright/shots.mjs` (fixture to v10 with `shapes` both `{level:1, window:[], calibrationLeft:10}`, key `math-practice-progress-v10`; a shapes flow), `.context/running.md`, `.context/decisions.md`, `.context/wip.md`
- Test: the Playwright layout check itself

**Interfaces:**
- Consumes: the dev-only `?shapeShare=1` URL value (Task 6).

- [ ] **Step 1: Add the shapes flow** to `shots.mjs`: per view (`ipad102-p`, `ipad102-p-tab`, `ipad102-l-tab`, `ip15`), with a fixture whose addition level is 4 and `shapes.addition.level` set to each stage 1, 2, 3 in turn and `?shapeShare=1`, play each shape and screenshot: fresh problem, after hint 1, after hint 2, after Pass, and after a rotation mid-hint; each state runs the existing no-overlap checks against the blank, answer, bubble, picture and controls.
- [ ] **Step 2: Run the check** as `.context/running.md` item 3 says (`node shots.mjs`, do not pipe it through `tail`). Expected: exit 0 except the one accepted failure listed there.
- [ ] **Step 3: Write the notes**: `running.md` (new flow, `?shapeShare`), `decisions.md` (shapes, the stage table, the rule that every new style gets its own ladder starting at the bottom and scoring separately, and how: a new `OpState` in `Progress`, a storage migration), `wip.md` (what to check on her iPad: a shape in each view, the hints stopping short, her arithmetic levels unchanged).
- [ ] **Step 4: Run** the whole suite, `npx tsc --noEmit` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `test: layout check for blank shapes; notes`.
