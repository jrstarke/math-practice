# Math Practice Web App — Design Spec

**Date:** 2026-10-24
**Status:** Draft — awaiting review

## 1. Purpose

A touch-first web app for a child (ages ~7–9) at home to practise addition and
subtraction, especially carrying and borrowing. A parent hands over an iPad or
iPhone; the child practises for as long as they like. Difficulty adapts
automatically: harder when they're succeeding, easier when they struggle.

### Scope (v1)

In:
- Addition and subtraction, positive numbers only (subtraction answers ≥ 0).
- Vertical (column) problem layout with optional scratch boxes for carry/borrow marks.
- Custom on-screen number pad (no system keyboard).
- Unlimited tries, tap-to-reveal column-by-column hints, and a Pass button.
- Adaptive difficulty driven by first-try correctness, hint/retry use, and invisible timing.
- Endless practice with a streak counter.
- Synthesized sound effects with a mute toggle.
- Single user, progress saved on-device. Installable PWA, works offline.

Out (v1):
- Multiple profiles, parent/progress view, accounts, server.
- Multiplication/division, negative numbers.
- Fixed-length rounds, badges, visible timers.
- Haptics (unsupported on iOS Safari).

## 2. Tech Stack

- TypeScript + Vite, no UI framework.
- PWA via `vite-plugin-pwa` (manifest, service worker, offline, Add to Home Screen).
- Vitest for unit tests.
- Static hosting (any static host; local preview served on `0.0.0.0:$PUBLISH_PORT` for device testing).

## 3. Difficulty Ladder

Two independent ladders, one per operation. Each problem picks addition or
subtraction at random (50/50), then uses that operation's ladder.

| Lvl | Addition | Example | Subtraction | Example |
|---|---|---|---|---|
| 1 | 1-digit + 1-digit, sum ≤ 10 | 3+5 | 1-digit − 1-digit (minuend ≤ 10) | 9−4 |
| 2 | 1-digit + 1-digit, sum 11–18 | 7+8 | teen (11–18) − 1-digit, result 1-digit | 15−7 |
| 3 | 2-digit + 1-digit, no carry | 23+4 | 2-digit − 1-digit, no borrow | 28−5 |
| 4 | 2-digit + 2-digit, no carry | 34+25 | 2-digit − 2-digit, no borrow | 57−23 |
| 5 | 2-digit + 1-digit, carry, sum < 100 | 27+8 | 2-digit − 1-digit, borrow | 42−7 |
| 6 | 2-digit + 2-digit, ones carry, sum < 100 | 47+38 | 2-digit − 2-digit, borrow | 62−29 |
| 7 | 2-digit + 2-digit, sum ≥ 100 | 68+57 | 3-digit − 2/3-digit, exactly one borrow, no zero in minuend tens | 345−128 |
| 8 | 3-digit + 2/3-digit, exactly one carry, sum < 1000 | 256+137 | 3-digit − 3-digit, two borrows, no zero in minuend tens | 432−178 |
| 9 | 3-digit + 3-digit, two or more carries | 478+356 | 3-digit − 3-digit, borrow across a zero (minuend tens digit is 0, ones borrow required) | 302−147 |

Notes:
- "No carry"/"no borrow" levels must have zero carries/borrows in every column.
- Level 7 addition: at least the tens column carries into hundreds (ones may or may not carry).
- All subtraction results are ≥ 0; levels 3–9 subtraction results are > 0.
- Leading-digit rules: a "2-digit" operand is 10–99, "3-digit" is 100–999.

## 4. Scoring

Each completed problem gets a score in [0, 1]:

| Outcome | Score |
|---|---|
| Correct on first submit, within target time | 1.0 |
| Correct on first submit, slower than target time | 0.6 |
| Correct after one or more wrong submits, no hints | 0.3 |
| Correct, any hint step used (regardless of retries) | 0.2 |
| Passed | 0.0 |

- Timing is invisible to the child. It is measured from problem display to the
  first submit.
- Target time per level is a constant in `levels.ts`: base 4 s + 4 s per answer
  column (e.g. a 2-column answer → 12 s). Tunable.

## 5. Adaptation

Per-operation state: `{ level, window: number[], calibrationLeft }`.

- Only scores from problems **at the current level** go into the window and
  affect movement. Review/stretch problems are scored but don't move the level.
- **Normal rules:**
  - Level up when the window holds ≥ 5 scores and the mean of the last 5 is ≥ 0.8.
  - Level down when the last 2 scores are both ≤ 0.3.
- **Calibration rules** (while `calibrationLeft > 0`; starts at 10, decremented
  per current-level problem for that operation):
  - Level up when the last 2 scores are both 1.0.
  - Level down on any single score ≤ 0.3.
- The window resets to empty on any level change.
- Levels clamp to 1–9.
- Initial state for both operations: level 4, empty window, calibrationLeft 10.

**Problem mix** (`pickLevel`): 70% current level, 20% one below, 10% one above.
At level 1, the "below" share goes to current; at level 9, the "above" share
goes to current. During calibration, always use the current level.

**Repeat avoidance:** don't generate a problem identical (same operands and
operation) to any of the last 10 shown. Retry generation if so.

## 6. Streak

- Increments on a first-submit correct answer with no hints.
- Resets to 0 on a wrong submit, any hint use, or Pass.
- `bestStreak` is tracked and saved (not prominently displayed in v1; may appear
  briefly when beaten).

## 7. Screen & Interaction

One main screen. Portrait (iPhone/iPad): problem above, pad below. iPad
landscape: problem left, pad right.

```
┌───────────────────────────────┐
│ 🔥 7                     🔊   │
│          [ ] [ ]              │  scratch boxes
│           4   7               │
│      +    3   8               │
│      ──────────               │
│           8   _               │  answer (right-aligned)
│   [ 💡 Hint ]     [ Pass ]    │
│ ┌─────┬─────┬─────┐           │
│ │  1  │  2  │  3  │           │
│ │  4  │  5  │  6  │           │
│ │  7  │  8  │  9  │           │
│ │  ⌫  │  0  │  ✓  │           │
│ └─────┴─────┴─────┘           │
└───────────────────────────────┘
```

**Answer entry**
- Focus starts on the answer row.
- Digits are typed left-to-right; the displayed answer is right-aligned under the
  columns (calculator-style fill).
- Max answer length is 4 digits for every problem (enough for the largest sum,
  999 + 999, and lets a wrong-length answer be entered). A leading 0 is ignored.
- ⌫ deletes the last digit. ✓ submits (ignored if the answer is empty).

**Scratch boxes**
- One small dashed box above each operand column except the ones column for
  addition; above every top-operand column for subtraction.
- Tap a box to focus it (highlighted); the number pad then types into it.
  Tap the answer row (or press ✓) to return focus to the answer; ✓ from a
  scratch box only returns focus, it does not submit.
- Each box holds up to 2 digits.
- Subtraction: when a box above a column has a value, the top-operand digit
  beneath it is shown struck through.
- Never checked; cleared on each new problem.

**Feedback**
- Correct: answer turns green, brief bounce/confetti, correct sound, streak
  updates, auto-advance after ~1 s.
- Wrong: gentle shake of the answer row, "Not quite — try again", incorrect
  sound. The wrong digits stay visible, faded; the first new keypress clears them.
- Pass: worked solution auto-plays (see §8), then a **Next** button appears.

**Touch & input**
- Number pad keys ≥ 64 px, respond on `pointerdown`.
- `touch-action: manipulation`, no text selection, no pull-to-refresh/overscroll
  bounce, no double-tap zoom.
- Physical keyboard: digits, Backspace, Enter.

## 8. Hints & Worked Solutions

`solve(problem) → Step[]` (pure) produces an ordered list of steps; hints reveal
one step per 💡 tap, Pass auto-plays all remaining steps (~1.5 s each; tap to
skip ahead; Next at end).

Per column, right to left: a **prompt** step then a **reveal** step. Each step has:
the column to highlight, bubble text, and any scratch-box values / ghost digits
to show.

Addition `47 + 38`:
1. Prompt (ones): "Start with the ones: what's 7 + 8?"
2. Reveal: "7 + 8 = 15. That's more than 9, so 5 goes in the answer and the 1
   carries to the tens." → tens scratch box = 1; ghost 5 under ones.
3. Prompt (tens): "Now the tens: 1 + 4 + 3 = ?"
4. Reveal: "That's 8!" → ghost 8 under tens.

A final carry out of the highest column produces a ghost digit in a new leading
column (e.g. 68+57 → ghost 1 in hundreds).

Subtraction `62 − 29`:
1. Prompt (ones): "Ones first: 2 − 9? 2 is smaller than 9, so we need to borrow."
2. Borrow: "Borrow a ten: 6 becomes 5, and 2 becomes 12." → scratch boxes
   tens = 5, ones = 12; digits struck through.
3. Prompt: "12 − 9 = ?"
4. Reveal: "12 − 9 = 3." → ghost 3.
5–6. Tens prompt/reveal: "5 − 2 = ?" / "5 − 2 = 3."

Borrow across zero `302 − 147`: the borrow step becomes "The tens has nothing to
lend, so borrow from the hundreds first: 3 becomes 2 and 0 becomes 10. Now the
tens can lend: 10 becomes 9 and 2 becomes 12." → scratch boxes hundreds = 2,
tens = 9, ones = 12.

Columns with no borrow/carry need only prompt + reveal. Leading zeros are never
shown as ghost digits (e.g. 345 − 328 → 17, not 017).

Rules:
- Ghost digits are faint guides only; the child must still type the answer.
- Hint steps overwrite the child's scratch-box values.
- After the last step, 💡 dims ("That's every hint!").
- Any hint use caps the problem's score at 0.2.

## 9. Sound

`ui/sound.ts`, synthesized with the Web Audio API (no audio files).

- Correct: short rising two-note chime.
- Level up: slightly bigger flourish (e.g. three-note arpeggio).
- Incorrect: soft low "boop"/wobble, never harsh.
- The `AudioContext` is created/resumed on the first user pointer interaction
  (iOS autoplay rules).
- Respects the iOS silent switch (Web Audio default behaviour).
- 🔊/🔇 toggle in the top bar; preference saved with progress.

## 10. Architecture

```
src/
  core/                 pure TS, no DOM
    levels.ts           ladder definitions, target times
    generator.ts        generate(op, level, rng) → Problem
    solver.ts           solve(problem) → Step[]
    scoring.ts          score(attempt) → number
    adaptive.ts         update(state, score) → state; pickLevel(state, rng)
    session.ts          choose op + level, generate, avoid repeats
    rng.ts              seedable PRNG
  storage.ts            load/save progress
  ui/
    app.ts              controller wiring core ↔ views
    problemView.ts      columns, scratch boxes, answer row, ghost digits
    numberPad.ts        pointerdown keys + keyboard
    hintBubble.ts       step bubble, Pass auto-play
    feedback.ts         correct / try-again animations
    sound.ts            Web Audio synth + mute
```

**Generator** builds problems digit-by-digit from column constraints (e.g. for
"2-digit + 2-digit, ones carry, sum < 100": ones digits sum > 9, tens digits +
carry ≤ 9), guaranteeing each problem exercises its level. A `Problem` is
`{ op: '+' | '-', a: number, b: number, level: number }`.

## 11. Data & Storage

Single `localStorage` key, JSON:

```ts
{
  version: 1,
  addition:    { level: number, window: number[], calibrationLeft: number },
  subtraction: { level: number, window: number[], calibrationLeft: number },
  streak: number,
  bestStreak: number,
  muted: boolean,
  installTipShown: boolean
}
```

- Saved after every completed problem and on mute toggle.
- Missing, unparseable, wrong-version, or invalid-shape data → reset to defaults.
- `localStorage` unavailable (throws) → run with in-memory state.
- Window stored capped at the last 5 entries.

**iOS storage caveat:** Safari may evict site data after ~7 days without use;
Home-Screen-installed PWAs are exempt. Show a one-time, dismissible "Add to Home
Screen" tip when running in Safari and not in standalone mode.

## 12. Testing

Unit tests (Vitest) for `core/` and `storage.ts`:
- Generator: for each operation × level, 1,000 seeded problems satisfy that
  level's constraints (digit counts, carry/borrow counts, zero-in-tens rule,
  non-negative results).
- Solver: steps' final ghost digits equal the correct answer for many seeded
  problems at every level; specific step-text cases for carry, borrow, borrow
  across zero, carry into a new column.
- Scoring: each row of the scoring table, including timing threshold.
- Adaptation: level up/down under normal and calibration rules, window reset,
  clamping at 1 and 9, calibration countdown, `pickLevel` distribution and edge
  redistribution.
- Session: no repeats within last 10.
- Storage: round-trip, corrupted JSON, wrong version, missing localStorage.

Manual: serve on `0.0.0.0:$PUBLISH_PORT` and check on iPad/iPhone — touch
responsiveness, layouts in portrait/landscape, scratch boxes, hints, sound and
mute, Add to Home Screen, offline.
