# Days Practised Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Count the days she has practised in total (each date she reaches 10 right answers, once, never lowered),
saved as progress v8, with nothing on screen yet.

**Architecture:** `DayStreak` (src/core/days.ts) gains `practised`, bumped in `countRightAnswer`'s day-completing
branch. Storage moves to key `math-practice-progress-v8`; v7 is read once and upgraded (`practised = day.days`), and
older saves reach v8 through the existing chain.

**Tech Stack:** TypeScript, vitest (+ jsdom for app tests), localStorage.

**Spec:** `docs/superpowers/specs/2026-11-11-days-practised-design.md`

## Global Constraints

- Run tools with `PATH="$HOME/.asdf/shims:$PATH"`. `sed -i` fails on /workspace: edit with the Edit tool or node.
- New key `math-practice-progress-v8`; older keys are read once to migrate and never written.
- `practised`: whole number ≥ 0; counts once per date, at the `DAILY_GOAL` (10th) right answer, only when `gap > 0`.
- Nothing visible changes: no number, words or celebration.

## Review Focus

1. **Streak restarts (gap ≥ 3 days) still count the day** — practised goes up while days drops to 1. (Task 1 test.)
2. **A reload mid-day after the 10th answer** — the 11th answer doesn't count again. (Task 1 test: 11th answer.)
3. **A v7 save with a long streak** — practised starts at day.days, not 0. (Task 2 test.)
4. **A v8 save with practised missing/negative/fractional** — rejected, falls back to the v7 save. (Task 2 test.)
5. **Rollback** — after saving v8, the v7 string is byte-identical. (Task 2 test.)

---

### Task 1: Count days practised

**Files:**
- Modify: `src/core/days.ts`, `src/core/days.test.ts`, `src/ui/app.test.ts`

**Interfaces:**
- Produces: `DayStreak.practised: number` (days practised in total; doc comment says so); `initialDayStreak()` →
  `{ date: null, right: 0, days: 0, lastDone: null, practised: 0 }`; `countRightAnswer` unchanged signature.

- [ ] **Step 1: Write the failing tests** in `src/core/days.test.ts`:
  - `the goal answer counts a day practised, also when the streak starts over`: from `{ …, days: 4, lastDone: '2026-11-01', practised: 7, date: '2026-11-11', right: 9 }`, `countRightAnswer(s, '2026-11-11').streak` has `days: 1, practised: 8`; from the same with `lastDone: '2026-11-10'` → `days: 5, practised: 8`; with `lastDone: '2026-11-09'` (forgiven) → `days: 5, practised: 8`.
  - `the 9th and 11th answers and a second goal on one date do not count`: right 8 → 9 keeps `practised` 7; right 10 → 11 keeps it; a streak with `lastDone: today` and `right: 9` (clock/edge: already done) keeps it.
  - `a backwards clock does not count`: `lastDone: '2026-11-12'`, today `'2026-11-11'`, right 9 → `practised` 7.
  - `initialDayStreak` includes `practised: 0` (update the existing initial-state expectation).
  - In `src/ui/app.test.ts`, next to the existing day-completion test: completing a day saves `day.practised` one higher than before.
- [ ] **Step 2: Run** `npx vitest run src/core/days.test.ts src/ui/app.test.ts` — Expected: FAIL (`practised` undefined).
- [ ] **Step 3: Implement** `practised` on `DayStreak`, `initialDayStreak`, and `practised: s.practised + 1` in the completing branch of `countRightAnswer` (next to `days`, `lastDone`).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — Expected: PASS (fixtures that build a `DayStreak` by hand gain `practised`).
- [ ] **Step 5: Commit** `git commit -am "feat: count days practised in total"`

---

### Task 2: Save v8

**Files:**
- Modify: `src/storage.ts`, `src/storage.test.ts`, `src/core/progress.ts` (version 8), `.context/playwright/shots.mjs` (key + fixtures), `.context/running.md` (v7 → v8 mentions)

**Interfaces:**
- Consumes: Task 1 `DayStreak.practised`.
- Produces: `STORAGE_KEY = 'math-practice-progress-v8'`, `V7_STORAGE_KEY = 'math-practice-progress-v7'`;
  `Progress.version: 8`; `type ProgressV7` (= v8 minus `practised` in `day`, `version: 7`); `isValidProgressV7`
  (today's v7 check, renamed); `upgradeV7(p: ProgressV7): Progress` setting `day.practised = p.day.days`;
  `upgradeV6` now returns `ProgressV7`, and every older chain ends in `upgradeV7(...)`.

- [ ] **Step 1: Write the failing tests** in `src/storage.test.ts`:
  - `defaults are v8 …` (update the existing defaults test: `version: 8`, `day.practised: 0`).
  - `each version is stored under its own key …`: add `V7_STORAGE_KEY` to the expected key list.
  - `migrates a realistic v7 record, starting days practised at its days in a row`: v7 with `day: { date: '2026-11-11', right: 3, days: 6, lastDone: '2026-11-10' }` → loads as v8, everything else equal, `day.practised: 6`.
  - `saving after a v7 upgrade writes only the v8 key and leaves the v7 string byte-identical`.
  - `an invalid v8 record falls back to a valid v7 record`: v8 with `practised` missing, `-1`, `1.5` each → loads the v7 record upgraded.
  - `migrates a v6 record to v8 with no days yet` (`day.practised: 0`).
  - Existing v7 round-trip / mid-day reload tests move to v8 records (`practised` included).
- [ ] **Step 2: Run** `npx vitest run src/storage.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the v8 key, `Progress.version: 8` + `defaultProgress`, `isValidDayStreak` requiring `practised` (whole number ≥ 0) for v8 and a v7 day check without it, `upgradeV7`, the load chain (v8 → v7 → v6 → …), following the file's `upgradeVn` pattern and comments.
- [ ] **Step 4: Update the layout check**: `shots.mjs` `STORAGE_KEY` → v8, `progressFor` → `version: 8`, `day` objects gain `practised` (the day fixtures: `practised: n - 1`); running.md mentions of "progress v7" → v8.
- [ ] **Step 5: Run** `npx vitest run && npx tsc --noEmit && npm run build` — Expected: PASS, build OK. Then (dev server per running.md) `ROBO_ONLY=1 node shots.mjs` — Expected: only se-tab `cell 31<38` (the welcome and day flows still play, proving fixtures load as v8).
- [ ] **Step 6: Commit** `git add -A src .context/playwright/shots.mjs .context/running.md && git commit -m "feat: save progress v8 with days practised"`
