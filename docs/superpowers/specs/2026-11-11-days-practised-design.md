# Days practised — design (small change)

Date: 2026-11-11. Size: small change. Builds on the day streak (`docs/superpowers/specs/2026-11-11-day-streak-design.md`).

## Intent and why

We're designing **Robo's world** (her daughter's idea): a world behind the math that grows by one thing she picks
every 5 days of practice, in total, never tied to the streak, so it only ever adds and never feels punishing. That
needs her total days of practice, which the app doesn't keep: it only keeps days in a row. Ship the counter now, on
its own, so her days are already adding up by the time the world is built. (User's call: "the best thing we could do
[while we ideate], which would likely be small, is to add the days practice counter.")

## Goals

- Count **days practised in total**: each calendar date on which she reaches the day goal (10 right answers,
  `DAILY_GOAL`) counts once. The count only ever goes up: missed days, a broken streak or a reset never lower it.
- It counts at the same moment the streak counts a day (her 10th right answer that date), whether or not the streak
  continues or starts over.
- Saved progress becomes **v8**, with the counter.

## Non-goals

- Nothing on screen: no number, no words, no celebration. The streak and its celebrations are unchanged.
- No Robo's world, picks or decorations yet (designed separately).

## Constraints

- Follow the app's save pattern (user's pick): new key `math-practice-progress-v8`; the v7 save (and older, through
  the existing chain) is read once to migrate and never written, so a rollback still finds the save it understands.
- The streak only started deploying 2026-11-11, so a v7 save has at most a day or two of history.

## Approaches

1. **New save version v8 (chosen by the user).** The pattern every earlier save change used; rollback-safe. Costs a
   migration and its tests.
2. Add the field to v7, defaulting to 0 when missing. Less code, but a rollback to today's build would save over it
   and quietly reset her total. Not chosen.

## Decided

- **Where it lives:** in the day record (`DayStreak`), next to the streak it's counted with, as `practised` (days
  practised in total). (My call on the name and place; the builder may rename.)
- **When it counts:** in `countRightAnswer`, when the day's goal answer completes a day: `practised + 1`, in the same
  branch that grows or restarts the streak. Not on the 11th or later answers, not twice on one date, and not when
  the clock has gone backwards (`gap <= 0`), exactly as the streak treats those.
- **Migration v7 → v8:** `practised` starts at her current `day.days` (days in a row is a floor on days practised;
  with the streak this new, it's all her history). v6 and older reach v8 through the existing chain (v6 → v7 starts
  `days` at 0, so `practised` 0).
- **Validation:** `practised` is a whole number ≥ 0; a v8 save without it, or with a bad value, is invalid like any
  other bad field.
- **Layout check fixtures** (`.context/playwright/shots.mjs`): key and fixtures move to v8 (add `practised`).

## Testing

- `countRightAnswer`: the 10th answer adds 1 to `practised` (streak continuing, forgiven gap, and starting over at 1);
  the 9th and 11th don't; a second day completed on the same date doesn't; a backwards clock doesn't.
- Storage: a v7 save migrates to v8 with `practised = day.days` and the v7 key is left untouched; v6 → v8; a v8 save
  round-trips; a missing/negative/fractional `practised` is rejected; the app saves under the v8 key.
- App: completing a day saves `practised` + 1.

## Left to the builder

- Exact names, test names, and where the migration helper sits (follow `storage.ts`'s `upgradeVn` pattern).
- Updating notes that mention v7 (`.context/running.md`).
