# Running Total Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a never-resetting total of clean answers, shown as the main badge above the streak, without losing anyone's saved progress.

**Architecture:** `Progress` moves to `version: 2` with a `total` field. `storage.ts` validates v2 records and upgrades valid v1 records (keeping every field, `total = bestStreak`). `recordResult` bumps `total` under the same `clean` rule as the streak. The topbar shows a stacked badge group: `⭐ total` (large) over `🔥 streak` (small).

**Tech Stack:** TypeScript, Vite, Vitest (+ jsdom for UI tests), plain CSS, Playwright for the layout check.

**Spec:** `docs/superpowers/specs/2026-10-25-running-total-design.md`

## Global Constraints

- Count toward `total` exactly when the streak increments: first submit right, no hints, no Pass (`clean` in `recordResult`).
- `total` never resets and has no cap; integer ≥ 0.
- A valid v1 record migrates with every field kept and `total = bestStreak`. Losing streak, bestStreak, levels, `muted` or `installTipShown` on upgrade is a failure.
- Invalid records (any version) still fall back to `defaultProgress()`, as today. Saving always writes v2.
- Badge copy: `⭐ ${total}` and `🔥 ${streak}`.
- Run tests with `npx vitest run`. Typecheck + build with `npx tsc --noEmit && npx vite build --outDir /tmp/claude-1000/dist-check` — **never `npm run build` during this work**: the live preview on `$PUBLISH_PORT` serves `dist/` to the child via ngrok, and an unfinished build there would run the v1→v2 migration on her real progress.
- Don't use `sed -i` on `/workspace` (fails on the mount).

## Review Focus

- A real v1 record (streak 58, mid-ladder levels, non-empty windows, `installTipShown: true`) loads with all fields intact and `total = bestStreak`. → Task 1, `migrates a realistic v1 record`.
- Reloading before the first answer re-migrates to the same result (migration isn't written until the next save). → Task 1, `migration is stable across reloads before a save`.
- A clean answer on an off-level problem (the 30% not at the current level) still counts toward the total, just as it does for the streak. → Task 2, `clean off-level answer still counts`.
- A big total (5 digits) must not push the mute button off or wrap the badge on a 375px phone. → Task 3, layout check with `total: 12345`.
- Stacking two badges steals height from the problem on short screens; cells must not shrink noticeably. → Task 3, before/after cell sizes from `shots.mjs`.

---

### Task 1: Progress v2 with v1 → v2 migration

**Files:**
- Modify: `src/core/progress.ts` (type + `defaultProgress`)
- Modify: `src/storage.ts` (validation + migration)
- Test: `src/storage.test.ts`

**Interfaces:**
- Produces: `Progress` = `{ version: 2; addition; subtraction; streak; bestStreak; total: number; muted; installTipShown }`. `defaultProgress()` returns `version: 2, total: 0`.
- Produces (internal to `storage.ts`): `isValidProgress(x): x is Progress` checks v2 (all v1 checks with `version === 2`, plus `isIntIn(x.total, 0, Number.MAX_SAFE_INTEGER)`); a v1 validator (today's checks with `version === 1`); `upgradeV1(v1) => Progress` returning `{ ...v1, version: 2, total: v1.bestStreak }`. `load()` returns v2 as-is, upgraded v1, else `defaultProgress()`. Share the field checks between v1 and v2 rather than duplicating them.

- [ ] **Step 1: Write the failing tests** in `src/storage.test.ts`

```ts
const v1 = {
  version: 1,
  addition: { level: 6, window: [1, 0.8, 1], calibrationLeft: 0 },
  subtraction: { level: 5, window: [0.3], calibrationLeft: 0 },
  streak: 58, bestStreak: 61, muted: false, installTipShown: true,
};

test('defaults are v2 with total 0', () => {
  expect(defaultProgress()).toMatchObject({ version: 2, total: 0 });
});

test('migrates a realistic v1 record', () => {
  const s = mem();
  s.m.set(STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual({ ...v1, version: 2, total: 61 });
});

test('migration is stable across reloads before a save', () => {
  const s = mem();
  s.m.set(STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual(createStore(s).load());
});

test('saving a migrated record writes v2', () => {
  const s = mem();
  s.m.set(STORAGE_KEY, JSON.stringify(v1));
  const store = createStore(s);
  store.save(store.load());
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 2, total: 61, streak: 58 });
});
```

Add to the existing invalid `test.each` list:

```ts
JSON.stringify({ ...defaultProgress(), total: -1 }),
JSON.stringify({ ...defaultProgress(), total: 1.5 }),
JSON.stringify({ ...defaultProgress(), total: '3' }),
JSON.stringify({ ...defaultProgress(), total: undefined }),          // v2 without total
JSON.stringify({ ...v1, addition: { level: 12, window: [], calibrationLeft: 0 } }), // invalid v1 isn't migrated
JSON.stringify({ ...v1, version: 3 }),
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/storage.test.ts`
Expected: FAIL (defaults have `version: 1`, no `total`; v1 record falls back to defaults).

- [ ] **Step 3: Implement** the `Progress` change in `src/core/progress.ts` and the validation/migration in `src/storage.ts` per the Interfaces block.

- [ ] **Step 4: Run all tests and typecheck**

Run: `npx vitest run && npx tsc --noEmit && npx vite build --outDir /tmp/claude-1000/dist-check`
Expected: all pass; build OK. (Other tests build progress via `defaultProgress()`, so they pick up v2 automatically.)

- [ ] **Step 5: Commit**

```bash
git add src/core/progress.ts src/storage.ts src/storage.test.ts
git commit -m "feat: move saved progress to v2 with a running total, upgrading v1"
```

### Task 2: Count clean answers toward the total

**Files:**
- Modify: `src/core/session.ts` (`recordResult`)
- Test: `src/core/session.test.ts`

**Interfaces:**
- Consumes: `Progress.total` (Task 1).
- Produces: `recordResult` returns `progress.total = p.total + 1` when `clean`, else `p.total`, regardless of whether the problem was at the current level.

- [ ] **Step 1: Write the failing tests** in `src/core/session.test.ts`

In `recordResult: clean answer extends streak and best`, start from `{ ...defaultProgress(), streak: 4, bestStreak: 4, total: 10 }` and add `expect(r.progress.total).toBe(11);`.

In the `test.each([{ wrongSubmits: 1 }, { hintsUsed: 1 }, { passed: true }])` case, start from `total: 10` and add `expect(r.progress.total).toBe(10);`.

New test:

```ts
test('clean off-level answer still counts toward the total', () => {
  const start = { ...defaultProgress(), total: 7 }; // current addition level is 4
  const r = recordResult(start, { op: '+', a: 23, b: 4, level: 3 }, clean);
  expect(r.progress.total).toBe(8);
  expect(r.progress.addition).toEqual(start.addition);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/core/session.test.ts`
Expected: FAIL on the `total` assertions.

- [ ] **Step 3: Implement** the `total` update in `recordResult` alongside the streak update (the `progress` object is built before the off-level early return, so off-level answers are covered).

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/session.ts src/core/session.test.ts
git commit -m "feat: count clean answers toward the running total"
```

### Task 3: Total badge above the streak

**Files:**
- Modify: `src/ui/app.ts` (topbar shell + `render`)
- Modify: `src/styles.css` (badge group)
- Test: `src/ui/app.test.ts`
- Modify: `.context/playwright/shots.mjs` (fixture `total`, and a large-total run)

**Interfaces:**
- Consumes: `Progress.total` (Task 1), `recordResult` behavior (Task 2).
- Produces: topbar markup `<div class="badges"><span class="total" data-role="total">⭐ N</span><span class="streak" data-role="streak">🔥 N</span></div>` followed by the mute button. `data-role="streak"` stays as is.

- [ ] **Step 1: Record the layout baseline before changing anything**

Add the iPad 6 viewports to the default `views` list in `.context/playwright/shots.mjs`: `['ipad6-l', 1024, 768], ['ipad6-l-tabs', 1024, 665], ['ipad102-l-tabs', 1080, 707], ['ipad6-p-tabs', 768, 918]`. Copy the scripts to `/tmp/claude-1000/pw/` (see `.context/running.md`). The live preview on `$PUBLISH_PORT` still serves the pre-change build, so measure it read-only:
`cd /tmp/claude-1000/pw && SEEDS=4 URL=http://localhost:$PUBLISH_PORT node shots.mjs > baseline.txt`
Expected: one line per viewport with cell sizes; only `se-tab` fails (known, accepted at 34px).

- [ ] **Step 2: Write the failing UI tests** in `src/ui/app.test.ts`

```ts
test('total badge shows the saved total and goes up on a clean answer', () => {
  const s = setup(1, {}, { ...defaultProgress(), total: 41, streak: 3 });
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 41');
  expect(s.q('[data-role="streak"]')!.textContent).toBe('🔥 3');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 42');
  expect(s.saved[0].total).toBe(42);
});

test('a wrong first try resets the streak but keeps the total', () => {
  const s = setup(1, {}, { ...defaultProgress(), total: 41, streak: 3 });
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 41');
  expect(s.q('[data-role="streak"]')!.textContent).toBe('🔥 0');
});
```

(Import `defaultProgress` from `../core/progress`.)

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/ui/app.test.ts`
Expected: FAIL (`[data-role="total"]` not found).

- [ ] **Step 4: Implement the markup and copy** in `src/ui/app.ts` per the Interfaces block; set both texts in `render()`.

- [ ] **Step 5: Style the badge group** in `src/styles.css`

- `.badges`: column, `align-items: flex-start`, small gap (4px).
- `.total` takes today's `.streak` pill look (size, padding, radius, shadow); `.streak` becomes the smaller pill (about 1.05rem, tighter padding). Both `white-space: nowrap; font-variant-numeric: tabular-nums`.
- In `@media (max-height: 760px)`: shrink both so the stacked group is no taller than about 56px.
- In phone landscape (`(orientation: landscape) and (max-height: 500px)`): lay `.badges` out as a row (total first) so the topbar keeps its height.

- [ ] **Step 6: Run tests and build**

Run: `npx vitest run && npx tsc --noEmit && npx vite build --outDir /tmp/claude-1000/dist-check`
Expected: all pass; build OK.

- [ ] **Step 7: Layout check after**

In `.context/playwright/shots.mjs`, set the fixture to `version: 2, total: 12` and add a `TOTAL` env override (default 12) so a 5-digit run is possible. Serve the check build on a private port (not `$PUBLISH_PORT`): `npx vite preview --outDir /tmp/claude-1000/dist-check --port 5199 --strictPort` (background). Copy the script to `/tmp/claude-1000/pw/`, then run:
`SEEDS=4 URL=http://localhost:5199 node shots.mjs > after.txt` and `TOTAL=12345 SEEDS=2 URL=http://localhost:5199 node shots.mjs > after-big.txt`. Stop the 5199 preview afterwards.
Expected: no new failures versus `baseline.txt`; on every viewport the cell size drops by at most 3px; no horizontal scroll or topbar overlap with `TOTAL=12345` at 375px. Look at the `ipad6-l-tabs` and `se-tab` screenshots. Report baseline vs after cell sizes in the task summary.

- [ ] **Step 8: Commit**

```bash
git add src/ui/app.ts src/ui/app.test.ts src/styles.css .context/playwright/shots.mjs
git commit -m "feat: show the running total above the streak"
```
