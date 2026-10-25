# Multiplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multiplication as a third operation — a 9-level "groups of" ladder with a base-ten-block picture and strategy hints that never state the final answer — unlocked once addition reaches level 6 and subtraction reaches level 5.

**Architecture:** Addition and subtraction move (behind a shared `OpModule` interface) into one file each under `core/operations/`, with no behaviour change; `levels.ts`/`generator.ts`/`solver.ts` become thin dispatchers that look an operation up in a registry, so every existing public function and test keeps working untouched. Multiplication is added as a third module producing a widened `Step`/`RevealState` shape (an optional `picture` field and a `passOnly` flag, both unused by add/sub) and its own horizontal UI (equation + fixed-width answer boxes + a block picture), parallel to today's vertical column view. Progress moves to v4 (adds a `multiplication` ladder) and `core/path.ts` gets its unlock rule; the existing "New: X!" announcement is reused as-is.

**Tech Stack:** TypeScript, Vite, Vitest (+ jsdom for UI tests), plain CSS, Playwright layout check.

**Spec:** `docs/superpowers/specs/2026-10-25-multiplication-design.md`

## Global Constraints

- Work on branch `feat/multiplication`, not `main`.
- **Phase 1 (Task 1) changes no behaviour.** Zero edits to `levels.test.ts`, `generator.test.ts`, `solver.test.ts`, `path.test.ts`, `session.test.ts`, `app.test.ts`, `hints.test.ts`, `entry.test.ts`. The task's own verification is "the whole suite still passes with no test file touched."
- `Op` gains `'×'`. Every exhaustive mapping over `Op` (the operations registry, `arith.ts`'s `answerOf`, `progress.ts`'s `opKey`/`opOf`, `problemView`/`testUtil`'s op-glyph checks) must handle `'×'` explicitly — never let it silently fall through a `'-'` branch of a binary ternary.
- `MAX_ANSWER = 4` (in `entry.ts`) stays the hard ceiling. Multiplication adds a *tighter*, per-level cap via `maxAnswerLength(p)`: 2 digits for levels 1–7, 3 for level 8, 4 for level 9 (computed from each level's largest possible product — see Task 2).
- No hint step, at any level, states or pictures the final answer — structurally, via a `passOnly` flag on the one trailing step that does (never by scanning hint text for the answer's digits, since intermediate numbers can coincide with it). Only `solve()`'s last step has `passOnly: true`; `Pass` shows it, `Hint` stops before it.
- Progress v4 key `math-practice-progress-v4`; load chain v4 → v3 → v2 → v1 → defaults; older keys read, never written. The v1/v2/v3 validators in `storage.ts` are untouched — `multiplication` is never added to the shared `hasValidCommonFields` (that would make every pre-v4 record, and even a same-version record missing the new field, invalid and reset her to zero).
- Unlock rule: `multiplication: { addition: 6, subtraction: 5 }` in `core/path.ts`'s `UNLOCK_RULES`. The "New: X!" announcement already in `app.ts`/`session.ts` is generic over `OpKey` — no changes needed there beyond `OpKey` itself gaining `'multiplication'`.
- Never run `npm run build`. Typecheck + build check: `npx tsc --noEmit && npx vite build --outDir /tmp/claude-1000/dist-check --emptyOutDir`. Tests: `npx vitest run`. Don't use `sed -i` on `/workspace` (edit with the Edit tool or `vite-node` instead).
- No import cycles: `core/operations/types.ts` has zero imports from the operation modules. `core/operations/{addition,subtraction,multiplication}.ts` import only `types.ts`, `../arith`, `../rng`, `../types`. `core/{levels,generator,solver}.ts` import the operations registry (never the reverse).

## Review Focus

- A level-6 problem where both factors could plausibly be "the special one" (e.g. `5×3`, `10×4`) must resolve to one deterministic groups-of reading and never produce more than 9 groups. → Task 2, tie-break tests on `10×4, 4×10, 2×10, 5×3, 1×10, 1×0, 0×0, 1×1`.
- No hint step, for any seeded problem at any level 1–9, states or pictures the final answer; the trailing `passOnly` step always does, so Pass still reaches the full answer everywhere (including level 9's 4-step ladder). → Task 2, a property test over all 9 levels.
- A player who already qualifies (addition ≥ 6, subtraction ≥ 5) when her save upgrades to v4 gets exactly one "New: multiplication!" on her very next answer — not suppressed, not double-fired. A v3 record otherwise loads as v4 with every field intact, and the v3/v2/v1 keys are untouched after the next save. → Task 3.
- Typing past a level's fixed answer width is ignored, and the box count is identical for the smallest and largest possible answer at that level (never leaks the answer's actual length). → Task 4.
- A level-9 problem whose multi-digit factor has a zero tens digit (e.g. `305 × 3`) hints cleanly — no stray "0 tens" step, no "+ 0" in the tally, and no zero-count entry in `parts` (so Task 5's renderer, which just iterates whatever `parts` it's given, never needs its own zero-handling). → Task 2.

---

### Task 1: Operation modules for addition and subtraction (no behaviour change)

**Files:**
- Create: `src/core/operations/types.ts`, `src/core/operations/addition.ts`, `src/core/operations/subtraction.ts`, `src/core/operations/registry.ts`
- Modify: `src/core/levels.ts`, `src/core/generator.ts`, `src/core/solver.ts`
- Test: none created or modified — see Global Constraints

**Interfaces:**
- Produces (`operations/types.ts`):
  ```ts
  export type Ghost = { column: number; digit: number };
  export interface Step {
    column: number | null; text: string;
    scratch: Record<number, string>; ghosts: Ghost[];
    picture?: PictureState;   // unused by addition/subtraction
    passOnly?: boolean;       // unused by addition/subtraction
  }
  export interface RevealState {
    column: number | null; text: string;
    scratch: Record<number, string>; ghosts: Record<number, number>;
    picture?: PictureState;
  }
  export interface PictureState { /* defined fully in Task 2; an empty placeholder type here */ }
  export interface OpModule {
    matchesLevel(p: Problem): boolean;
    generate(level: number, rng: Rng): Problem;
    targetMs(p: Problem): number;
    maxAnswerLen(p: Problem): number;   // addition/subtraction: always MAX_ANSWER (4)
    solve(p: Problem): Step[];
  }
  ```
- Produces (`operations/registry.ts`): `export const OPS: Record<Op, OpModule>` — for now keyed by `'+' | '-'` (today's `Op`); Task 2 widens `Op` and this record in the same change.
- Produces (`operations/addition.ts`, `operations/subtraction.ts`): each a `const additionModule: OpModule = {...}` / `subtractionModule`, holding exactly today's `matchesAddition`/`additionCols`/`solveAddition` (etc.) logic, moved verbatim. `maxAnswerLen` returns `MAX_ANSWER` (import from `../entry`).
- Produces (`levels.ts`): `matchesLevel(p) => OPS[p.op].matchesLevel(p)`, `targetMs(p) => OPS[p.op].targetMs(p)`, new `maxAnswerLength(p) => OPS[p.op].maxAnswerLen(p)`. `MIN_LEVEL`/`MAX_LEVEL` unchanged.
- Produces (`generator.ts`): `generate(op, level, rng) => ` same 1000-try retry loop as today, but building the candidate via `OPS[op].generate(level, rng)` and checking `OPS[op].matchesLevel`.
- Produces (`solver.ts`): `solve(p) => OPS[p.op].solve(p)`; `revealState(steps, count)` — same merge as today, plus (inert for now): `if (s.picture) state.picture = s.picture;` inside the loop (never touched when `s.picture` is absent, so `RevealState` objects for addition/subtraction keep exactly their current shape under `toEqual`). New `export function hintLimit(steps: Step[]): number { const i = steps.findIndex(s => s.passOnly); return i === -1 ? steps.length : i; }` (returns `steps.length` whenever no step is `passOnly`, i.e. always, for addition/subtraction today).

- [ ] **Step 1: Run the full suite and record the baseline**

  Run: `npx vitest run`
  Expected: all current tests pass (this is the baseline Step 4 must reproduce byte-for-byte in pass/fail terms).

- [ ] **Step 2: Create `operations/types.ts`** per the Interfaces block above (leave `PictureState` as `export type PictureState = unknown;` for now — Task 2 replaces it).

- [ ] **Step 3: Create `operations/addition.ts` and `operations/subtraction.ts`**

  Move `matchesAddition`/`additionCols` (from `levels.ts`/`generator.ts`) into `additionModule.matchesLevel`/`.generate`; move `solveAddition` (from `solver.ts`) into `.solve`; `.targetMs` is today's `targetMs` body; `.maxAnswerLen` returns `MAX_ANSWER`. Mirror for subtraction. Do not change any constant, string, or branch — this is a pure move.

- [ ] **Step 4: Create `operations/registry.ts`, and reduce `levels.ts`/`generator.ts`/`solver.ts` to dispatchers**

  Per the Interfaces block. Delete the now-dead `matchesAddition`/`matchesSubtraction`/`additionCols`/`subtractionCols`/`build`/`solveAddition`/`solveSubtraction`/helper constants from their old locations.

- [ ] **Step 5: Run the full suite and typecheck**

  Run: `npx vitest run && npx tsc --noEmit`
  Expected: identical pass/fail result to Step 1, with zero test files modified. If anything fails, the move introduced a behaviour change — fix the move, not the test.

- [ ] **Step 6: Commit**

  ```bash
  git add src/core/operations src/core/levels.ts src/core/generator.ts src/core/solver.ts
  git commit -m "refactor: move addition and subtraction behind an operation-module interface"
  ```

---

### Task 2: Multiplication core — ladder, generator, target times, hints and the picture model

**Files:**
- Create: `src/core/operations/multiplication.ts`, `src/core/operations/multiplication.test.ts`
- Modify: `src/core/types.ts` (widen `Op`), `src/core/arith.ts` (`answerOf`), `src/core/operations/types.ts` (replace the `PictureState` placeholder), `src/core/operations/registry.ts` (register multiplication)
- Test: `src/core/operations/multiplication.test.ts`, `src/core/arith.test.ts`

**Interfaces:**
- Consumes: `OpModule`, `Step`, `Ghost` (Task 1).
- Produces (`types.ts`): `export type Op = '+' | '-' | '×';`
- Produces (`arith.ts`): `answerOf` gains `p.op === '×' ? p.a * p.b : ...` (an explicit third branch, not a fallthrough).
- Produces (`operations/types.ts`):
  ```ts
  export interface PicturePart { label: string; count: number; revealed: boolean }
  export interface PictureState {
    totalGroups: number;     // the N in "N groups of G"
    groupSize: number;       // the G in "N groups of G" (e.g. 24, or 3)
    groupsShown: number;     // groups drawn in full so far: grows 0→totalGroups on levels 1–7; 0 or 1 on levels 8–9
    groupsOutlined: number;  // remaining groups shown as labelled outline circles (0 on levels 1–7)
    parts: PicturePart[];    // the one drawn group's breakdown, revealed left-to-right as hints progress
    tally: string[];         // running-total lines under the picture, e.g. ["6 tens = 60"]
  }
  ```
- Produces (`operations/multiplication.ts`): `export const multiplicationModule: OpModule`, plus these exported for direct testing:
  - `matchesLevel(p: Problem): boolean` — per the level table below.
  - `generate(level: number, rng: Rng): Problem` — builds and returns **one raw candidate**, same convention Task 1 established for addition/subtraction after its fix round: no internal retry loop and no `matchesLevel` call inside this function. `generator.ts`'s dispatcher (unchanged by this task) already retries up to 1000 times and checks `matchesLevel` itself, throwing if none match. Multiplication's construction is deterministic (pick the constrained factor(s) per the level table directly), so in practice it should match on the first try every time — but the function signature and responsibility split must still match addition/subtraction's.
  - `targetMs(p: Problem): number` — flat per level (table below), not the `answerColumns` formula.
  - `maxAnswerLen(p: Problem): number` — 2 (levels 1–7), 3 (level 8), 4 (level 9).
  - `solve(p: Problem): Step[]` — always ends with exactly one `{ passOnly: true, ghosts: <answer's digits>, text: "<a> × <b> = <answer>.", picture: <final picture>, column: null, scratch: {} }` step; every earlier step has `passOnly` absent/false and never carries the answer in `ghosts`, text, or picture.
  - `groupAssignment(a: number, b: number, level: number): { groupSize: number; totalGroups: number; needsTurnAround: boolean }` — the level-6 tie-break and turn-around logic, exported so Task-5's picture tests and Task-2's own tests can both exercise it directly (see rule below).
- Produces (`registry.ts`): `OPS` now `Record<'+' | '-' | '×', OpModule>`.

**Level table (value constraints for `matchesLevel`; `generate` must only ever produce matches):**

| Level | Constraint | Written order |
|---|---|---|
| 1 | one of `a,b` is exactly `2`, the other in `[2,9]` | either order |
| 2 | one of `a,b` is exactly `10`, the other in `[2,9]` | either order |
| 3 | one of `a,b` is exactly `5`, the other in `[2,9]` | either order |
| 4 | one of `a,b` is exactly `3`, the other in `[2,9]` | either order |
| 5 | one of `a,b` is exactly `4`, the other in `[2,9]` | either order |
| 6 | one of `a,b` ∈ `{0,1,2,3,4,5,10}`, the other in `[0,9]` | either order |
| 7 | both `a,b` in `[6,9]` | either order |
| 8 | `a` in `[11,99]` and not a multiple of 10; `b` in `[2,9]` | `a` is always the 2-digit factor |
| 9 | `a` in `[101,999]` and not a multiple of 10; `b` in `[2,5]` | `a` is always the 3-digit factor |

**Target times (flat, per level):** 1–7 → `8000`; 8 → `20000`; 9 → `30000`.

**`groupAssignment` rule (deterministic, in priority order — first match wins):**
1. If either factor is `0`: that `0` is `groupSize`; the other factor is `totalGroups`.
2. Else if either factor is `1`: that `1` is `totalGroups`; the other factor is `groupSize`.
3. Else if either factor is `10`: `10` is `groupSize`; the other factor is `totalGroups`.
4. Else (levels 1–5, and level-6 pairs outside the above): the smaller factor is `groupSize`; the larger is `totalGroups`.
5. Levels 8–9: `groupSize = a` (the multi-digit factor), `totalGroups = b`, always — rules 1–4 don't apply (b is 2–9 or 2–5, never 0/1/10/tied).
6. `needsTurnAround` (level 6 only, used by the first hint step) is `true` iff `a === groupSize` — i.e. the written equation states the group size before the group count, so the groups-of reading has to flip it (`"3 × 7 is the same as 7 × 3: 7 groups of 3"`).

This rule keeps `totalGroups ≤ 9` always (bounded by the `[0,9]`/`[2,9]` "other" factor) and agrees with every lower level's own fixed group-size (2, 3, 4, 5) whenever a level-6 pair overlaps one.

**Hint-step counts (excluding the trailing `passOnly` step, which always adds one more):**

| Level | Steps | Strategy |
|---|---|---|
| 1, 2, 3 | 2 | skip counting |
| 4 | 3 | double, plus one more (2+1 split) |
| 5 | 3 | double, then double again (2+2 split) |
| 6, factor is 0 or 1 | 1 | one-step question |
| 6, otherwise | 2 (+1 if `needsTurnAround`) | skip counting, turned around first if needed |
| 7 | 3 | break into 5s and the rest |
| 8 | 3 | break into tens and ones |
| 9 | 4 | one step per place (hundreds, tens, ones), then the stop-short add |

Exact hint copy is the implementer's call (follow the spec's example wording and BC vocabulary: "groups of", "count by", "double", "break apart", "turn it around"); the step *count* and the *no-answer-until-`passOnly`* rule above are not.

- [ ] **Step 1: Write the failing tests** in `multiplication.test.ts`

  Mirror `levels.test.ts` + `generator.test.ts` style:
  ```ts
  for (let level = 1; level <= 9; level++)
    test(`× level ${level}: 1000 seeded problems all match`, () => {
      const rng = mulberry32(level * 100 + 3);
      for (let i = 0; i < 1000; i++) {
        const p = generate('×', level, rng);
        expect(p.level).toBe(level);
        expect(matchesLevel(p)).toBe(true);
      }
    });
  ```
  Plus: boundary true/false cases per the level table (same `test.each` shape as `levels.test.ts`); `targetMs` for one problem per level equals the flat table; `maxAnswerLen` equals 2/3/4 by level band.

  `groupAssignment` tie-break table:
  ```ts
  test.each([
    [10, 4, 10, 4], [4, 10, 10, 4], [2, 10, 10, 2], [5, 3, 3, 5],
    [1, 10, 10, 1], [1, 0, 0, 1], [0, 0, 0, 0], [1, 1, 1, 1],
  ])('groupAssignment(%i, %i) → size %i, groups %i', (a, b, size, groups) => {
    const r = groupAssignment(a, b, 6);
    expect(r.groupSize).toBe(size);
    expect(r.totalGroups).toBe(groups);
  });
  ```

  Hint/Pass property test (the Review Focus item):
  ```ts
  test('no hint step states or pictures the answer; the trailing step always does, at every level', () => {
    for (let level = 1; level <= 9; level++) {
      const rng = mulberry32(level + 500);
      for (let i = 0; i < 300; i++) {
        const p = generate('×', level, rng);
        const steps = solve(p);
        const answer = p.a * p.b;
        const last = steps.at(-1)!;
        expect(last.passOnly).toBe(true);
        expect(revealState(steps, Infinity).ghosts).toEqual(/* digits of answer, ones-first */ ...);
        for (const s of steps.slice(0, -1)) {
          expect(s.passOnly).toBeFalsy();
          expect(s.text).not.toContain(String(answer)); // see note below
          expect(s.ghosts).toEqual([]);
        }
      }
    }
  });
  ```
  Note on the text assertion: the spec warns intermediate numbers can coincide with the answer's digits, so this `toContain` check is a cheap first filter, not the real guarantee — the real guarantee is structural (`ghosts: []` and no `picture` field stating the final product). Keep both checks; don't rely on the text one alone.

  Level-9 zero-tens case (Review Focus): `solve({ op: '×', a: 305, b: 3, level: 9 })` — assert no step's `text` contains `"0 tens"` or a bare `"+ 0"`, and `parts` for the tens place is simply omitted (not a zero-count part) wherever Task 2's step building reaches that place.

  `arith.test.ts`: add `expect(answerOf({ op: '×', a: 6, b: 7, level: 1 })).toBe(42);` and `expect(answerColumns({ op: '×', a: 24, b: 3, level: 8 })).toBe(2);` (this is the file listed under Test above, and Step 5 commits it — don't skip it).

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run src/core/operations/multiplication.test.ts src/core/arith.test.ts`
  Expected: FAIL — `multiplicationModule` doesn't exist yet.

- [ ] **Step 3: Implement** `multiplication.ts` per the Interfaces, level table, target times, `groupAssignment` rule, and hint-step counts above; widen `Op` in `types.ts`; extend `answerOf`; register in `registry.ts`.

- [ ] **Step 4: Run all tests and typecheck**

  Run: `npx vitest run && npx tsc --noEmit`
  Expected: all pass, including the full existing suite (Task 1's baseline) with still zero non-Task-2 test files touched.

- [ ] **Step 5: Commit**

  ```bash
  git add src/core/types.ts src/core/arith.ts src/core/operations/types.ts src/core/operations/multiplication.ts src/core/operations/multiplication.test.ts src/core/operations/registry.ts src/core/arith.test.ts
  git commit -m "feat: add multiplication ladder, generator, and strategy hints"
  ```

---

### Task 3: Progress v4, unlock rule, and storage migration

**Files:**
- Modify: `src/core/progress.ts`, `src/core/path.ts`, `src/storage.ts`
- Test: `src/storage.test.ts`, `src/core/path.test.ts`

**Interfaces:**
- Consumes: `Op` now includes `'×'` (Task 2).
- Produces (`progress.ts`): `export type OpKey = 'addition' | 'subtraction' | 'multiplication';` `Progress` gains `multiplication: OpState`, `version: 4`. `defaultProgress()` → `version: 4, unlocked: ['addition']` (unchanged otherwise) with `multiplication: initialOpState()`. `opKey`/`opOf` become exhaustive (a lookup object or `switch`, not a binary ternary): `{'+':'addition','-':'subtraction','×':'multiplication'}` and its inverse.
- Produces (`path.ts`): `UNLOCK_RULES.multiplication = { addition: 6, subtraction: 5 };`
- Produces (`storage.ts`): `STORAGE_KEY = 'math-practice-progress-v4'`; existing `STORAGE_KEY` (today's v4-to-be-v3) renamed `V3_STORAGE_KEY = 'math-practice-progress-v3'`; `V2_STORAGE_KEY`, `LEGACY_STORAGE_KEY` unchanged. New `isValidProgress` (v4) = today's v3 checks (kept verbatim, renamed `isValidProgressV3`) **plus** `isValidOpState(x.multiplication)` **plus** `version === 4` **plus** an `isValidUnlocked` that now accepts `'multiplication'` too (a separate v4 unlocked-validator; the v3 one is untouched and still only accepts `'addition'|'subtraction'`). `upgradeV3(v3): Progress` = `{ ...v3, version: 4, multiplication: initialOpState() }` — `unlocked` **unchanged** (per the design: the learning-path rule unlocks multiplication on her next at-level answer if she already qualifies). Load chain: v4 → v3 → v2 → v1 → defaults, each old key read once, never written.

- [ ] **Step 1: Write the failing tests**

  `storage.test.ts` — rename existing v3-targeted tests' key references to `V3_STORAGE_KEY`; add, mirroring the learning-path task's style:
  ```ts
  test('defaults are v4 with multiplication unstarted', () => {
    expect(defaultProgress()).toMatchObject({ version: 4, unlocked: ['addition'] });
    expect(defaultProgress().multiplication).toEqual({ level: 1, window: [], calibrationLeft: 10 });
  });

  test('migrates a v3 record, keeping unlocked exactly as-is', () => {
    const s = mem();
    const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'] };
    delete (v3 as any).multiplication;
    s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
    const loaded = createStore(s).load();
    expect(loaded).toEqual({ ...v3, version: 4, multiplication: { level: 1, window: [], calibrationLeft: 10 } });
  });

  test('v3 is preferred over v2/v1, and all older keys are left untouched by save', () => {
    const s = mem();
    const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 90 };
    delete (v3 as any).multiplication;
    s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
    const store = createStore(s);
    store.save(store.load());
    expect(JSON.parse(s.m.get(V3_STORAGE_KEY)!)).toEqual(v3);
    expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 4, total: 90 });
  });
  ```
  Add to the invalid `test.each` list (stored under `STORAGE_KEY`): a record missing `multiplication`, one with `multiplication` out of range, one with `unlocked: ['multiplication']` (addition missing), one with `unlocked: ['addition', 'division']`.

  `path.test.ts` — add: `UNLOCK_RULES.multiplication` equals `{ addition: 6, subtraction: 5 }`; an `applyUnlocks` case where addition is at 6 and subtraction at 5 unlocks `['multiplication']` and seeds it at level 1 with calibration 10; a case at addition 5 (one short) unlocks nothing.

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run src/storage.test.ts src/core/path.test.ts`
  Expected: FAIL (still v3, no multiplication unlock rule).

- [ ] **Step 3: Implement** per the Interfaces block.

- [ ] **Step 4: Run all tests and typecheck**

  Run: `npx vitest run && npx tsc --noEmit`
  Expected: all pass. Any test elsewhere that built a `Progress`/`OpKey` literal by hand now needs `multiplication` (ledger it).

- [ ] **Step 5: Commit**

  ```bash
  git add src/core/progress.ts src/core/path.ts src/storage.ts src/storage.test.ts src/core/path.test.ts
  git commit -m "feat: add progress v4 and the multiplication unlock rule"
  ```

---

### Task 4: Horizontal layout, answer-width cap, and hint/Pass wiring

**Files:**
- Create: `src/ui/horizontalProblemView.ts`
- Modify: `src/core/entry.ts` (`pressKey`), `src/ui/problemView.ts` (rename export, see below), `src/ui/app.ts`, `src/ui/testUtil.ts`, `src/styles.css`
- Test: `src/core/entry.test.ts`, `src/ui/app.test.ts`, new `src/ui/horizontalProblemView.test.ts`

**Interfaces:**
- Consumes: `maxAnswerLength(p)` (the dispatcher from Task 1, returning multiplication's 2/3/4-digit numbers supplied by Task 2's `maxAnswerLen`), `hintLimit(steps)` (Task 1), `Step`/`RevealState` with `picture`/`passOnly` (Tasks 1–2).
- Produces (`entry.ts`): `pressKey(s: EntryState, key: Key, maxLen: number = MAX_ANSWER)` — same body, `MAX_ANSWER` replaced by the parameter. Every existing call site that doesn't pass a third argument is unaffected.
- Produces (`problemView.ts`): today's `renderProblem` renamed `renderColumnProblem` (same signature/behaviour); `scratchColumns` unchanged.
- Produces (`horizontalProblemView.ts`): `export function renderHorizontalProblem(container: HTMLElement, vm: ProblemViewModel): void` — DOM shape: an equation line with `data-role="top"` (= `String(p.a)`), `data-role="op"` (`'×'`), `data-role="bottom"` (= `String(p.b)`), a plain `=` span, then an **answer row reusing the existing cell-grid pattern** (same `row()`-style helper, `cols = maxAnswerLength(p)`, `data-role="answer"` with per-column cells, a `data-ghost=<col>` ghost row overlay) — so `data-ghost`, `shake(...[data-role="answer"])`, and the `faded`/`correct`/`focused` classes all work exactly as the column view's. No scratch row.
- Produces (`app.ts`): `render()` picks `problem.op === '×' ? renderHorizontalProblem : renderColumnProblem`; `pressKey` calls become `pressKey(entry, key, maxAnswerLength(problem))`; `hint()`'s guard and `allShown` in `render()` use `hintLimit(steps)` instead of `steps.length` (Pass logic — `passStep()`/`pass()` — keeps using `steps.length`, since Pass must still walk every step including the trailing `passOnly` one).
- Produces (`testUtil.ts`): `current().op` resolves `'+' | '-' | '×'` from the `op` role's text; `correctAnswer()` switches on `op` (`+`→add, `-`→subtract, `×`→multiply).

- [ ] **Step 1: Write the failing tests**

  `entry.test.ts`: add a case that `pressKey(s, '9', 2)` twice then a third `'9'` leaves the answer at `'99'` (capped at `maxLen`), and that `back`/`submit` are unaffected by `maxLen`.

  `horizontalProblemView.test.ts` (new, jsdom): render a `{ op: '×', a: 24, b: 3, level: 8 }` problem with `entry.answer = '7'`; assert `[data-role="top"]` textContent is `'24'`, `[data-role="op"]` is `'×'`, `[data-role="bottom"]` is `'3'`, and the answer row has exactly `maxAnswerLength` cells (3 for level 8) regardless of whether the typed/ghosted value is shorter.

  `app.test.ts`: add a fixture that forces a multiplication problem (give `multiplication` a calibrating level and set it as the only unlocked op via `testUtil`'s raw `initial` override, which bypasses storage validation) and assert: the rendered op glyph is `×`; typing the correct product and submitting records a clean answer; tapping Hint `hintLimit(steps)` times disables the Hint button while the ghost answer is still empty (not yet revealed); one more tap of Pass (not Hint) then auto-plays to the full ghost answer.

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run src/core/entry.test.ts src/ui/horizontalProblemView.test.ts src/ui/app.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** per the Interfaces block. Add CSS for the horizontal equation line in `styles.css` (plain inline spans, reusing `--cell`-derived font sizing loosely; the answer row reuses the existing `.row`/`.cell`/`.answer-row`/`.ghost-row` rules as-is since the DOM shape matches).

- [ ] **Step 4: Run all tests and typecheck**

  Run: `npx vitest run && npx tsc --noEmit`
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/core/entry.ts src/core/entry.test.ts src/ui/problemView.ts src/ui/horizontalProblemView.ts src/ui/horizontalProblemView.test.ts src/ui/app.ts src/ui/app.test.ts src/ui/testUtil.ts src/styles.css
  git commit -m "feat: horizontal layout and hint/pass wiring for multiplication"
  ```

---

### Task 5: Picture rendering

**Files:**
- Create: `src/ui/pictureView.ts`, `src/ui/pictureView.test.ts`
- Modify: `src/ui/app.ts`, `src/styles.css`
- Test: `src/ui/pictureView.test.ts`, `src/ui/app.test.ts`

**Interfaces:**
- Consumes: `PictureState`/`PicturePart` (Task 2), `RevealState.picture` (Task 1/2).
- Produces (`pictureView.ts`): `export function renderPicture(container: HTMLElement, state: PictureState | null): void` — clears the container when `state` is `null` (so nothing shows before the first Hint tap); otherwise renders `state.groupsShown` full groups (each built from `state.parts`, two colours when more than one part is `revealed`), `state.groupsOutlined` labelled outline circles (levels 8–9 only — `groupsShown` is 0 or 1 there), and a tally list from `state.tally`.
- Produces (`app.ts`): mount a `pictureHost` element inside `problemArea` (below `problemHost`, above the controls); `render()` calls `renderPicture(pictureHost, reveal.picture ?? null)` every render, for every operation (a no-op clear for addition/subtraction, since their `Step`s never set `picture`).

- [ ] **Step 1: Write the failing tests** in `pictureView.test.ts`

  - `renderPicture(el, null)` leaves the container empty.
  - A level-1-shaped state (`totalGroups: 6, groupSize: 2, groupsShown: 3, groupsOutlined: 0, parts: [{label:'2', count:2, revealed:true}], tally: []`) renders exactly 3 full groups and 0 outlines.
  - A level-8-shaped state (`groupsShown: 1, groupsOutlined: 2`) renders exactly 1 full group and 2 outline circles.
  - Tally lines render in order as the state's `tally` array.

  `app.test.ts`: with a forced multiplication problem (same fixture pattern as Task 4), assert the picture container is empty before any Hint tap, and non-empty after the first.

- [ ] **Step 2: Run to verify they fail**

  Run: `npx vitest run src/ui/pictureView.test.ts src/ui/app.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement** per the Interfaces block, plus CSS in `styles.css` for blocks (unit square / ten-rod / hundred-flat, reusing the existing palette variables), the two-colour split, dashed-circle group outlines, and the tally list — sized to scale with `--cell` the way the existing problem grid does.

- [ ] **Step 4: Run all tests and typecheck**

  Run: `npx vitest run && npx tsc --noEmit`
  Expected: all pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/ui/pictureView.ts src/ui/pictureView.test.ts src/ui/app.ts src/ui/app.test.ts src/styles.css
  git commit -m "feat: render the groups-of block picture on hint"
  ```

---

### Task 6: Playwright layout check and cross-viewport fit

**Files:**
- Modify: `.context/playwright/shots.mjs`, `src/styles.css` (only if Step 3 finds overflow to fix)

**Interfaces:**
- Consumes: the finished app (Tasks 1–5).

- [ ] **Step 1: Extend the fixture and problem matrix**

  Update the stored-progress fixture to the v4 key (`math-practice-progress-v4`) with `multiplication` calibrating at levels 1, 7, 8 and 9 in turn (one run per level) and `addition`/`subtraction` at level 9 (so they only draw the review share, keeping most generated problems multiplication); reload until the rendered op glyph is `×` before screenshotting, same pattern already used for level fixtures. Add all hint/pass states (same matrix as today: answering with 0/1/2/.../all hints shown, passing, passed) for each of the four levels across all 13 viewports.

- [ ] **Step 2: Run it**

  `PUBLISH_PORT=5173 npm run dev` (background); `mkdir -p /tmp/claude-1000/pw/out && cp .context/playwright/* /tmp/claude-1000/pw/ && cd /tmp/claude-1000/pw && npm i playwright`; `node shots.mjs` (as in `running.md`).
  Expected: the equation line and answer boxes fit without horizontal overflow on every viewport at level 9 (the widest equation: `999 × 5 = ▢▢▢▢`); the picture doesn't overlap the equation, answer boxes, or controls at level 7 (9 full groups of 9 squares, the largest picture) or level 8/9 (outline circles). The known `se-tab` 34px-cell exception from the add/sub check may still apply; no *new* failures beyond it.

- [ ] **Step 3: Fix any overflow found**

  Likely knobs: a smaller font/line-height for the horizontal equation on short/narrow viewports (mirror the existing `@media (max-height: 760px)` block), a `--picture-cell` variable independent of the problem's `--cell` for the block picture, or capping the two-colour split's block size on level 7. Re-run Step 2 after each fix.

- [ ] **Step 4: Commit**

  ```bash
  git add .context/playwright/shots.mjs src/styles.css
  git commit -m "test: extend the layout check to multiplication, and fix overflow"
  ```

---

## Self-review notes

- **Spec coverage:** ladder/levels (Task 2), hints/Pass/no-early-answer (Task 2, Task 4), picture (Task 5), layout/entry (Task 4), target times (Task 2), saved progress (Task 3), code structure/operation modules (Task 1) — every "Decided" section of the design doc has an owning task.
- **Anti-goals:** "a hint that reveals the answer" → Task 2's `passOnly` property test + Task 4's Hint-guard wiring. "picture before first Hint" → Task 5's empty-container assertion. "picture crowding the layout" → Task 6. "losing saved progress on upgrade" → Task 3's migration tests. "behaviour change to addition/subtraction" → Task 1's zero-test-diff constraint, enforced again by every later task's full-suite run.
- Proportion: this plan is longer than the design doc because the doc deliberately left the module interface, the picture data shape, the level-6 tie-break, and the exact answer-width/target-time numbers to "the builder" — this plan is where those get pinned, once, so six different task implementers agree on them. Step bodies still don't contain full implementations; code blocks are signatures, test tables, and the handful of exact numbers the spec fixes.
