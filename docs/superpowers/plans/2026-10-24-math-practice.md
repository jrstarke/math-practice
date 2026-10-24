# Math Practice Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a touch-first, offline-capable PWA where a 7–9 year old practises column addition and subtraction with adaptive difficulty, hints, and sound.

**Architecture:** All maths, problem generation, hint solving, scoring, and adaptation live in pure TypeScript modules under `src/core/` (no DOM, fully unit-tested). A thin vanilla-DOM UI layer under `src/ui/` renders state and forwards input. Progress is one JSON object in `localStorage`.

**Tech Stack:** TypeScript, Vite, Vitest (+ jsdom for UI tests), vite-plugin-pwa, @vite-pwa/assets-generator, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-10-24-math-practice-design.md` — read it before starting any task. Hint copy, ladder rules, scoring values, and adaptation thresholds come from it.

## Global Constraints

- Positive numbers only; every subtraction result ≥ 0 (levels 3–9: > 0).
- No UI framework. No runtime dependencies other than what vite-plugin-pwa injects.
- Use the true minus sign `−` (U+2212) in all displayed text and hint copy; `-` only in code (`Op` type).
- Number-pad keys ≥ 64 px; keys act on `pointerdown`, not `click`.
- `touch-action: manipulation`, `user-select: none`, `overscroll-behavior: none` on the app root; no double-tap zoom.
- Answer entry: left-to-right typing, displayed right-aligned under the columns, max 4 digits.
- Single `localStorage` key: `math-practice-progress`.
- Dev/preview server listens on `0.0.0.0:$PUBLISH_PORT`.
- Tests colocated as `src/**/<name>.test.ts`. UI tests start with `// @vitest-environment jsdom`.
- Commits end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. **Answer of zero** (`5 − 5`): typing `0` alone must be submittable and correct; `0` followed by `7` becomes `7`. → Task 7 tests.
2. **Double-tap ✓ on a correct answer** during the 1 s celebration must not record the result twice or skip a problem. → Task 8 test.
3. **Number-pad taps during Pass auto-play / after Pass** must not change the answer or submit. → Task 9 test.
4. **Stored progress that parses but is out of range** (level 12, window containing `NaN` or `2`, negative streak) must reset to defaults, not crash or produce impossible levels. → Task 6 tests.
5. **Carry out of the top column** (`68 + 57`, `7 + 8`) must show a ghost digit in the new leading column even though there's no scratch box there. → Task 3 tests.

---

## File Map

```
package.json, tsconfig.json, vite.config.ts, index.html, pwa-assets.config.ts
public/icon.svg
src/main.ts                  entry: mounts app with real deps, registers SW
src/styles.css
src/core/types.ts            shared types
src/core/rng.ts              seedable PRNG helpers
src/core/arith.ts            digit/carry/borrow helpers
src/core/levels.ts           ladder predicates, target times
src/core/generator.ts        generate()
src/core/solver.ts           solve(), revealState()
src/core/scoring.ts          score()
src/core/adaptive.ts         update(), pickLevel(), initialOpState()
src/core/progress.ts         Progress type, defaultProgress()
src/core/session.ts          nextProblem(), recordResult()
src/core/entry.ts            pure answer/scratch input reducer
src/storage.ts               createStore()
src/ui/app.ts                mountApp() controller
src/ui/problemView.ts        renders problem columns, scratch, answer, ghosts
src/ui/numberPad.ts          pad + hardware keyboard
src/ui/hintBubble.ts         speech bubble
src/ui/feedback.ts           correct / shake animations
src/ui/sound.ts              Web Audio synth
src/ui/installTip.ts         one-time Add to Home Screen tip
```

---

### Task 1: Scaffold, RNG, and arithmetic helpers

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts` (placeholder), `src/core/types.ts`, `src/core/rng.ts`, `src/core/arith.ts`
- Test: `src/core/rng.test.ts`, `src/core/arith.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Op = '+' | '-';
  export interface Problem { op: Op; a: number; b: number; level: number } // a is top operand
  ```
- Produces (`rng.ts`):
  ```ts
  export type Rng = () => number;                       // [0, 1)
  export function mulberry32(seed: number): Rng;
  export function randInt(rng: Rng, min: number, max: number): number; // inclusive
  ```
- Produces (`arith.ts`):
  ```ts
  export function digitsOf(n: number): number[];        // ones first; digitsOf(0) = [0]
  export function answerOf(p: Problem): number;
  export function answerColumns(p: Problem): number;    // digit count of answer, min 1
  export function carryCount(a: number, b: number): number;   // column addition carries
  export function borrowCount(a: number, b: number): number;  // column subtraction borrows, a ≥ b
  ```

- [ ] **Step 1: Scaffold.** `npm init -y`; set `"type": "module"`; devDeps `typescript vite vitest jsdom`; scripts `dev: "vite --host 0.0.0.0 --port ${PUBLISH_PORT:-5173}"`, `build: "tsc --noEmit && vite build"`, `preview: "vite preview --host 0.0.0.0 --port ${PUBLISH_PORT:-4173}"`, `test: "vitest run"`. `tsconfig.json`: `strict`, `target ES2022`, `module ESNext`, `moduleResolution bundler`, `lib ["ES2022","DOM"]`, `noEmit`. `.gitignore`: `node_modules`, `dist`. `index.html` with `<div id="app">` and `<script type="module" src="/src/main.ts">`.

- [ ] **Step 2: Write failing tests**

```ts
// rng.test.ts
test('mulberry32 is deterministic', () => {
  const a = mulberry32(42), b = mulberry32(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
test('randInt stays within inclusive bounds and hits both ends', () => {
  const r = mulberry32(1); const seen = new Set<number>();
  for (let i = 0; i < 1000; i++) seen.add(randInt(r, 3, 5));
  expect([...seen].sort()).toEqual([3, 4, 5]);
});
// arith.test.ts
test('digitsOf', () => { expect(digitsOf(302)).toEqual([2, 0, 3]); expect(digitsOf(0)).toEqual([0]); });
test('carryCount', () => {
  expect(carryCount(34, 25)).toBe(0); expect(carryCount(47, 38)).toBe(1);
  expect(carryCount(68, 57)).toBe(2); expect(carryCount(478, 356)).toBe(2); expect(carryCount(999, 1)).toBe(3);
});
test('borrowCount', () => {
  expect(borrowCount(57, 23)).toBe(0); expect(borrowCount(62, 29)).toBe(1);
  expect(borrowCount(432, 178)).toBe(2); expect(borrowCount(302, 147)).toBe(2);
});
test('answerOf / answerColumns', () => {
  expect(answerOf({ op: '-', a: 5, b: 5, level: 1 })).toBe(0);
  expect(answerColumns({ op: '-', a: 5, b: 5, level: 1 })).toBe(1);
  expect(answerColumns({ op: '+', a: 68, b: 57, level: 7 })).toBe(3);
});
```

- [ ] **Step 3: Run `npx vitest run src/core` — expect FAIL (modules missing).**
- [ ] **Step 4: Implement `types.ts`, `rng.ts` (standard mulberry32), `arith.ts`.** Borrow counting is standard column subtraction: column borrows when `aDigit − borrowIn < bDigit`.
- [ ] **Step 5: Run `npx vitest run src/core` — expect PASS.**
- [ ] **Step 6: Commit** `feat: scaffold project with rng and arithmetic helpers`

---

### Task 2: Difficulty ladder and problem generator

**Files:**
- Create: `src/core/levels.ts`, `src/core/generator.ts`
- Test: `src/core/levels.test.ts`, `src/core/generator.test.ts`

**Interfaces:**
- Consumes: `Problem`, `Op`, `Rng`, `randInt`, `digitsOf`, `carryCount`, `borrowCount`, `answerColumns`.
- Produces:
  ```ts
  export const MIN_LEVEL = 1, MAX_LEVEL = 9;
  export function matchesLevel(p: Problem): boolean;   // true iff p satisfies p.level's rules for p.op
  export function targetMs(p: Problem): number;        // 4000 + 4000 * answerColumns(p)
  export function generate(op: Op, level: number, rng: Rng): Problem;
  ```

Exact level rules (`a` = top operand; "2-digit" = 10–99, "3-digit" = 100–999, "1-digit" = 1–9):

| L | `+` | `-` (always `a ≥ b`) |
|---|---|---|
| 1 | a,b 1-digit, a+b ≤ 10 | a ≤ 10, b 1-digit, a ≥ b |
| 2 | a,b 1-digit, 11 ≤ a+b ≤ 18 | a 11–18, b 1-digit, a−b ≤ 9 |
| 3 | a 2-digit, b 1-digit, 0 carries | a 2-digit, b 1-digit, 0 borrows, a−b > 0 |
| 4 | a,b 2-digit, 0 carries | a,b 2-digit, 0 borrows, a > b |
| 5 | a 2-digit, b 1-digit, 1 carry, sum < 100 | a 2-digit, b 1-digit, 1 borrow |
| 6 | a,b 2-digit, ones carry, sum < 100 | a,b 2-digit, 1 borrow, a > b |
| 7 | a,b 2-digit, sum ≥ 100 | a 3-digit, b 2- or 3-digit, exactly 1 borrow, a's tens ≠ 0, a > b |
| 8 | a 3-digit, b 2- or 3-digit, exactly 1 carry, sum < 1000 | a,b 3-digit, exactly 2 borrows, a's tens ≠ 0, a > b |
| 9 | a,b 3-digit, ≥ 2 carries | a,b 3-digit, a's tens = 0, a's ones < b's ones, a > b |

- [ ] **Step 1: Write failing tests**

```ts
// levels.test.ts — spec examples match; near-misses don't
test.each([
  ['+', 3, 5, 1], ['+', 7, 8, 2], ['+', 23, 4, 3], ['+', 34, 25, 4], ['+', 27, 8, 5],
  ['+', 47, 38, 6], ['+', 68, 57, 7], ['+', 256, 137, 8], ['+', 478, 356, 9],
  ['-', 9, 4, 1], ['-', 15, 7, 2], ['-', 28, 5, 3], ['-', 57, 23, 4], ['-', 42, 7, 5],
  ['-', 62, 29, 6], ['-', 345, 128, 7], ['-', 432, 178, 8], ['-', 302, 147, 9],
] as const)('%s %i %i is level %i', (op, a, b, level) => expect(matchesLevel({ op, a, b, level })).toBe(true));
test.each([
  ['+', 47, 38, 4], ['+', 34, 25, 6], ['+', 68, 57, 6], ['+', 478, 356, 8],
  ['-', 62, 29, 4], ['-', 302, 147, 8], ['-', 432, 178, 9], ['-', 3, 7, 1],
] as const)('%s %i %i is NOT level %i', (op, a, b, level) => expect(matchesLevel({ op, a, b, level })).toBe(false));
test('targetMs', () => expect(targetMs({ op: '+', a: 47, b: 38, level: 6 })).toBe(12000));

// generator.test.ts
for (const op of ['+', '-'] as const)
  for (let level = 1; level <= 9; level++)
    test(`${op} level ${level}: 1000 seeded problems all match`, () => {
      const rng = mulberry32(level * 100 + (op === '+' ? 1 : 2));
      for (let i = 0; i < 1000; i++) {
        const p = generate(op, level, rng);
        expect(p.level).toBe(level); expect(p.op).toBe(op);
        expect(matchesLevel(p)).toBe(true);
      }
    });
test('level 9 subtraction varies (not one fixed problem)', () => {
  const rng = mulberry32(9); const s = new Set<string>();
  for (let i = 0; i < 200; i++) { const p = generate('-', 9, rng); s.add(`${p.a}-${p.b}`); }
  expect(s.size).toBeGreaterThan(50);
});
```

- [ ] **Step 2: Run `npx vitest run src/core/levels.test.ts src/core/generator.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement `matchesLevel` and `targetMs`** as a direct encoding of the table above.
- [ ] **Step 4: Implement `generate`** constructively, column by column, choosing digits so the carry/borrow pattern for that level holds (spec §10). Guard: after constructing, `if (!matchesLevel(p))` retry; throw after 1000 tries (the test proves this never happens).
- [ ] **Step 5: Run the same tests — expect PASS.**
- [ ] **Step 6: Commit** `feat: add difficulty ladder and problem generator`

---

### Task 3: Hint solver

**Files:**
- Create: `src/core/solver.ts`
- Test: `src/core/solver.test.ts`

**Interfaces:**
- Consumes: `Problem`, `digitsOf`, `answerOf`.
- Produces:
  ```ts
  export interface Ghost { column: number; digit: number }       // column 0 = ones
  export interface Step {
    column: number;                       // column to highlight
    text: string;                         // bubble copy
    scratch: Record<number, string>;      // scratch boxes this step sets (overwrites)
    ghosts: Ghost[];                      // ghost digits this step adds
  }
  export interface RevealState {
    column: number | null; text: string;
    scratch: Record<number, string>; ghosts: Record<number, number>;
  }
  export function solve(p: Problem): Step[];
  export function revealState(steps: Step[], count: number): RevealState; // merge of steps[0..count)
  ```

Copy templates (column names `ones, tens, hundreds, thousands`; borrow units `a ten, a hundred`; `−` is U+2212):

Addition, column `i` with terms = carry-in (if 1) then top digit then bottom digit (omitted if b has no digit there):
- Prompt, i = 0: `Start with the ones: what's {x} + {y}?`
- Prompt, i > 0: `Now the {name}: {terms joined " + "} = ?`
- Reveal, sum ≥ 10: `{terms} = {sum}. That's more than 9, so {sum % 10} goes in the answer and the 1 carries to the {next name}.` — ghost `{i, sum%10}`; if column i+1 has an operand digit, `scratch[i+1] = '1'`, otherwise also ghost `{i+1, 1}`.
- Reveal, sum < 10: `That's {sum}!` — ghost `{i, sum}`.

Subtraction, column `i`, `t` = top digit after earlier borrows, `d` = bottom digit (0 if absent). Prefix = `Ones first: ` for i = 0, `Now the {name}: ` otherwise.
- If `t ≥ d`: prompt `{prefix}{t} − {d} = ?`; reveal `{t} − {d} = {r}.` — ghost `{i, r}` unless it's a leading zero.
- If `t < d`: prompt `{prefix}{t} − {d}? {t} is smaller than {d}, so we need to borrow.` Then a borrow step:
  - next column's current top digit `n > 0`: `Borrow {unit}: {n} becomes {n−1}, and {t} becomes {t+10}.` — scratch `{i+1: n−1, i: t+10}`.
  - `n = 0` (borrow across zero): `The {next name} has nothing to lend, so borrow from the {next-next name} first: {m} becomes {m−1} and 0 becomes 10. Now the {next name} can lend: 10 becomes 9 and {t} becomes {t+10}.` — scratch `{i+2: m−1, i+1: 9, i: t+10}`.
  - Then prompt `{t+10} − {d} = ?` and reveal `{t+10} − {d} = {r}.` with ghost.
- Leading zero = a result digit of 0 in a column where all higher result digits are also 0 and the column isn't the ones. It gets its steps but no ghost.

Single-term columns (no bottom digit, and for addition no carry-in) get **one** reveal step instead of a prompt + reveal pair:
- Addition: `Now the {name}: nothing to add, so {x} comes straight down.` — ghost `{i, x}`.
- Subtraction: `Now the {name}: nothing to take away, so {t} comes straight down.` — ghost `{i, t}`. If `t` is 0 and is a leading zero (e.g. the tens of `12 − 7` after the borrow), emit **no step** for that column.

Add tests: `solve(23 + 4)` → its last step text is `Now the tens: nothing to add, so 2 comes straight down.`; `solve(12 − 7)` has no step whose `column` is 1 after the ones reveal; and `solve(42 − 7)` ends with `Now the tens: nothing to take away, so 3 comes straight down.`

- [ ] **Step 1: Write failing tests**

```ts
test('47 + 38 steps match spec copy', () => {
  const s = solve({ op: '+', a: 47, b: 38, level: 6 });
  expect(s.map(x => x.text)).toEqual([
    "Start with the ones: what's 7 + 8?",
    "7 + 8 = 15. That's more than 9, so 5 goes in the answer and the 1 carries to the tens.",
    'Now the tens: 1 + 4 + 3 = ?',
    "That's 8!",
  ]);
  expect(s[1].scratch).toEqual({ 1: '1' });
  expect(s[1].ghosts).toEqual([{ column: 0, digit: 5 }]);
});
test('62 − 29 borrow steps', () => {
  const s = solve({ op: '-', a: 62, b: 29, level: 6 });
  expect(s.map(x => x.text)).toEqual([
    'Ones first: 2 − 9? 2 is smaller than 9, so we need to borrow.',
    'Borrow a ten: 6 becomes 5, and 2 becomes 12.',
    '12 − 9 = ?', '12 − 9 = 3.',
    'Now the tens: 5 − 2 = ?', '5 − 2 = 3.',
  ]);
  expect(s[1].scratch).toEqual({ 1: '5', 0: '12' });
});
test('302 − 147 borrows across zero', () => {
  const s = solve({ op: '-', a: 302, b: 147, level: 9 });
  expect(s[1].text).toBe('The tens has nothing to lend, so borrow from the hundreds first: 3 becomes 2 and 0 becomes 10. Now the tens can lend: 10 becomes 9 and 2 becomes 12.');
  expect(s[1].scratch).toEqual({ 2: '2', 1: '9', 0: '12' });
});
test('carry out of top column ghosts a new leading digit (68 + 57, 7 + 8)', () => {
  expect(revealState(solve({ op: '+', a: 68, b: 57, level: 7 }), 99).ghosts).toEqual({ 0: 5, 1: 2, 2: 1 });
  const r = revealState(solve({ op: '+', a: 7, b: 8, level: 2 }), 99);
  expect(r.ghosts).toEqual({ 0: 5, 1: 1 }); expect(r.scratch).toEqual({});
});
test('no leading-zero ghost: 345 − 328', () => {
  expect(revealState(solve({ op: '-', a: 345, b: 328, level: 7 }), 99).ghosts).toEqual({ 0: 7, 1: 1 });
});
test('revealState merges only the first N steps, later scratch overwrites earlier', () => {
  const s = solve({ op: '-', a: 432, b: 178, level: 8 });
  expect(revealState(s, 0)).toEqual({ column: null, text: '', scratch: {}, ghosts: {} });
  expect(revealState(s, 1).column).toBe(0);
});
test('full reveal ghosts equal the answer at every level (property)', () => {
  for (const op of ['+', '-'] as const) for (let level = 1; level <= 9; level++) {
    const rng = mulberry32(level);
    for (let i = 0; i < 300; i++) {
      const p = generate(op, level, rng);
      const g = revealState(solve(p), Infinity).ghosts;
      const n = Object.entries(g).reduce((acc, [c, d]) => acc + d * 10 ** Number(c), 0);
      expect(n).toBe(answerOf(p));
    }
  }
});
```

- [ ] **Step 2: Run `npx vitest run src/core/solver.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement `solve` and `revealState`** per the templates. `revealState(steps, count)` takes `min(count, steps.length)`; `column`/`text` come from the last included step.
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat: add column-by-column hint solver`

---

### Task 4: Scoring and adaptation

**Files:**
- Create: `src/core/scoring.ts`, `src/core/adaptive.ts`
- Test: `src/core/scoring.test.ts`, `src/core/adaptive.test.ts`

**Interfaces:**
- Consumes: `Rng`, `MIN_LEVEL`, `MAX_LEVEL`.
- Produces:
  ```ts
  // scoring.ts
  export interface Attempt { wrongSubmits: number; hintsUsed: number; passed: boolean; firstSubmitMs: number; targetMs: number }
  export function score(a: Attempt): number;
  // adaptive.ts
  export interface OpState { level: number; window: number[]; calibrationLeft: number }
  export type LevelChange = -1 | 0 | 1;
  export function initialOpState(): OpState;            // { level: 4, window: [], calibrationLeft: 10 }
  export function update(s: OpState, score: number): { state: OpState; change: LevelChange };
  export function pickLevel(s: OpState, rng: Rng): number;
  ```

Rules (spec §4–5): score order: passed → 0; hintsUsed > 0 → 0.2; wrongSubmits > 0 → 0.3; `firstSubmitMs ≤ targetMs` → 1.0, else 0.6.
`update`: append score, keep last 5. If `calibrationLeft > 0` (value *before* this update): up when the last 2 are both 1.0, down when this score ≤ 0.3. Otherwise: up when there are 5 scores and their mean ≥ 0.8, down when the last 2 are both ≤ 0.3. Decrement `calibrationLeft` (floor 0). On a move, clear the window. A move past 1 or 9 is no move (`change: 0`, window kept).
`pickLevel`: during calibration, the current level. Otherwise `r = rng()`: `r < 0.7` current; `r < 0.9` level − 1; else level + 1. Out-of-range picks fall back to current.

- [ ] **Step 1: Write failing tests**

```ts
// scoring.test.ts
const base = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 5000, targetMs: 12000 };
test.each([
  [{}, 1.0], [{ firstSubmitMs: 12000 }, 1.0], [{ firstSubmitMs: 12001 }, 0.6],
  [{ wrongSubmits: 2 }, 0.3], [{ wrongSubmits: 2, hintsUsed: 1 }, 0.2], [{ hintsUsed: 3 }, 0.2],
  [{ passed: true, hintsUsed: 2 }, 0],
])('score(%o) = %d', (over, expected) => expect(score({ ...base, ...over })).toBe(expected));

// adaptive.test.ts
const run = (s: OpState, scores: number[]) => scores.reduce((acc, sc) => update(acc.state, sc), { state: s, change: 0 as LevelChange });
const normal = (level: number): OpState => ({ level, window: [], calibrationLeft: 0 });
test('initial state', () => expect(initialOpState()).toEqual({ level: 4, window: [], calibrationLeft: 10 }));
test('normal: up after 5 with mean ≥ 0.8, window resets', () => {
  const r = run(normal(5), [1, 1, 0.6, 1, 0.6]);       // mean 0.84
  expect(r.change).toBe(1); expect(r.state).toEqual({ level: 6, window: [], calibrationLeft: 0 });
});
test('normal: 4 strong is not enough', () => expect(run(normal(5), [1, 1, 1, 1]).state.level).toBe(5));
test('normal: mean 0.76 does not move', () => expect(run(normal(5), [1, 1, 0.6, 0.6, 0.6]).state.level).toBe(5));
test('normal: down after two ≤ 0.3 in a row', () => {
  expect(run(normal(5), [0.3, 0.2]).state.level).toBe(4);
  expect(run(normal(5), [0.3, 1, 0.2]).state.level).toBe(5);
});
test('calibration: two 1.0s go up, one miss goes down', () => {
  expect(run(initialOpState(), [1, 1]).state.level).toBe(5);
  expect(run(initialOpState(), [1, 0.6]).state.level).toBe(4);
  expect(run(initialOpState(), [0]).state.level).toBe(3);
});
test('calibration lasts exactly 10 current-level problems', () => {
  const r = run(initialOpState(), Array(9).fill(0.6));
  expect(r.state.calibrationLeft).toBe(1);
  expect(update(r.state, 0).state.level).toBe(3);                // 10th still calibration
  expect(run(r.state, [0.6, 0.2]).state.calibrationLeft).toBe(0);
});
test('clamps at 1 and 9', () => {
  expect(run(normal(1), [0, 0]).change).toBe(0); expect(run(normal(1), [0, 0]).state.level).toBe(1);
  expect(run(normal(9), [1, 1, 1, 1, 1]).state.level).toBe(9);
});
test('pickLevel distribution ~70/20/10', () => {
  const rng = mulberry32(3); const c: Record<number, number> = {};
  for (let i = 0; i < 10000; i++) { const l = pickLevel(normal(5), rng); c[l] = (c[l] ?? 0) + 1; }
  expect(c[5] / 10000).toBeCloseTo(0.7, 1); expect(c[4] / 10000).toBeCloseTo(0.2, 1); expect(c[6] / 10000).toBeCloseTo(0.1, 1);
});
test('pickLevel edges and calibration', () => {
  const rng = mulberry32(4);
  for (let i = 0; i < 500; i++) {
    expect(pickLevel(normal(1), rng)).toBeGreaterThanOrEqual(1);
    expect(pickLevel(normal(9), rng)).toBeLessThanOrEqual(9);
    expect(pickLevel(initialOpState(), rng)).toBe(4);
  }
});
```

- [ ] **Step 2: Run `npx vitest run src/core/scoring.test.ts src/core/adaptive.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement both modules.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat: add scoring and adaptive difficulty`

---

### Task 5: Progress model and session

**Files:**
- Create: `src/core/progress.ts`, `src/core/session.ts`
- Test: `src/core/session.test.ts`

**Interfaces:**
- Consumes: `OpState`, `initialOpState`, `update`, `pickLevel`, `LevelChange`, `score`, `Attempt`, `generate`, `targetMs`, `Problem`, `Op`, `Rng`.
- Produces:
  ```ts
  // progress.ts
  export interface Progress {
    version: 1; addition: OpState; subtraction: OpState;
    streak: number; bestStreak: number; muted: boolean; installTipShown: boolean;
  }
  export function defaultProgress(): Progress;   // both initialOpState(), zeros, muted false, tip false
  export function opKey(op: Op): 'addition' | 'subtraction';
  // session.ts
  export const RECENT_LIMIT = 10;
  export function nextProblem(p: Progress, recent: Problem[], rng: Rng): Problem;
  export interface AttemptInput { wrongSubmits: number; hintsUsed: number; passed: boolean; firstSubmitMs: number }
  export function recordResult(p: Progress, problem: Problem, a: AttemptInput): { progress: Progress; levelChange: LevelChange };
  ```

`nextProblem`: op is `'+'` if `rng() < 0.5`, else `'-'`; level = `pickLevel(progress[opKey(op)], rng)`; generate up to 50 times until the problem's `op/a/b` isn't in `recent`; return the last attempt if all 50 collide.
`recordResult` (pure, returns a new object): score with `targetMs(problem)`. Streak +1 only if `wrongSubmits === 0 && hintsUsed === 0 && !passed`, else 0; `bestStreak = max`. Call `update` only when `problem.level === progress[op].level`; otherwise `levelChange: 0`.

- [ ] **Step 1: Write failing tests**

```ts
const clean = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 1000 };
test('nextProblem avoids the last 10 problems', () => {
  const rng = mulberry32(5); const recent: Problem[] = [];
  const p = { ...defaultProgress(), addition: { level: 1, window: [], calibrationLeft: 10 }, subtraction: { level: 1, window: [], calibrationLeft: 10 } };
  for (let i = 0; i < 200; i++) {
    const n = nextProblem(p, recent, rng);
    expect(recent.some(r => r.op === n.op && r.a === n.a && r.b === n.b)).toBe(false);
    recent.push(n); if (recent.length > RECENT_LIMIT) recent.shift();
  }
});
test('nextProblem mixes operations', () => {
  const rng = mulberry32(6); const ops = new Set<string>();
  for (let i = 0; i < 50; i++) ops.add(nextProblem(defaultProgress(), [], rng).op);
  expect(ops).toEqual(new Set(['+', '-']));
});
test('recordResult: clean answer extends streak and best', () => {
  const r = recordResult({ ...defaultProgress(), streak: 4, bestStreak: 4 }, { op: '+', a: 34, b: 25, level: 4 }, clean);
  expect(r.progress.streak).toBe(5); expect(r.progress.bestStreak).toBe(5);
});
test.each([{ wrongSubmits: 1 }, { hintsUsed: 1 }, { passed: true }])('recordResult %o resets streak, keeps best', over => {
  const r = recordResult({ ...defaultProgress(), streak: 4, bestStreak: 9 }, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, ...over });
  expect(r.progress.streak).toBe(0); expect(r.progress.bestStreak).toBe(9);
});
test('recordResult only adapts on current-level problems', () => {
  const start = defaultProgress();
  const off = recordResult(start, { op: '+', a: 23, b: 4, level: 3 }, { ...clean, passed: true });
  expect(off.progress.addition).toEqual(start.addition);
  const on = recordResult(start, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, passed: true });
  expect(on.progress.addition.level).toBe(3); expect(on.levelChange).toBe(-1);
  expect(start.addition.level).toBe(4);   // input not mutated
});
```

- [ ] **Step 2: Run `npx vitest run src/core/session.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement `progress.ts` and `session.ts`.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat: add progress model and practice session`

---

### Task 6: Storage

**Files:**
- Create: `src/storage.ts`
- Test: `src/storage.test.ts`

**Interfaces:**
- Consumes: `Progress`, `defaultProgress`.
- Produces:
  ```ts
  export const STORAGE_KEY = 'math-practice-progress';
  export interface ProgressStore { load(): Progress; save(p: Progress): void }
  export function createStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null): ProgressStore;
  export function isValidProgress(x: unknown): x is Progress;
  ```

Valid means: `version === 1`; each `OpState` has an integer `level` from 1 to 9, a `window` array of ≤ 5 finite numbers in [0, 1], and an integer `calibrationLeft` from 0 to 10; `streak` and `bestStreak` are non-negative integers; `muted` and `installTipShown` are booleans. Anything else, unparseable JSON, a missing key, or a throwing `getItem` → `defaultProgress()`. A throwing `setItem` is swallowed. `createStore(null)` keeps progress in memory, so a `save` followed by a `load` returns the saved value.

- [ ] **Step 1: Write failing tests**

```ts
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
test('round-trips', () => {
  const s = mem(); const p = { ...defaultProgress(), streak: 3, muted: true };
  createStore(s).save(p); expect(createStore(s).load()).toEqual(p);
});
test.each([
  'not json', '{"version":2}', 'null', '[]',
  JSON.stringify({ ...defaultProgress(), addition: { level: 12, window: [], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), addition: { level: 3, window: [2], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), subtraction: { level: 3.5, window: [], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), streak: -1 }),
  JSON.stringify({ ...defaultProgress(), muted: 'yes' }),
])('invalid stored value %s → defaults', raw => {
  const s = mem(); s.m.set(STORAGE_KEY, raw); expect(createStore(s).load()).toEqual(defaultProgress());
});
test('window containing NaN (stored as null) → defaults', () => {
  const s = mem(); s.m.set(STORAGE_KEY, JSON.stringify({ ...defaultProgress(), addition: { level: 3, window: [NaN], calibrationLeft: 0 } }));
  expect(createStore(s).load()).toEqual(defaultProgress());
});
test('throwing storage and null storage do not crash', () => {
  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  expect(createStore(bad).load()).toEqual(defaultProgress()); expect(() => createStore(bad).save(defaultProgress())).not.toThrow();
  const s = createStore(null); const p = { ...defaultProgress(), streak: 2 }; s.save(p); expect(s.load()).toEqual(p);
});
```

- [ ] **Step 2: Run `npx vitest run src/storage.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat: add validated localStorage progress store`

---

### Task 7: Input reducer

**Files:**
- Create: `src/core/entry.ts`
- Test: `src/core/entry.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Key = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'back'|'submit';
  export type Focus = { kind: 'answer' } | { kind: 'scratch'; column: number };
  export interface EntryState { answer: string; faded: boolean; focus: Focus; scratch: Record<number, string> }
  export const MAX_ANSWER = 4, MAX_SCRATCH = 2;
  export function initialEntry(): EntryState;
  export function pressKey(s: EntryState, key: Key): { state: EntryState; submit: boolean };
  export function focusScratch(s: EntryState, column: number): EntryState;
  export function focusAnswer(s: EntryState): EntryState;
  export function markWrong(s: EntryState): EntryState;                    // faded = true
  export function setScratch(s: EntryState, values: Record<number, string>): EntryState; // merge-overwrite
  ```

Rules. With focus on the answer:
- A digit appends, up to 4 digits; extra digits are ignored. If the answer is exactly `'0'`, a digit replaces it.
- When faded, a digit replaces the answer and clears `faded`, and `back` clears the answer and `faded`.
- `back` removes the last digit.
- `submit` returns `submit: true` only if the answer isn't empty and isn't faded.

With focus on a scratch box:
- A digit appends, up to 2 characters.
- `back` removes the last character.
- `submit` moves focus back to the answer and returns `submit: false`.

- [ ] **Step 1: Write failing tests**

```ts
const press = (keys: Key[], s = initialEntry()) => keys.reduce((acc, k) => pressKey(acc.state, k), { state: s, submit: false });
test('types left to right, max 4', () => expect(press(['2', '7', '1', '0', '9']).state.answer).toBe('2710'));
test('zero alone submits; leading zero is replaced', () => {
  const z = press(['0', 'submit']); expect(z.submit).toBe(true); expect(z.state.answer).toBe('0');
  expect(press(['0', '7']).state.answer).toBe('7');
});
test('empty submit does nothing', () => expect(press(['submit']).submit).toBe(false));
test('backspace', () => expect(press(['8', '5', 'back']).state.answer).toBe('8'));
test('faded wrong answer: next digit replaces, back clears, resubmit ignored', () => {
  const w = markWrong(press(['8', '4']).state);
  expect(pressKey(w, 'submit').submit).toBe(false);
  expect(pressKey(w, '5').state).toMatchObject({ answer: '5', faded: false });
  expect(pressKey(w, 'back').state).toMatchObject({ answer: '', faded: false });
});
test('scratch focus: digits go to box, max 2, submit returns focus', () => {
  const s = focusScratch(initialEntry(), 1);
  const r = press(['1', '3', '5', 'submit'], s);
  expect(r.state.scratch).toEqual({ 1: '13' }); expect(r.state.answer).toBe('');
  expect(r.submit).toBe(false); expect(r.state.focus).toEqual({ kind: 'answer' });
});
test('setScratch overwrites given columns only', () =>
  expect(setScratch({ ...initialEntry(), scratch: { 1: '4', 2: '7' } }, { 1: '5', 0: '12' }).scratch).toEqual({ 0: '12', 1: '5', 2: '7' }));
```

- [ ] **Step 2: Run `npx vitest run src/core/entry.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run — expect PASS.**
- [ ] **Step 5: Commit** `feat: add answer and scratch input reducer`

---

### Task 8: Playable UI (problem, pad, answering, streak)

**Files:**
- Create: `src/ui/problemView.ts`, `src/ui/numberPad.ts`, `src/ui/feedback.ts`, `src/ui/app.ts`, `src/styles.css`
- Modify: `src/main.ts`, `index.html`
- Test: `src/ui/app.test.ts`

**Interfaces:**
- Consumes: `nextProblem`, `recordResult`, `RECENT_LIMIT`, `Progress`, `ProgressStore`, `createStore`, all of `entry.ts`, `answerOf`, `digitsOf`, `Rng`, `mulberry32`.
- Produces:
  ```ts
  // ui/sound.ts types, defined here as an interface stub; Task 10 implements them
  export interface SoundPlayer { unlock(): void; correct(): void; wrong(): void; levelUp(): void; setMuted(m: boolean): void }
  // ui/app.ts
  export interface AppDeps { root: HTMLElement; rng: Rng; now: () => number; store: ProgressStore; sound: SoundPlayer }
  export function mountApp(deps: AppDeps): { destroy(): void };
  export const ADVANCE_MS = 1000;
  ```
  Put the `SoundPlayer` interface in `src/ui/sound.ts` now, along with `export function createSilentSound(): SoundPlayer` (all no-ops). Task 10 adds `createSound`.

DOM contract (tests and later tasks rely on these attributes):
- Pad keys: `[data-key="0".."9"|"back"|"submit"]`.
- Problem: `[data-role="top"]` and `[data-role="bottom"]` show the operands' digits in columns. `[data-role="op"]` shows `+` or `−`.
- Answer: `[data-role="answer"]` (tappable to refocus), with digits right-aligned. It gets the class `faded` when faded and `correct` when correct.
- Scratch boxes: `[data-scratch="<column>"]`. Addition gets one per operand column except column 0 (none for 1-digit problems). Subtraction gets one for every column of `a`. A focused box has the class `focused`. For subtraction, the top digit under a non-empty box has the class `struck`.
- `[data-role="streak"]` shows the streak count with 🔥. `[data-role="message"]` holds the `Not quite — try again` text.

Controller behaviour:
- On mount, load progress, get `nextProblem`, and record `shownAt = now()`.
- Keys act on `pointerdown`. Map hardware `keydown` digits, `Backspace` and `Enter` to keys.
- On `submit`, set `firstSubmitMs` on the first submit, then compare `Number(answer)` with `answerOf`.
- **Wrong:** increment `wrongSubmits`, then `markWrong`, `sound.wrong()`, a shake, and the message.
- **Correct:**
  1. Call `recordResult` and `store.save`, then update the streak.
  2. Play `sound.levelUp()` if `levelChange === 1`, else `sound.correct()`.
  3. Switch to phase `'correct'`, which ignores all input, and add the `correct` class.
  4. After `ADVANCE_MS`, push to `recent` (capped at 10) and show the next problem with fresh entry and attempt state.
- Unlock sound on the first `pointerdown` anywhere in the root.

Layout (CSS): portrait stacks the problem above the pad. `@media (orientation: landscape) and (min-width: 700px)` puts them side by side. Digits are in a monospace grid so columns align. The viewport meta is `width=device-width, initial-scale=1, viewport-fit=cover`. Apply the Global Constraints touch rules.

- [ ] **Step 1: Write failing tests** (`// @vitest-environment jsdom`, `vi.useFakeTimers()`)

```ts
function setup(seed = 1) {
  const root = document.createElement('div'); document.body.append(root);
  const saved: Progress[] = []; let t = 0;
  const store: ProgressStore = { load: () => defaultProgress(), save: p => void saved.push(p) };
  const sound = { unlock: vi.fn(), correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), setMuted: vi.fn() };
  mountApp({ root, rng: mulberry32(seed), now: () => t, store, sound });
  const tap = (sel: string) => root.querySelector(sel)!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  const current = () => ({ a: +root.querySelector('[data-role="top"]')!.textContent!.replace(/\D/g, ''),
                           b: +root.querySelector('[data-role="bottom"]')!.textContent!.replace(/\D/g, ''),
                           op: root.querySelector('[data-role="op"]')!.textContent!.includes('+') ? '+' : '-' });
  const typeAnswer = (n: number) => { for (const d of String(n)) tap(`[data-key="${d}"]`); };
  const correctAnswer = () => { const c = current(); return c.op === '+' ? c.a + c.b : c.a - c.b; };
  return { root, saved, sound, tap, typeAnswer, correctAnswer, current, advance: (ms: number) => { t += ms; vi.advanceTimersByTime(ms); } };
}
test('correct answer records once, plays sound, advances after 1s', () => {
  const s = setup(); const first = s.current();
  s.typeAnswer(s.correctAnswer()); s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(1); expect(s.sound.correct.mock.calls.length + s.sound.levelUp.mock.calls.length).toBe(1);
  expect(s.root.querySelector('[data-role="streak"]')!.textContent).toContain('1');
  s.advance(1000); expect(s.current()).not.toEqual(first);
});
test('double-tapping submit on a correct answer records only once', () => {
  const s = setup(); s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]'); s.tap('[data-key="submit"]'); s.tap('[data-key="5"]');
  expect(s.saved).toHaveLength(1);
  s.advance(1000); expect(s.root.querySelector('[data-role="answer"]')!.textContent!.trim()).toBe('');
});
test('wrong answer fades, shows message, does not record', () => {
  const s = setup(); s.typeAnswer(s.correctAnswer() + 1); s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(0); expect(s.sound.wrong).toHaveBeenCalledOnce();
  expect(s.root.querySelector('[data-role="answer"]')!.classList.contains('faded')).toBe(true);
  expect(s.root.querySelector('[data-role="message"]')!.textContent).toBe('Not quite — try again');
});
test('then correct after wrong resets streak to 0', () => {
  const s = setup(); s.typeAnswer(s.correctAnswer() + 1); s.tap('[data-key="submit"]');
  s.typeAnswer(s.correctAnswer()); s.tap('[data-key="submit"]');
  expect(s.saved[0].streak).toBe(0);
});
test('hardware keyboard works', () => {
  const s = setup(); for (const d of String(s.correctAnswer())) window.dispatchEvent(new KeyboardEvent('keydown', { key: d }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); expect(s.saved).toHaveLength(1);
});
test('tapping a scratch box routes digits there, not to the answer', () => {
  const s = setup(7); const box = s.root.querySelector('[data-scratch]');
  expect(box).not.toBeNull();   // first problem is always level 4 (calibration), which has boxes
  box!.dispatchEvent(new Event('pointerdown', { bubbles: true })); s.tap('[data-key="1"]');
  expect(box.textContent).toBe('1'); expect(s.root.querySelector('[data-role="answer"]')!.textContent!.trim()).toBe('');
});
```

- [ ] **Step 2: Run `npx vitest run src/ui` — expect FAIL.**
- [ ] **Step 3: Implement `problemView.ts`** with `render(state)`, a full re-render of the problem area from `{ problem, entry, ghosts, highlightColumn, phase }`. The ghost and highlight parameters are rendered but stay empty until Task 9.
- [ ] **Step 4: Implement `numberPad.ts`, `feedback.ts`** (CSS classes `shake` and `correct`, with the shake removed on `animationend`), and **`app.ts`** per the behaviour above.
- [ ] **Step 5: Wire up `main.ts`**: `mountApp({ root: #app, rng: mulberry32(Date.now()), now: () => performance.now(), store: createStore(safeLocalStorage()), sound: createSilentSound() })`. Here `safeLocalStorage` returns `null` if accessing `localStorage` throws.
- [ ] **Step 6: Run `npx vitest run` — expect PASS (all suites). Run `npm run build` — expect success.**
- [ ] **Step 7: Manual check.** Run `npm run dev` in the background. Open `http://localhost:$PUBLISH_PORT` and confirm a problem renders and you can answer it.
- [ ] **Step 8: Commit** `feat: add playable practice screen with number pad`

---

### Task 9: Hints, Pass, and worked solutions

**Files:**
- Create: `src/ui/hintBubble.ts`
- Modify: `src/ui/app.ts`, `src/ui/problemView.ts`, `src/styles.css`
- Test: `src/ui/hints.test.ts` (reuse the `setup` helper; move it to `src/ui/testUtil.ts`)

**Interfaces:**
- Consumes: `solve`, `revealState`, `setScratch`, the Task 8 DOM contract.
- Produces: `export const PASS_STEP_MS = 1500;` plus these DOM additions:
  - Buttons `[data-action="hint"]` (💡 Hint), `[data-action="pass"]` (Pass) and `[data-action="next"]` (Next, present only after Pass finishes).
  - `[data-role="bubble"]` for step text.
  - Ghost digits as `[data-ghost="<column>"]` in the answer row.
  - The highlighted column gets the class `highlight`.

Behaviour:
- Compute `steps = solve(problem)` per problem.
- **Hint tap** (phase `'answering'`):
  1. If `hintsShown < steps.length`, increment it.
  2. Apply `r = revealState(steps, hintsShown)`, merging `r.scratch` into the entry with `setScratch`.
  3. Render the ghosts, highlight, and bubble.
  4. Once all steps are shown, the hint button gets `disabled` and the text `That's every hint!`.
- **Pass tap:**
  1. Call `recordResult` with `passed: true`, then save, and reset the streak shown.
  2. Switch to phase `'passing'` and reveal one more step every `PASS_STEP_MS`, starting after the steps already shown.
  3. A `pointerdown` on the bubble or problem area reveals the next step at once.
  4. When every step is shown, switch to phase `'passed'` and show the Next button.
  5. Next shows the next problem.
- In `'passing'` and `'passed'`, number-pad keys, Hint, and Pass are ignored.
- `attempt.hintsUsed = hintsShown`.

- [ ] **Step 1: Write failing tests**

```ts
test('each hint tap reveals one step and the button disables at the end', () => {
  const s = setup(); const bubble = () => s.root.querySelector('[data-role="bubble"]')!.textContent;
  s.tap('[data-action="hint"]'); const first = bubble(); expect(first).toBeTruthy();
  s.tap('[data-action="hint"]'); expect(bubble()).not.toBe(first);
  for (let i = 0; i < 20; i++) s.tap('[data-action="hint"]');
  const btn = s.root.querySelector<HTMLButtonElement>('[data-action="hint"]')!;
  expect(btn.disabled).toBe(true); expect(btn.textContent).toContain("That's every hint!");
});
test('answer after hints scores 0.2 path: streak 0', () => {
  const s = setup(); s.tap('[data-action="hint"]'); s.typeAnswer(s.correctAnswer()); s.tap('[data-key="submit"]');
  expect(s.saved[0].streak).toBe(0);
});
test('pass records once, auto-plays to full ghost answer, then Next advances', () => {
  const s = setup(); const ans = s.correctAnswer(); const first = s.current();
  s.tap('[data-action="pass"]'); expect(s.saved).toHaveLength(1);
  s.advance(1500 * 20);
  const ghosts = [...s.root.querySelectorAll<HTMLElement>('[data-ghost]')]
    .sort((x, y) => +y.dataset.ghost! - +x.dataset.ghost!).map(g => g.textContent).join('');
  expect(+ghosts).toBe(ans);
  s.tap('[data-action="next"]'); expect(s.current()).not.toEqual(first);
});
test('keys and hint are ignored during and after pass', () => {
  const s = setup(); s.tap('[data-action="pass"]');
  s.tap('[data-key="3"]'); s.tap('[data-key="submit"]'); s.tap('[data-action="pass"]');
  expect(s.root.querySelector('[data-role="answer"]')!.textContent!.replace(/[^\d]/g, '')).toBe('');
  expect(s.saved).toHaveLength(1);
  s.advance(1500 * 20); s.tap('[data-key="3"]'); expect(s.saved).toHaveLength(1);
});
test('tapping the bubble during pass skips ahead', () => {
  const s = setup(); s.tap('[data-action="pass"]'); const before = s.root.querySelector('[data-role="bubble"]')!.textContent;
  s.tap('[data-role="bubble"]'); expect(s.root.querySelector('[data-role="bubble"]')!.textContent).not.toBe(before);
});
```

The ghost assertion must ignore the typed answer digits, so render ghosts in their own elements.

- [ ] **Step 2: Run `npx vitest run src/ui` — expect the new tests to FAIL.**
- [ ] **Step 3: Implement** `hintBubble.ts`, the hint, pass and next handling in `app.ts`, and ghost and highlight rendering in `problemView.ts`. Ghosts are faint (for example `opacity: .35`), and a non-empty answer digit draws over the ghost in the same column.
- [ ] **Step 4: Run `npx vitest run` — expect PASS.**
- [ ] **Step 5: Commit** `feat: add tap-to-reveal hints and Pass walkthrough`

---

### Task 10: Sound and mute

**Files:**
- Modify: `src/ui/sound.ts`, `src/ui/app.ts`, `src/main.ts`
- Test: `src/ui/sound.test.ts`, add to `src/ui/app.test.ts`

**Interfaces:**
- Produces: `export function createSound(ctor?: typeof AudioContext): SoundPlayer;` Its default `ctor` is `window.AudioContext ?? window.webkitAudioContext`. If `ctor` is undefined, it behaves like `createSilentSound`.
- DOM: `[data-action="mute"]` in the top bar, showing `🔊` when unmuted and `🔇` when muted.

Behaviour:
- Create the `AudioContext` lazily in `unlock()`, then call `resume()`.
- Before `unlock`, and while muted, every sound call is a no-op.
- Sounds use `OscillatorNode` + `GainNode` with short envelopes:
  - **correct:** sine, E5 then G5, 90 ms each.
  - **levelUp:** C5, E5, G5 arpeggio.
  - **wrong:** triangle at ~220 Hz sliding down to ~180 Hz over 200 ms, at low gain.
- The mute tap toggles `progress.muted`, saves, calls `sound.setMuted`, and updates the icon.
- On mount, call `sound.setMuted(progress.muted)`.

- [ ] **Step 1: Write failing tests**

```ts
// sound.test.ts
function fakeCtor() {
  const created: string[] = [];
  class Fake { currentTime = 0; destination = {}; resume = vi.fn(() => Promise.resolve());
    createOscillator() { created.push('osc'); return { type: '', frequency: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; }, start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } }; } }
  return { ctor: Fake as unknown as typeof AudioContext, created };
}
test('no sound before unlock; plays after', () => {
  const f = fakeCtor(); const s = createSound(f.ctor);
  s.correct(); expect(f.created).toHaveLength(0);
  s.unlock(); s.correct(); expect(f.created.length).toBeGreaterThan(0);
});
test('muted plays nothing', () => {
  const f = fakeCtor(); const s = createSound(f.ctor); s.unlock(); s.setMuted(true);
  s.correct(); s.wrong(); s.levelUp(); expect(f.created).toHaveLength(0);
});
test('missing AudioContext never throws', () => {
  const s = createSound(undefined); expect(() => { s.unlock(); s.correct(); s.wrong(); }).not.toThrow();
});
// app.test.ts
test('mute toggle saves and updates icon', () => {
  const s = setup(); s.tap('[data-action="mute"]');
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(true); expect(s.saved.at(-1)!.muted).toBe(true);
  expect(s.root.querySelector('[data-action="mute"]')!.textContent).toBe('🔇');
});
```

- [ ] **Step 2: Run `npx vitest run src/ui` — expect FAIL.**
- [ ] **Step 3: Implement** `createSound` and the mute button, and switch `main.ts` to `createSound()`.
- [ ] **Step 4: Run `npx vitest run` — expect PASS.**
- [ ] **Step 5: Commit** `feat: add synthesized sounds and mute toggle`

---

### Task 11: PWA, install tip, and device check

**Files:**
- Create: `public/icon.svg`, `pwa-assets.config.ts`, `src/ui/installTip.ts`
- Modify: `vite.config.ts`, `index.html`, `src/main.ts`, `src/ui/app.ts`, `package.json`
- Test: `src/ui/installTip.test.ts`

**Interfaces:**
- Produces: `export function shouldShowInstallTip(nav: { standalone?: boolean }, progress: Progress): boolean;` This returns true only when `'standalone' in nav` (an iOS Safari signal), `nav.standalone === false`, and `!progress.installTipShown`.
- DOM: `[data-role="install-tip"]`, with the text `Tip: tap Share, then "Add to Home Screen" to keep your progress safe and play full-screen.`, and a dismiss button `[data-action="dismiss-tip"]`. Dismissing sets `installTipShown: true` and saves.

- [ ] **Step 1: Write failing tests**

```ts
test.each([
  [{ standalone: false }, false, true], [{ standalone: true }, false, false],
  [{}, false, false], [{ standalone: false }, true, false],
])('nav %o, shown %s → %s', (nav, shown, expected) =>
  expect(shouldShowInstallTip(nav, { ...defaultProgress(), installTipShown: shown })).toBe(expected));
```

- [ ] **Step 2: Run `npx vitest run src/ui/installTip.test.ts` — expect FAIL.**
- [ ] **Step 3: Implement `installTip.ts`**, and have `app.ts` mount it with a new `AppDeps.nav` (default `navigator`). Add an app test where tapping dismiss saves `installTipShown: true`.
- [ ] **Step 4: Add the PWA pieces.**
  - Add devDeps `vite-plugin-pwa @vite-pwa/assets-generator`.
  - Create `public/icon.svg`: a rounded square with "+ −" in bold.
  - Create `pwa-assets.config.ts` using `minimal2023Preset`.
  - Add the script `"icons": "pwa-assets-generator"`, run it, and commit the generated PNGs.
  - In `vite.config.ts`, use `VitePWA({ registerType: 'autoUpdate', manifest: { name: 'Math Practice', short_name: 'Math', display: 'standalone', orientation: 'any', background_color: '#fff8ec', theme_color: '#ff9f1c', icons: [...] } })`.
  - In `index.html`, add `apple-touch-icon`, `<meta name="apple-mobile-web-app-capable" content="yes">` and a `theme-color` meta.
  - In `main.ts`, import `registerSW` from `virtual:pwa-register` and call it.
- [ ] **Step 5: Run `npx vitest run && npm run build`.** Expect all tests passing, and `dist/` containing `sw.js` and `manifest.webmanifest`.
- [ ] **Step 6: Device check.**
  - Run `npm run preview` in the background and give the user `http://localhost:$PUBLISH_PORT`. From an iPad or iPhone, they use `http://<host LAN IP>:$PUBLISH_PORT`.
  - Warn them that the service worker and offline mode need HTTPS or localhost, so offline support can't be tested over plain LAN HTTP. Touch, layout and sound can be.
- [ ] **Step 7: Commit** `feat: make app an installable offline PWA with install tip`
