# Learning path — design (short)

Date: 2026-10-25. Size: small change. First of two projects; the second is multiplication (its own full design,
which will add a third operation to this path).

## Intent
Make the app a learning path instead of a fixed 50/50 mix: operations unlock as she masters the ones before,
everything starts at the easiest level, and operations she has topped out on fade into occasional review, so practice
time goes to what she's still learning.

## Goals
- **Unlock rules.** Addition is always on. Subtraction unlocks when addition reaches level 3.
  (Multiplication, added by the next project, unlocks when addition reaches level 6 and subtraction level 5.)
  "Reaches" = the operation's current level is ≥ the threshold.
- **Permanent.** Once unlocked, an operation stays unlocked even if levels later drop below a threshold.
- **Start at level 1.** Every operation starts at level 1 with the existing 10-problem quick-settling phase
  (calibration) — addition for a new player, and any operation at the moment it unlocks.
- **Fading.** Unlocked operations share problems equally, except an operation at level 9 (its top) gets one fifth of
  a normal share, so it never disappears.
- **Unlock moment.** When an operation unlocks, play the level-up sound and show "New: subtraction!" in a friendly
  (not error-red) style.

## Non-goals
- Multiplication itself (next project).
- Showing locked operations, a progress map, or how close the next unlock is.
- Letting the child choose an operation.

## Anti-goals
- Losing existing progress on upgrade. A v2 player keeps their streak, best streak, total and both levels, and keeps
  both addition and subtraction — upgrading must never re-lock subtraction or reset levels to 1.
- An older build wiping v3 progress on rollback (same lesson as v2): v3 gets its own storage key.

## Approaches considered
Covered in the conversation as part of the two-project split: build the learning path first so multiplication arrives
already gated behind it. Within this project the shape is settled by the decisions below; the one real fork —
storing unlocks vs. deriving them from current levels — is decided by "permanent": unlocks must be stored, because a
level can drop back below its threshold.

## Decided
- **Progress v3** under a new localStorage key `math-practice-progress-v3`. Adds which operations are unlocked.
  Each unlocked operation has its own ladder state (level, window, calibration), as today.
- **Upgrade chain on load:** valid v3 → use; else valid v2 (`math-practice-progress-v2`) → upgrade; else valid v1
  (`math-practice-progress`) → upgrade through v2; else defaults. Older keys are read, never written.
- **v2 → v3 upgrade:** addition and subtraction both unlocked; all existing fields kept.
- **New player (defaults):** only addition unlocked, at level 1 with calibration.
- **On unlock:** the new operation's ladder starts at level 1 with a fresh 10-problem calibration.
- **When unlocks are checked:** after each finished problem, once its result has been applied (so a level-up that
  crosses a threshold unlocks on that same answer).
- **Choosing the next problem's operation:** weighted random over unlocked operations — weight 1, or 1/5 for an
  operation at level 9. With only addition unlocked, every problem is addition.
- **Unlock message (my call on timing):** shown with the level-up sound on the answer that earns it, and stays on
  screen for the next problem until her first key press. Uses the existing message line with a new friendly style.
- **Thresholds and the 1/5 review share are my proposals**, accepted without objection in the conversation; they live
  in one place in code so they're easy to tune.

## Left to the builder
- Data shape for unlocks (a list of operations vs. per-operation flags), and where the unlock rules live
  (a small `core/path.ts` is suggested).
- How the unlock is reported from `recordResult` to the UI (e.g. alongside `levelChange`).
- Exact friendly message styling.
- Tests: v2→v3 and v1→v3 upgrades with realistic records (kept levels, both unlocked); defaults have only addition at
  level 1; unlock fires exactly once at addition level 3 and starts subtraction at level 1 with calibration; stays
  unlocked after addition drops; operation mix (only addition → 100% addition; one op at level 9 → about 1/6 of
  problems with two ops); the message and sound on unlock and its clearing on the next key press. Re-run the
  Playwright layout check (fixture must move to the v3 key).
