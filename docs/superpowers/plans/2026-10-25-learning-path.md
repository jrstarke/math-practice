# Learning Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operations unlock as earlier ones are mastered, start at level 1, and fade to review at level 9, with a "New: subtraction!" moment on unlock.

**Architecture:** `Progress` v3 records which operations are unlocked, saved under its own key with an upgrade chain from v2 and v1. A new `core/path.ts` holds the unlock rules and the weighted choice of operation; `session.ts` uses it to pick each problem and reports new unlocks from `recordResult`. The UI plays the level-up sound and shows a friendly message that survives the auto-advance until the next key press.

**Tech Stack:** TypeScript, Vite, Vitest (+ jsdom for UI tests), plain CSS, Playwright layout check.

**Spec:** `docs/superpowers/specs/2026-10-25-learning-path-design.md`

## Global Constraints

- Addition always unlocked. Subtraction unlocks when addition's current level ≥ 3. (Multiplication is the next project; don't add it.)
- Unlocks are permanent. Every operation starts at level 1 with calibration 10 (new player's addition; any operation when it unlocks).
- Mix: weight 1 per unlocked operation, 1/5 for one at level 9 (`MAX_LEVEL`). Thresholds and the 1/5 share live in one place (`core/path.ts`).
- On unlock: `sound.levelUp()` and the message `New: subtraction!` in a friendly (green, not red) style; it stays through the auto-advance to the next problem and clears on her first key press.
- Progress v3 under `math-practice-progress-v3`; load order v3 → v2 key (`math-practice-progress-v2`) → v1 key (`math-practice-progress`) → defaults. Older keys are read, never written. Upgrades keep every field; v2/v1 players get both addition and subtraction unlocked and keep their levels.
- Tests: `npx vitest run`. Typecheck + build: `npx tsc --noEmit && npx vite build --outDir /tmp/claude-1000/dist-check --emptyOutDir`. Never `npm run build` during this work. Don't use `sed -i` on `/workspace`.
- Work on a branch (`feat/learning-path`), not `main`.

## Review Focus

- A v2 player whose addition level is below 3 must keep subtraction after upgrading (no re-lock). → Task 1, `v2 player below the threshold keeps subtraction`.
- Upgraded players must not get a "New: subtraction!" announcement on their first answer. → Task 2, `no unlock is reported when subtraction is already unlocked`.
- Addition dropping back to 2 and climbing to 3 again must not unlock (or reset subtraction) a second time. → Task 2, `unlock happens once; later threshold crossings change nothing`.
- Both operations at level 9 must still split evenly (1/5 each normalises to half each), never divide by zero or pick nothing. → Task 2, `both at level 9 still split evenly`.
- The 1-second auto-advance after a correct answer currently clears the message; the unlock message must survive it. → Task 3, `unlock message survives the auto-advance and clears on the next key`.

---

### Task 1: Progress v3 with unlocks and the upgrade chain

**Files:**
- Modify: `src/core/progress.ts`, `src/storage.ts`
- Test: `src/storage.test.ts`

**Interfaces:**
- Produces: `type OpKey = 'addition' | 'subtraction'` (exported from `progress.ts`, replacing the inline union in `opKey`'s return type). `Progress` = `{ version: 3; unlocked: OpKey[]; addition; subtraction; streak; bestStreak; total; muted; installTipShown }`. `defaultProgress()` → `version: 3, unlocked: ['addition']` (op states still from `initialOpState()`; Task 2 changes its level).
- Produces: `STORAGE_KEY = 'math-practice-progress-v3'`, `V2_STORAGE_KEY = 'math-practice-progress-v2'`, `LEGACY_STORAGE_KEY = 'math-practice-progress'` (all exported).
- Produces (internal): `isValidProgress` checks v3 = v2 checks + `unlocked` is an array of distinct known `OpKey`s that includes `'addition'`. A v2 validator (today's `isValidProgress` with `version === 2`). `upgradeV2(v2) => Progress` = `{ ...v2, version: 3, unlocked: ['addition', 'subtraction'] }`. v1 upgrades via `upgradeV2(upgradeV1(v1))`.

- [ ] **Step 1: Write the failing tests** in `src/storage.test.ts`

Update existing tests to the new shape: the key test expects `STORAGE_KEY` `'math-practice-progress-v3'`, `V2_STORAGE_KEY` `'math-practice-progress-v2'`, `LEGACY_STORAGE_KEY` unchanged; v1 migration tests now expect `{ ...v1, version: 3, total: 61, unlocked: ['addition', 'subtraction'] }`, saves land under `STORAGE_KEY`, and the v1 record stays untouched. Add:

```ts
const v2 = { ...v1, version: 2, total: 75 };

test('defaults are v3 with only addition unlocked', () => {
  expect(defaultProgress()).toMatchObject({ version: 3, unlocked: ['addition'], total: 0 });
});

test('migrates a v2 record, keeping everything and unlocking both', () => {
  const s = mem();
  s.m.set(V2_STORAGE_KEY, JSON.stringify(v2));
  expect(createStore(s).load()).toEqual({ ...v2, version: 3, unlocked: ['addition', 'subtraction'] });
});

test('v2 player below the threshold keeps subtraction', () => {
  const s = mem();
  s.m.set(V2_STORAGE_KEY, JSON.stringify({ ...v2, addition: { level: 2, window: [], calibrationLeft: 0 } }));
  expect(createStore(s).load().unlocked).toEqual(['addition', 'subtraction']);
});

test('v2 is preferred over v1, and both old keys are left untouched by save', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  s.m.set(V2_STORAGE_KEY, JSON.stringify(v2));
  const store = createStore(s);
  expect(store.load().total).toBe(75);
  store.save(store.load());
  expect(JSON.parse(s.m.get(V2_STORAGE_KEY)!)).toEqual(v2);
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 3, total: 75 });
});
```

Add to the invalid `test.each` list (stored under `STORAGE_KEY`):

```ts
JSON.stringify({ ...defaultProgress(), unlocked: [] }),
JSON.stringify({ ...defaultProgress(), unlocked: ['subtraction'] }),            // addition missing
JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'addition'] }),
JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'division'] }),
JSON.stringify({ ...defaultProgress(), unlocked: 'addition' }),
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/storage.test.ts`
Expected: FAIL (defaults are v2, no `V2_STORAGE_KEY`, no `unlocked`).

- [ ] **Step 3: Implement** the types and defaults in `progress.ts` and the validators, upgrades and load chain in `storage.ts` per the Interfaces block. `load()` tries each key in order and uses the first valid record, upgrading it to v3; a key whose content is missing, unparseable or invalid falls through to the next.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass. If a test elsewhere built a `Progress` literal by hand, give it `version: 3, unlocked: [...]` (ledger it).

- [ ] **Step 5: Commit**

```bash
git add src/core/progress.ts src/storage.ts src/storage.test.ts
git commit -m "feat: save progress as v3 with unlocked operations, upgrading v2 and v1"
```

### Task 2: Unlock rules, level-1 starts, and the weighted mix

**Files:**
- Create: `src/core/path.ts`, `src/core/path.test.ts`
- Modify: `src/core/adaptive.ts` (`initialOpState`), `src/core/session.ts`, `src/core/progress.ts` (add `opOf`)
- Test: `src/core/adaptive.test.ts`, `src/core/session.test.ts`

**Interfaces:**
- Consumes: `Progress.unlocked`, `OpKey` (Task 1).
- Produces: `initialOpState()` → `{ level: 1, window: [], calibrationLeft: 10 }`.
- Produces in `progress.ts`: `opOf(key: OpKey): Op` (inverse of `opKey`).
- Produces in `path.ts`: `UNLOCK_RULES: Record<OpKey, Partial<Record<OpKey, number>>>` = `{ addition: {}, subtraction: { addition: 3 } }`; `REVIEW_SHARE = 0.2`; `applyUnlocks(p: Progress): { progress: Progress; unlocked: OpKey[] }` — adds every locked op whose rules are all met (in `UNLOCK_RULES` key order), setting its state to `initialOpState()`, and returns the newly unlocked keys; `pickOp(p: Progress, rng: Rng): Op` — weighted by 1 per unlocked op, `REVIEW_SHARE` when its level is `MAX_LEVEL`.
- Produces in `session.ts`: `nextProblem` chooses the op with `pickOp`. `recordResult` returns `{ progress, levelChange, unlocked: OpKey[] }`, applying `applyUnlocks` after streak/total/adaptation.

- [ ] **Step 1: Write the failing tests**

`adaptive.test.ts`: `initial state` expects `{ level: 1, window: [], calibrationLeft: 10 }`. Tests that used `initialOpState()` as a level-4 start get an explicit `{ level: 4, window: [], calibrationLeft: 10 }` fixture with their current expectations unchanged.

`path.test.ts`:

```ts
const at = (level: number) => ({ level, window: [], calibrationLeft: 0 });
const base = { ...defaultProgress(), addition: at(2) };

test('subtraction unlocks when addition reaches level 3, starting at level 1 with calibration', () => {
  const r = applyUnlocks({ ...base, addition: at(3), subtraction: at(7) });
  expect(r.unlocked).toEqual(['subtraction']);
  expect(r.progress.unlocked).toEqual(['addition', 'subtraction']);
  expect(r.progress.subtraction).toEqual({ level: 1, window: [], calibrationLeft: 10 });
});

test('below the threshold nothing unlocks', () => {
  expect(applyUnlocks(base)).toEqual({ progress: base, unlocked: [] });
});

test('unlock happens once; later threshold crossings change nothing', () => {
  const once = applyUnlocks({ ...base, addition: at(3) }).progress;
  const dropped = { ...once, addition: at(2), subtraction: at(4) };
  expect(applyUnlocks(dropped)).toEqual({ progress: dropped, unlocked: [] });
  const again = { ...dropped, addition: at(3) };
  expect(applyUnlocks(again)).toEqual({ progress: again, unlocked: [] });
});

test('only addition unlocked → every problem is addition', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 200; i++) expect(pickOp(base, rng)).toBe('+');
});

test('an operation at level 9 gets about a sixth of problems', () => {
  const p = { ...base, unlocked: ['addition', 'subtraction'] as OpKey[], addition: at(9), subtraction: at(5) };
  const rng = mulberry32(2);
  let plus = 0;
  for (let i = 0; i < 6000; i++) if (pickOp(p, rng) === '+') plus++;
  expect(plus / 6000).toBeGreaterThan(0.14);
  expect(plus / 6000).toBeLessThan(0.195);
});

test('both at level 9 still split evenly', () => {
  const p = { ...base, unlocked: ['addition', 'subtraction'] as OpKey[], addition: at(9), subtraction: at(9) };
  const rng = mulberry32(3);
  let plus = 0;
  for (let i = 0; i < 4000; i++) if (pickOp(p, rng) === '+') plus++;
  expect(plus / 4000).toBeGreaterThan(0.45);
  expect(plus / 4000).toBeLessThan(0.55);
});
```

`session.test.ts`:
- Replace `nextProblem mixes operations` with: defaults → 50 problems all `'+'`; with `unlocked: ['addition', 'subtraction']` (both at level 4) → both ops appear.
- `nextProblem avoids the last 10 problems`: give its fixture `unlocked: ['addition', 'subtraction']`.
- Tests whose problems are "at the current level 4" get explicit `addition`/`subtraction` level-4 fixtures (defaults are level 1 now) and `unlocked: ['addition', 'subtraction']` where they use subtraction.
- New:

```ts
test('a level-up to addition 3 reports the unlock on that answer', () => {
  const start = { ...defaultProgress(), addition: { level: 2, window: [], calibrationLeft: 10 } };
  const once = recordResult(start, { op: '+', a: 7, b: 8, level: 2 }, clean);
  const r = recordResult(once.progress, { op: '+', a: 6, b: 9, level: 2 }, clean); // second clean in calibration → level 3
  expect(r.levelChange).toBe(1);
  expect(r.unlocked).toEqual(['subtraction']);
  expect(r.progress.unlocked).toEqual(['addition', 'subtraction']);
});

test('no unlock is reported when subtraction is already unlocked', () => {
  const p = { ...defaultProgress(), unlocked: ['addition', 'subtraction'] as OpKey[], addition: { level: 5, window: [], calibrationLeft: 0 } };
  expect(recordResult(p, { op: '+', a: 34, b: 25, level: 5 }, clean).unlocked).toEqual([]);
});
```

(Check that `7 + 8` and `6 + 9` satisfy level 2 via `matchesLevel`; if not, pick any level-2 addition problem.)

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/core`
Expected: FAIL — `path.ts` missing, initial level 4, `recordResult` has no `unlocked`, defaults still mix operations.

- [ ] **Step 3: Implement** `initialOpState` (level 1), `opOf`, `path.ts`, and the `session.ts` changes per the Interfaces block. `pickOp`: sum the weights, draw `rng() * sum`, walk the unlocked ops in order.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass. UI tests that assumed subtraction appears by default (if any) get `unlocked: ['addition', 'subtraction']` fixtures (ledger it).

- [ ] **Step 5: Commit**

```bash
git add src/core/path.ts src/core/path.test.ts src/core/adaptive.ts src/core/adaptive.test.ts src/core/session.ts src/core/session.test.ts src/core/progress.ts
git commit -m "feat: unlock subtraction at addition level 3, start at level 1, fade topped-out operations"
```

### Task 3: "New: subtraction!" moment

**Files:**
- Modify: `src/ui/app.ts`, `src/styles.css`, `.context/playwright/shots.mjs`
- Test: `src/ui/app.test.ts`

**Interfaces:**
- Consumes: `recordResult(...).unlocked: OpKey[]` (Task 2).
- Produces: on a correct submit whose result has new unlocks, `sound.levelUp()` (once, instead of `correct`) and the message line shows `New: subtraction!` with class `good` (`.message.good { color: var(--good); }`). The note persists through `showNext()` and is cleared by the next pad key press. Copy: `` `New: ${key}!` `` for key `subtraction`.

- [ ] **Step 1: Write the failing tests** in `src/ui/app.test.ts`

```ts
const nearUnlock = () => ({ ...defaultProgress(), addition: { level: 2, window: [1], calibrationLeft: 9 } });
// One clean answer at level 2 during calibration with a prior perfect score moves addition to 3.

test('unlocking subtraction plays the level-up sound and shows a friendly message', () => {
  const s = setup(1, {}, nearUnlock());
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.sound.levelUp).toHaveBeenCalledOnce();
  expect(s.sound.correct).not.toHaveBeenCalled();
  const msg = s.q('[data-role="message"]')!;
  expect(msg.textContent).toBe('New: subtraction!');
  expect(msg.classList.contains('good')).toBe(true);
  expect(s.saved[0].unlocked).toEqual(['addition', 'subtraction']);
});

test('unlock message survives the auto-advance and clears on the next key', () => {
  const s = setup(1, {}, nearUnlock());
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  s.advance(1000);
  expect(s.q('[data-role="message"]')!.textContent).toBe('New: subtraction!');
  s.tap('[data-key="1"]');
  expect(s.q('[data-role="message"]')!.textContent).toBe('');
  expect(s.q('[data-role="message"]')!.classList.contains('good')).toBe(false);
});
```

Before relying on `nearUnlock`, confirm with `update()` in `adaptive.ts` that a calibration window of `[1]` plus one score of 1 at level 2 levels up (two perfect scores in a row); adjust the fixture if the first problem drawn isn't at level 2 (calibration always picks the current level, so it should be).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/ui/app.test.ts`
Expected: FAIL (no message; `correct` sound plays).

- [ ] **Step 3: Implement** in `app.ts`: `finish()` returns the whole `recordResult` result; `submit()` picks the sound and sets an unlock note; `render()` shows the note (with class `good`) when there's no other message; `showNext()` leaves the note; the pad key handler clears it. Add the `.message.good` rule to `styles.css`.

- [ ] **Step 4: Run tests and side build**

Run: `npx vitest run && npx tsc --noEmit && npx vite build --outDir /tmp/claude-1000/dist-check --emptyOutDir`
Expected: all pass; build OK.

- [ ] **Step 5: Layout check**

In `.context/playwright/shots.mjs`, store the fixture under `math-practice-progress-v3` with `version: 3, unlocked: ['addition', 'subtraction']`. Serve `/tmp/claude-1000/dist-check` with `npx vite preview --outDir /tmp/claude-1000/dist-check --port 5199 --strictPort` (background), copy the scripts to `/tmp/claude-1000/pw/`, run `SEEDS=2 URL=http://localhost:5199 node shots.mjs`.
Expected: same results as the running-total check (only the known `se-tab` 34px floor fails). Stop the 5199 preview by PID (`pkill -f` matches its own shell).

- [ ] **Step 6: Commit**

```bash
git add src/ui/app.ts src/ui/app.test.ts src/styles.css .context/playwright/shots.mjs
git commit -m "feat: announce newly unlocked operations"
```
