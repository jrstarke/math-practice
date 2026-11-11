# Day Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the 🔥 badge and add a forgiving days-in-a-row streak: Robo welcomes her on opening the app, and her
10th right answer each day plays a day celebration that grows with the streak (wave → arms up → jump → fireworks).

**Architecture:** Pure day-count rules in a new `src/core/days.ts`; the count lives in progress v7 and is updated by
`recordResult`. `decideRobo` gains a `day` big moment (priority kick > day > high five > walk, ignores cooldown, held
back past a kick). The Robo view gains `greet()` (welcome) and a `day` moment with tiers. `app.ts` wires the clock,
welcome on start / resume after 30 min, and hides the 🔥.

**Tech Stack:** TypeScript, vanilla DOM, Vite PWA, vitest (+ jsdom for UI), Playwright layout check in
`.context/playwright/shots.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-11-day-streak-design.md`

## Global Constraints

- Run tools with `PATH="$HOME/.asdf/shims:$PATH"` (asdf shims sometimes drop off PATH). `sed -i` fails on /workspace — edit with the Edit tool.
- Daily goal: **10** right answers (hints/wrong tries count; a Pass doesn't).
- Day = local calendar date, stored as `YYYY-MM-DD`.
- Forgiveness: last completed day was 1 or 2 days before → streak + 1; 3+ days or never → 1.
- Exact words (copy verbatim):
  - Welcome: `Welcome back, let's do some math!` — first visit (total 0): `Hi! Let's do some math!`
  - Day 1: `Good job getting your math in today! Tomorrow can be day 2!`
  - Day N ≥ 2: `You did your math ${N} days in a row! Keep it up!`
  - Walk: `You've gotten ${N} questions right! Keep going!` with N = her star total when it plays.
- Tiers: day 1 `wave`; 2–4 `arms`; 5–9 `jump`; 10+ `fireworks`.
- Welcome on app start and on returning to the foreground after hidden ≥ **30 min** (`WELCOME_AFTER_MS = 30 * 60 * 1000`); a reload within 30 min of hiding is not a start.
- Never show the day count anywhere but Robo's words. Never say a streak was lost.
- `streak` / `bestStreak` keep being counted; only the badge goes.
- Storage: new key `math-practice-progress-v7`; v6 key read once to migrate, never written.

## Review Focus

1. **Midnight mid-session** — answers before and after midnight: the count restarts at midnight; the 10th answer of the new date completes the new day. (Test in Task 1.)
2. **Reload mid-day** — 6 answers, reload, 4 more → the day completes on the 10th overall. (Test in Task 2: v7 round-trip keeps `day`.)
3. **Update reload right after a short switch** — hidden 5 min, app reloads → no welcome. (Test in Task 5.)
4. **Resume while Robo is up with a hint or away on a moment** — welcome is skipped, nothing covers the problem. (Test in Task 5.)
5. **10th answer is a Pass, or coincides with an unlock** — a Pass never counts; with an unlock the kick plays and the day plays on the next right answer. (Tests in Tasks 2 and 3.)

---

### Task 1: Day-count rules

**Files:**
- Create: `src/core/days.ts`
- Test: `src/core/days.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const DAILY_GOAL = 10;
  export interface DayStreak { date: string | null; right: number; days: number; lastDone: string | null }
  export function initialDayStreak(): DayStreak            // { date: null, right: 0, days: 0, lastDone: null }
  export function localDate(d: Date): string               // 'YYYY-MM-DD' from local getFullYear/getMonth/getDate, zero-padded
  export function daysBetween(from: string, to: string): number // calendar days to − from (via Date.UTC of the parts; DST-proof)
  export function countRightAnswer(s: DayStreak, today: string): { streak: DayStreak; completed: number | null }
  ```
  `completed` is the new day-streak length when this answer completes `today`, else null.

- [ ] **Step 1: Write the failing tests** in `src/core/days.test.ts`:
  - `localDate(new Date(2026, 0, 5, 23, 59))` → `'2026-01-05'`.
  - `daysBetween('2026-11-10','2026-11-11')` → 1; `('2026-02-28','2026-03-01')` → 1; `('2026-12-31','2027-01-01')` → 1; `('2026-03-07','2026-03-09')` → 2 (across a DST change); `('2026-11-11','2026-11-10')` → −1.
  - 9 answers on `'2026-11-11'` from initial → each `completed` null, `right` 9; 10th → `completed` 1, `days` 1, `lastDone '2026-11-11'`; 11th → `completed` null, `days` 1.
  - `{ date:'2026-11-10', right:10, days:4, lastDone:'2026-11-10' }`, ten answers on `'2026-11-11'` → 10th completes with 5 (first answer resets `right` to 1 and `date` to today).
  - lastDone `'2026-11-09'` (one missed day), days 4 → completing `'2026-11-11'` gives 5.
  - lastDone `'2026-11-08'` (two missed days), days 4 → gives 1.
  - midnight: 5 answers on `'2026-11-10'`, then 10 on `'2026-11-11'` → completes on the 10th of the 11th, not the 5th.
  - clock backwards: lastDone `'2026-11-11'`, days 3, ten answers on `'2026-11-10'` → `completed` null, `days` 3, `lastDone` unchanged. Same with ten more answers back on `'2026-11-11'` (already done) → null, unchanged.

- [ ] **Step 2: Run to verify they fail**
  Run: `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/core/days.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/core/days.ts`.** Rule on reaching exactly `DAILY_GOAL`: `gap = lastDone ? daysBetween(lastDone, today) : Infinity`; `gap <= 0` → nothing changes, `completed` null; `gap` 1 or 2 → `days + 1`; else `days = 1`; then `lastDone = today`. A different `date` than `today` resets `right` to 0 before adding 1.

- [ ] **Step 4: Run to verify they pass** (same command) — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/core/days.ts src/core/days.test.ts && git commit -m "feat: day streak rules (10 right answers a day, one missed day forgiven)"`

---

### Task 2: Progress v7 and counting answers

**Files:**
- Modify: `src/core/progress.ts` (Progress, defaultProgress)
- Modify: `src/storage.ts` (keys, validation, v6→v7 upgrade, load chain)
- Modify: `src/core/session.ts` (`recordResult`)
- Test: `src/storage.test.ts`, `src/core/session.test.ts`

**Interfaces:**
- Consumes: Task 1's `DayStreak`, `initialDayStreak`, `countRightAnswer`.
- Produces:
  - `Progress` gains `version: 7`, `day: DayStreak`, `hiddenAt: number | null` (epoch ms when the app was last hidden; null = never). Defaults `initialDayStreak()` / `null`.
  - `storage.ts`: `STORAGE_KEY = 'math-practice-progress-v7'`, new `V6_STORAGE_KEY = 'math-practice-progress-v6'`; `upgradeV6(p: ProgressV6): Progress` adds the defaults; old `upgradeV5` now returns `ProgressV6` and every older chain ends `… → upgradeV6`.
  - `recordResult(p: Progress, problem: Problem, a: AttemptInput, today: string): { progress: Progress; levelChange: LevelChange; unlocked: OpKey[]; dayDone: number | null }` — a non-Pass answer goes through `countRightAnswer`; `dayDone` is its `completed`. A Pass leaves `day` untouched, `dayDone` null.

- [ ] **Step 1: Write the failing tests**
  - storage: `STORAGE_KEY` is `'math-practice-progress-v7'`, `V6_STORAGE_KEY` is `'math-practice-progress-v6'`; a realistic v6 record migrates to `{ ...v6, version: 7, day: initialDayStreak(), hiddenAt: null }`; saving after the upgrade writes only the v7 key and leaves the v6 string byte-identical; an invalid v7 record falls back to a valid v6 one; a v7 record with `day.date: '2026-13-01x'` or `day.right: -1` or `hiddenAt: 'x'` is invalid; a v7 round-trip with `day: { date:'2026-11-11', right:6, days:3, lastDone:'2026-11-10' }` loads back equal (Review Focus 2). Update existing tests that hard-code v6 as current (their expectations now end at v7).
  - session: ten non-Pass `recordResult` calls with `today '2026-11-11'` from `defaultProgress()` → `dayDone` null ×9 then 1; one with `hintsUsed: 2, wrongSubmits: 1` counts (`day.right` 1); a Pass leaves `day` equal to before and `dayDone` null (Review Focus 5); `streak`/`bestStreak` behave as before.

- [ ] **Step 2: Run to verify they fail**
  Run: `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/storage.test.ts src/core/session.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement.** Validation for v7 = v6 checks with `version === 7` plus: `day` an object with `date`/`lastDone` each `null` or matching `/^\d{4}-\d{2}-\d{2}$/`, `right`/`days` integers ≥ 0; `hiddenAt` null or a finite number. Keep the v6 validator under the name `isValidProgressV6`. Update every `recordResult` caller (`src/ui/app.ts` `finish()`: pass `localDate(new Date(Date.now()))` for now; Task 5 switches it to the injected clock) so `tsc` stays green.

- [ ] **Step 4: Run all tests and typecheck**
  Run: `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npx tsc --noEmit` — Expected: all PASS, no type errors.

- [ ] **Step 5: Commit** — `git commit -am "feat: progress v7 keeps the day streak; right answers count toward the day"` (add new files if any).

---

### Task 3: Robo decides the day celebration and the walk's words

**Files:**
- Modify: `src/core/robo.ts`
- Test: `src/core/robo.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type DayTier = 'wave' | 'arms' | 'jump' | 'fireworks';
  export type BigMoment = …existing… | { kind: 'day'; days: number; tier: DayTier; words: string };
  RoboOutcome gains `dayDone: number | null`;
  RoboMemory gains `pendingDay: number | null` (initial null);
  RoboMemory.pendingWalk keeps the earned milestone (number) — unchanged meaning.
  export function dayTier(days: number): DayTier;   // 1 wave, 2–4 arms, 5–9 jump, ≥10 fireworks
  export function dayWords(days: number): string;   // exact copy from Global Constraints
  export function welcomeWords(total: number): string; // total 0 → "Hi! Let's do some math!", else "Welcome back, let's do some math!"
  walkWords(n) unchanged; the walk now uses `walkWords(o.totalAfter)`, `withFriend: milestone % 100 === 0`.
  ```

- [ ] **Step 1: Write the failing tests** (add `dayDone: null` to the shared `clean` outcome):
  - `dayTier` 1→wave, 2→arms, 4→arms, 5→jump, 9→jump, 10→fireworks, 30→fireworks; `dayWords(1)` and `dayWords(7)` equal the exact strings; `welcomeWords(0)` / `welcomeWords(3)`.
  - `dayDone: 3` → `big` `{ kind:'day', days:3, tier:'arms', words:'You did your math 3 days in a row! Keep it up!' }`, `line` null.
  - day plays inside the cooldown: a high five, then `dayDone: 2` on the next answer → day plays.
  - day beats high five (same answer `levelChange: 1, dayDone: 5`) → day; the high five is not replayed later.
  - day beats a walk (same answer reaches 40 stars) → day; the walk plays when the cooldown allows.
  - kick beats day: `unlocked: ['division'], dayDone: 4` → kick; next right answer → day with 4 (Review Focus 5); a Pass in between doesn't play it, the next right answer does.
  - held-back walk words use the current total: reaches 40 during cooldown, plays at 45 → `"You've gotten 45 questions right! Keep going!"`; earned at 100, plays at 104 → `withFriend: true`, words say 104. Update the existing walk tests' expectations accordingly.

- [ ] **Step 2: Run to verify they fail**
  Run: `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/core/robo.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement in `decideRobo`.** Order:
  ```
  pendingDay = o.dayDone ?? m.pendingDay
  unlocked                      → kick (pendingDay kept)
  else pendingDay && !o.passed  → day(pendingDay); pendingDay = null   // ignores cooldown
  else allowed && levelUp       → high five
  else allowed && pendingWalk   → walk
  ```
  Add `dayDone: null` wherever `RoboOutcome`s are built in `src/ui/app.ts` so `tsc` stays green (Task 5 passes the real value).

- [ ] **Step 4: Run tests + typecheck** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 5: Commit** — `git commit -am "feat: Robo's day celebration takes its turn; held-back walks say the current count"`

---

### Task 4: Robo draws the welcome and the day celebrations

**Files:**
- Modify: `src/ui/robo/robo.ts`, `src/ui/robo/robo.css`, `src/ui/robo/preview.ts`
- Test: `src/ui/robo/robo.test.ts`

**Interfaces:**
- Consumes: Task 3's `BigMoment` `day` variant, `DayTier`.
- Produces:
  - `MOMENT_MS` gains `day: 3500`, `welcome: 3000`.
  - `RoboView.greet(words: string, at: MomentPlace): number` — standing: Robo at its spot does the existing `data-surprise="wave"` and says `words` in its own bubble, returns `MOMENT_MS.welcome`; Robo is not marked away. Peek mode: the peek moment with `words`, returns `MOMENT_MS.peek`. `endMoment()` clears the wave; the caller clears the words with `say('')`.
  - `play()` handles `day`: scene `data-moment="day"` with `data-tier="<tier>"`, one cheering Robo in a `.robo-slot`, the words, and for `fireworks` a `.robo-fireworks` element (SVG bursts) beside Robo in the lane — above only if `at.laneTop` leaves room (it usually doesn't). Returns `MOMENT_MS.day`. Peek mode: existing peek moment with the words.
  - `peekMoment` takes `(words: string, at: MomentPlace)` so both `play` and `greet` use it.

- [ ] **Step 1: Write the failing tests** (jsdom):
  - `greet('Welcome back, let\'s do some math!', standingPlace)` → returns 3000; `[data-role="robo-bubble"]` text is the words; `[data-role="robo"]` has `data-surprise="wave"` and no `data-away`; overlay empty.
  - `greet(words, peekPlace)` → overlay has `[data-moment="peek"]` whose words element shows `words`.
  - `play({kind:'day', days:1, tier:'wave', words}, standingPlace)` → returns 3500; `[data-moment="day"][data-tier="wave"]`; words shown; no `.robo-fireworks`. Same for `arms`, `jump`; `fireworks` tier has `.robo-fireworks`.
  - `endMoment()` after a greet removes `data-surprise`.

- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/ui/robo/robo.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement view + CSS.** Animations (CSS, keyed off `[data-moment="day"][data-tier=…]`): `wave` reuses `robo-wave` on the right arm; `arms`/`jump`/`fireworks` set `arms: 'up'` via `setFigure`; `jump`/`fireworks` add a hop of `calc(var(--s,1) * 24px)` twice over the moment; fireworks = 3–5 bursts in Robo's palette that expand and fade, scaled by `--s`. Words placed like the high five's. Under `prefers-reduced-motion: reduce`: no hop, no flying sparks — Robo and words fade in (`robo-fade-in`), bursts fade in static or are hidden.

- [ ] **Step 4: Add preview entries** to `preview.ts` `?moment=`: `welcome` (greet), `day-1`, `day-3`, `day-7`, `day-12` (play with `dayTier`/`dayWords`). Update the header comment's list.

- [ ] **Step 5: Run tests + typecheck** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 6: Commit** — `git commit -am "feat: Robo waves hello and celebrates the day (arms up, jump, fireworks)"`

---

### Task 5: Wire it into the app

**Files:**
- Modify: `src/ui/app.ts`, `src/main.ts`, `src/styles.css` (only if a `.streak` rule exists)
- Test: `src/ui/app.test.ts`, `src/ui/testUtil.ts`

**Interfaces:**
- Consumes: Task 1 `localDate`; Task 2 `recordResult(..., today)`, `Progress.hiddenAt`; Task 3 `welcomeWords`, `RoboOutcome.dayDone`; Task 4 `greet`.
- Produces: `AppDeps.clock?: () => number` (wall-clock epoch ms, default `Date.now`); `export const WELCOME_AFTER_MS = 30 * 60 * 1000;`. `testUtil.setup` passes a controllable `clock` (starting at a fixed date, e.g. `new Date(2026, 10, 11, 9).getTime()`) and returns `setClock(ms)` / `hide()` / `show()` helpers that set `document.visibilityState` (via `Object.defineProperty`) and dispatch `visibilitychange`.

Behaviour:
- Remove the 🔥 badge (`streakEl` and its render line). ⭐ stays.
- `finish()` passes `localDate(new Date(clock()))`; `cheer()` receives `dayDone` from it (Pass passes it too — it's always null there).
- Welcome: after the first `showNext()` + `measureRobo()`, greet if `progress.hiddenAt === null || clock() - progress.hiddenAt >= WELCOME_AFTER_MS`. On `visibilitychange` → hidden: save `hiddenAt = clock()`. → visible: greet if `clock() - hiddenAt >= WELCOME_AFTER_MS`. Greeting: skip if standing and Robo isn't at its spot (`roboPlace !== 'spot'`) or `roboAway`; else `endMoment()`, `robo.greet(welcomeWords(progress.total), momentPlace())`, `sound.robo()`, timer of the returned ms then `endMoment()` and clear Robo's words. Her next key press clears the welcome words (like the red light's). Remove the listener in `destroy()`.

- [ ] **Step 1: Write the failing tests**
  - No `[data-role="streak"]` element; a clean answer still saves `streak` 1 and `bestStreak` 1.
  - Fresh progress at mount (standing) → Robo says `Hi! Let's do some math!`; with `total: 41` → `Welcome back, let's do some math!`; `sound.robo` called once; after 3000 ms the bubble is empty; a key press before then empties it.
  - `hiddenAt = clock − 5 min` at mount → no welcome (Review Focus 3); `hiddenAt = clock − 31 min` → welcome.
  - hide, advance clock 31 min, show → welcome; hide, 10 min, show → none.
  - Hint (Robo up), hide 31 min, show → no welcome words, Robo still `data-place="up"` (Review Focus 4).
  - Progress with `day: { date: <today>, right: 9, days: 2, lastDone: <yesterday> }`: one right answer → `[data-moment="day"][data-tier="arms"]` with words `You did your math 3 days in a row! Keep it up!`; saved `day.days` 3.
  - Update existing tests that assert `🔥` text or an empty Robo bubble at start (press a key or advance 3000 ms first).

- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/ui/app.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** as described; `main.ts` passes `clock: () => Date.now()`.

- [ ] **Step 4: Run everything** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npm run build` — Expected: all PASS, build succeeds.

- [ ] **Step 5: Commit** — `git commit -am "feat: hide the streak badge; Robo welcomes her and celebrates each day"`

---

### Task 6: Layout check covers the new moments

**Files:**
- Modify: `.context/playwright/shots.mjs`, `.context/running.md`

- [ ] **Step 1: Update fixtures.** `STORAGE_KEY = 'math-practice-progress-v7'`; `progressFor` builds `version: 7`, `day: { date: null, right: 0, days: 0, lastDone: null }`, `hiddenAt: Date.now()` (so existing flows don't start with a welcome). Compute `today`/`yesterday` as local `YYYY-MM-DD` in node.
- [ ] **Step 2: Add Robo flows per view:** `welcome` (fixture `hiddenAt: null`, screenshot at ~800 ms; check Robo's bubble doesn't cover the problem, answer boxes or controls); `day-1`, `day-3`, `day-7`, `day-12` (fixture `day: { date: today, right: 9, days: N−1, lastDone: yesterday }`, one right answer, `momentCheck` mid-moment). Add `.robo-fireworks` to `momentCheck`'s parts.
- [ ] **Step 3: Run** (dev server per running.md, then) `ROBO_ONLY=1 node shots.mjs` and `ROBO_ONLY=1 RM=1 node shots.mjs` — Expected: exit 0 except the accepted se-tab `cell 31<38`. Then the full `node shots.mjs` once. Look at the `robo-ipad102-p-day-12` and `-welcome` screenshots.
- [ ] **Step 4: Note** the new flows and `?moment=welcome|day-1|day-3|day-7|day-12` in `.context/running.md`.
- [ ] **Step 5: Commit** — `git add .context && git commit -m "test: layout checks cover the welcome and day celebrations"`
