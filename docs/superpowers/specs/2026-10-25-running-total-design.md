# Running total — design (short)

Date: 2026-10-25. Size: small change.

## Intent
The streak resets on any mistake, hint, or Pass. Add a running total of clean answers that only ever goes up,
so the child always has a number climbing even after losing a streak.

## Goals
- Count a problem toward the total under exactly the streak's rule: right on the first submit, no hints, no Pass
  (`clean` in `recordResult`, `src/core/session.ts`). Every streak increment is also a total increment.
- The total never resets and has no cap.
- Show it as the main badge top-left (`⭐ <total>`), with the `🔥 <streak>` badge smaller, stacked underneath
  (mockup option B).

## Non-goals
- Backfilling past answers (no history is stored).
- Milestones, celebrations, or a separate "best total".
- Carrying progress between origins (ngrok → GitHub Pages); that's the separate transfer idea.

## Anti-goals
- Losing the child's existing streak, best streak, or levels on upgrade. An upgrade that resets progress is a failure
  even if the badge works.

## Approaches considered
1. **Versioned saved progress + explicit v1→v2 migration** — chosen. Clear, testable against a real v1 record, and
   sets the pattern for the coming multiplication ladder.
2. Keep version 1 and treat `total` as optional, filling it on load — smaller, but every future field becomes another
   "might be missing" case.

## Decided
- `Progress` becomes `version: 2` with a new `total: number` (integer ≥ 0).
- `defaultProgress()` starts `total` at 0.
- Loading: a valid v2 record is used as-is; a valid v1 record is migrated to v2 with everything kept and
  `total = bestStreak` (my call: credit for work already done; easy to change to 0); anything else falls back to
  defaults, as today. Saving always writes v2.
- `recordResult`: on a clean result, `total + 1`; otherwise unchanged.
- Topbar: total badge first and larger; streak badge below it, smaller. Short-screen (`max-height: 760px`) and
  phone-landscape rules shrink both so the problem keeps its room.

## Left to the builder
- Exact badge sizes, and the `data-role` for the new badge.
- Whether the migration lives in `storage.ts` or a small `core/migrate.ts`.
- Tests: migration of a realistic v1 record (streak 58, levels, window), invalid-record fallback, total increments
  only on clean results, and the badge text. Re-run the Playwright layout check (`.context/playwright/shots.mjs`)
  across all viewports, including the iPad 6 sizes.
