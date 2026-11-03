# Division — design

Date: 2026-11-01. Size: project. Builds on multiplication
(`docs/superpowers/specs/2026-10-25-multiplication-design.md`, shipped on main with the 2026-10-25 reorder) and the
learning path (`docs/superpowers/specs/2026-10-25-learning-path-design.md`).

## Intent and why

The child (Grade 2, British Columbia) is working through multiplication. Division is the natural next operation and
should feel like **undoing what she just learned**: each division level reverses the multiplication level she has
just passed. BC teaches division in Grade 3 as fair sharing and grouping, connected to multiplication, and in
Grade 4 extends it to 2–3-digit ÷ 1-digit by breaking numbers apart, not by long division. Remainders are Grade 5
and out of scope for now.

Success: once she's past × 2, ÷ 2 appears; division keeps one level behind multiplication all the way up to
3-digit ÷ 1-digit; when stuck, the hints and block picture show her equal sharing (deal out, trade a leftover ten
for ones, deal again) and connect it to the multiplication fact she knows, and she still produces the answer herself.

## Goals

- A fourth operation, `÷`, with a 9-level ladder that mirrors multiplication's level for level (table below),
  adaptive like the others.
- Unlocks when multiplication reaches level 2; announced as "New: division!".
- **One level behind (user's idea):** division can only be at, climb to, or be served a level that multiplication is
  already past (`division level ≤ multiplication level − 1`), except that once multiplication is at 9, division may
  reach 9.
- Every problem divides evenly. No remainders, never ÷ 0.
- Horizontal layout (`72 ÷ 3 = ▢▢`), final answer only, existing number pad, same as multiplication.
- Hints use **sharing**: the divisor is the number of groups, the answer is how many in each group. Each tap goes one
  step further; **the last hint always stops one step short**; only Pass shows the answer.
- The base-ten block picture appears on the first Hint tap and is extended with a "still to share" pile that empties
  into the groups as hints progress.
- Streak, total, scoring, sounds and the learning path work for division exactly as for the others.

## Non-goals

- Remainders (a later add-on: a second "R ▢" answer box and new hint copy; nothing here should make that harder).
- Long division / the standard algorithm; divisors above 9 except the ÷ 10 facts; 4-digit dividends.
- Grouping ("how many 3s fit in 72?") as a picture model. Hint text may say "what times 3 makes …", but the picture
  is always sharing.
- Choosing an operation by hand; timed drills.
- Changing how addition, subtraction or multiplication look or behave.

## Anti-goals (failure even if it "works")

- A hint (not Pass) whose text, tally **or picture** reveals the answer. In sharing, a fully dealt group *is* the
  answer, so no hint step may show the pile fully dealt (except 0 ÷ n, where there's nothing to deal).
- Division getting ahead of multiplication: she must never be served a ÷ problem from a level multiplication hasn't
  passed, including the "one level up" problems the ladder mixes in.
- A slip in multiplication taking division levels away (user agreed: division keeps what it earned and just stops
  climbing until multiplication catches up).
- The picture or pile crowding the problem, answer boxes or controls, or not fitting on a phone or iPad landscape.
- Losing or resetting saved progress on upgrade, or an older build wiping newer progress.
- Any behaviour change to the other three operations beyond the new mix weighting (their problem, hint and level
  tests pass unchanged).

## Constraints

- Vanilla TypeScript + Vite PWA, no new runtime dependencies; the picture stays DOM + CSS.
- Answers fit `MAX_ANSWER = 4` (largest is 999 ÷ 2-ish → 3 digits).
- `MAX_LEVEL = 9`.
- Deploys happen only when the user pushes to the `dev` / `prod` remotes.

## Approaches considered

1. **Division module + the existing picture, extended (chosen by user).** A fourth `OpModule` beside
   multiplication. The block picture already draws equal groups made of flats/rods/squares and reveals parts across
   hints; it gains a "still to share" pile above the groups. Reuses multiplication's hard-won phone-fit logic; the
   cost is a second mode in the picture code.
2. **A separate division picture.** Own state and renderer; leaves multiplication's picture untouched but copies or
   redoes block drawing and fitting, which took several fix rounds last time.
3. **No dealing steps, only the finished picture.** Cheapest, but drops the deal / trade / deal-again idea, which is
   the main thing sharing teaches.

## Decided

### Ladder

`Problem` is `{ op: '÷', a: dividend, b: divisor, level }`. For fact levels, a "fact pair" `{t, k}` is the same pair
multiplication uses at that level; the dividend is `t × k` and **either factor may be the divisor** (both directions
appear, as multiplication shows both written orders).

| Level | Problems | Example | Mirrors × level |
|---|---|---|---|
| 1 | pairs {2, 2–9} | 12 ÷ 2 = 6, 12 ÷ 6 = 2 | 1 (× 2) |
| 2 | pairs {10, 2–9} | 40 ÷ 10 = 4, 40 ÷ 4 = 10 | 2 (× 10) |
| 3 | pairs {5, 2–9} | 35 ÷ 5 = 7, 35 ÷ 7 = 5 | 3 (× 5) |
| 4 | pairs {3, 2–9} | 21 ÷ 3, 21 ÷ 7 | 4 (× 3) |
| 5 | pairs {4, 2–9} | 24 ÷ 4, 24 ÷ 6 | 5 (× 4) |
| 6 | pairs {0, 1, 2, 3, 4, 5, 10} × {0–9} (mixed review); divisor never 0 | 9 ÷ 1, 0 ÷ 4, 90 ÷ 9 | 6 |
| 7 | 2-digit dividend (20–99) ÷ 2–5, quotient 10–49 and not a multiple of 10 | 72 ÷ 3 = 24 | 7 |
| 8 | 3-digit dividend (100–999) ÷ 2–5, quotient not a multiple of 10 | 345 ÷ 5 = 69 | 8 |
| 9 | pairs {6–9, 6–9} | 42 ÷ 6 = 7 | 9 (6–9 facts) |

Notes (my calls): quotients that are multiples of 10 are excluded on 7–8 for the same reason multiplication excludes
them (no breaking apart to do). Level 8 deliberately includes dividends whose hundreds digit is smaller than the
divisor (345 ÷ 5), which force trading every hundred for tens; that's the main new idea of the level. Level 6 pair
(0, 0) is skipped (would need ÷ 0).

### Answer length (fixed per level, never hints at the answer)

Levels 1, 3, 4, 5, 9: 1 box. Level 2: 2 (40 ÷ 4 = 10). Level 6: 2 (90 ÷ 9 = 10). Level 7: 2 (up to 49). Level 8: 3
(21–499).

### Unlocking and "one level behind"

- Unlock rule: `division: { multiplication: 2 }` in `core/path.ts`. Starts at level 1 with calibration, like the
  others. A player already past multiplication 2 when this ships unlocks division on her next at-level answer.
- Cap: `cap = multiplication.level === 9 ? 9 : multiplication.level − 1`.
  - Climbing: a level-up that would put division above the cap doesn't happen (it behaves like "stay").
  - Serving: the ladder's "one level up" pick never goes above the cap; the "one level down" pick is unaffected.
  - Calibration also respects the cap (calibration can climb fast).
  - Slips: if multiplication drops and division is now above the cap, division keeps its level, keeps being served
    at it, and can still drop by its own results. It just can't climb until multiplication passes it again.
- Shape (my call): a general per-operation cap rule beside `UNLOCK_RULES` (e.g. `CAP_RULES = { division:
  { by: 'multiplication', behind: 1 } }`), so `adaptive.ts` stays operation-agnostic and is handed a max level.

### Hints (examples of the intended copy; builder finalises wording)

Rules carried over from multiplication: each tap adds one step; the last hint stops one step short; the picture grows
with the hints; "stops short" is tested on the step model, not by searching text for the answer's digits; any hint
makes the answer not clean. BC words: "share", "equal groups", "groups of", "count by", "break apart", "trade".

The first hint always names the sharing and the multiplication link: **"Share 72 into 3 equal groups. 3 groups of
what make 72?"** The picture then shows the divisor's empty dashed circles and the dividend's blocks in the pile.

- **Facts (levels 1–6, 9): deal in rounds.** Each round gives every group the same number of blocks; the tally counts
  what has been dealt ("3 groups of 2 = 6 shared, 15 left").
  - Default (levels 1–6): one block per group per round, counting by the divisor. Hint 2 deals every round but the
    last: "6, 12, 18… keep sharing. How many in each group?"
  - Where the multiplication strategy for that table helps (my call, builder may simplify): levels 4–5 may deal 2
    per group first ("double"), then the rest, echoing "double, plus one more" / "double, then double again".
  - Level 9: deal 5 per group first: "6 groups of 5 = 30. 12 left to share." Last hint: "Share the 12 into 6 groups.
    How many in each group altogether?"
  - Problems dealt in a single round (40 ÷ 4: one ten to each group) have only hint 1, which is then the stop-short
    step.
  - 0 ÷ n: one hint, the stop-short question: "Share 0 into 4 groups. How many in each?" ÷ 1: one group, "Put all
    9 in 1 group. How many are in it?" (both are single-step, as × 0 / × 1 are).
- **Levels 7–8: share each place, trading leftovers.** 72 ÷ 3:
  1. "Share 72 into 3 equal groups. 3 groups of what make 72?" (3 empty circles; pile: 7 rods, 2 squares)
  2. "Share the tens: 2 tens in each group, 1 ten left over." (each group 2 rods; pile 1 rod, 2 squares)
  3. "Trade the leftover ten for 10 ones. Now there are 12 ones." (pile 12 squares)
  4. "Share 12 ones into 3 groups. How many in each group altogether?" (stop short: the ones stay in the pile)

  Level 8 starts at the hundreds; if there are fewer hundreds than groups, that step is "Can't share 3 hundreds into
  5 groups. Trade them for 30 tens: 34 tens." When a place shares with nothing left over, the trade step is skipped.

### Pass

As multiplication: plays the remaining steps, then a final step that deals the last blocks, states the answer and
puts it in the boxes as ghost digits, at 1.5 s per step, ending in "Next →".

### Picture

- Same placement, blocks, dashed group circles and palette as multiplication. All groups are drawn in full on every
  level (sharing needs to see every group fill); there are no outline-only groups for division.
- **New: the pile** ("to share"), drawn above the groups with the same blocks, emptied as hints deal. A trade replaces
  a rod with 10 squares (or a flat with 10 rods) in the pile.
- Pile drawing on fact levels (my call): unit squares, so rounds can be counted, except when the answer is 10
  (40 ÷ 4, 90 ÷ 9), where the pile is rods and each group gets one rod. 40 ÷ 10 is 40 squares dealt into 10 groups,
  counting by 10s, which echoes × 10's "count by 10s".
- New sizes to fit: up to 10 groups (÷ 10 facts, 90 ÷ 9 reversed as 90 ÷ 10) and, on level 8, a pile of up to 9 flats
  + 9 rods + 9 squares, or 20+ rods after a trade, alongside up to 5 groups. The pile may draw smaller than the groups
  or wrap. Mult's `fitPicture` scaling is reused.
- Must fit without overlap on every viewport in `.context/playwright/shots.mjs`, extended to division levels 1, 2, 6,
  7, 8 and 9 with all hints shown (the existing iPhone SE Safari-tab cell-size exception stays accepted).

### Share of the mix: practise what's behind (user's idea, added 2026-11-02)

Replaces today's rule (equal shares, topped-out ones at `REVIEW_SHARE`) for **all** operations, so it ships with
division but also changes the mix she sees now, with three operations.

- **Behind gets more.** Weight = `1 + 0.25 × gap`, capped at 2, where `gap` = levels this operation trails her
  strongest operation that is still learning (level < 9). Never zero for anything unlocked.
- **Topped out (level 9):** keeps `REVIEW_SHARE` (0.2) and doesn't count as "strongest".
- **New operations (levels 1–2):** weight 1, no behind boost (the boost starts at level 3).
- **Division compares against its cap:** `gap = min(strongest, cap) − division level`, so while it waits at the cap
  it gets weight 1.
- **Welcome (user chose this over a plain normal share):** right after any unlock, the next 3 problems are the new
  operation, then the weights above apply. The countdown is saved in progress so closing the app mid-welcome
  doesn't lose it (my call). Applies to every unlock, including subtraction for a new player.

Example (user approved the numbers): addition 8 → 1, subtraction 6 → 1.5, multiplication 4 → 2, division 2 → 1;
shares ≈ 18% / 27% / 36% / 18%.

### Target times (my call, same as multiplication)

Levels 1–6 and 9: 8 s; level 7: 20 s; level 8: 30 s.

### Saved progress

- v6 under `math-practice-progress-v6`: `OpKey` gains `'division'` with its own ladder state. Load chain v6 → v5 → …
  → v1 → defaults; older keys never written, so an older build reading v5 still works.
- v5 → v6 upgrade: adds `division: initialOpState()` and an empty welcome countdown; `unlocked` unchanged.

### Code structure

- `Op` gains `'÷'`; `OPS` registry gains a division module; `opKey`/`opOf` maps gain `'division'`.
- Division steps describe picture state (groups, each group's parts, pile parts, tally) and bubble text, like
  multiplication's. `PictureState` gains an optional pile; multiplication never sets it.

## Left to the builder

- Exact cap plumbing between `path.ts`, `adaptive.ts` and `session.ts`.
- `PictureState` field names for the pile and how dealing rounds are represented.
- Final hint and tally wording within the rules above; whether levels 4–5 deal 2 per round first or keep the default.
- Pile sizing/wrapping within the fit rules.
- Tests: generator/level matching for all 9 levels (1,000 seeded problems each, every problem divides evenly, divisor
  ≥ 1, answers within the level's box count); both directions appear on fact levels; hint steps per strategy,
  including that no hint step's text, tally or picture (pile never empty) states the answer and Pass's last step
  does; the cap (no level-up past it, no served problem above it, a multiplication slip leaves division's level
  alone, cap lifts to 9 at multiplication 9); unlock at multiplication 2 with "New: division!"; v5 → v6 upgrade with
  a realistic record; UI tests for layout, entry and picture appearing only after the first hint; the Playwright
  layout check for division; mix weights for the example above, the level-9 review share, weight 1 for a new
  operation at levels 1–2, division at its cap, and the 3-problem welcome (including surviving a reload).
