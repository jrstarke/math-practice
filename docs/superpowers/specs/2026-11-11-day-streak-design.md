# Day streak — design

Date: 2026-11-11. Size: project. Builds on the Robo companion (`docs/superpowers/specs/2026-11-08-robo-companion-design.md`).

## Intent and why

The 🔥 streak counts clean answers in a row and resets on any wrong answer, hint or Pass. That works against
"hints should feel good" and puts loss pressure on every problem. The user wants to swap it for a habit streak:
**doing some maths on several days in a row**, celebrated by Robo. It rewards coming back, not being perfect.

Robo greets her when she opens the app. When she has done the day's maths, Robo celebrates the number of days in a
row, with a bigger celebration the longer the run.

Success: she opens the app, Robo waves hello; after her 10th right answer of the day Robo celebrates the day, and over
the weeks she wants to "keep it going". A missed day here and there never makes her feel she lost something.

## Goals

- Hide the 🔥 counter. Keep counting `streak` / `bestStreak` in her saved progress (in case she asks for it back).
- Welcome: Robo waves and says "Welcome back, let's do some math!" when she opens the app.
- Count right answers per day; the **10th right answer of the day** counts the day toward the day streak.
- Celebrate the day, growing with the streak (user's choices):
  - Day 1: Robo **waves** — "Good job getting your math in today! Tomorrow can be day 2!"
  - Days 2–4: Robo **raises its arms** — "You did your math N days in a row! Keep it up!"
  - Days 5–9: arms up **and a little jump**, same words.
  - Day 10 and up: arms up, jump **and fireworks**, same words.
- Forgiving: one missed day doesn't break the streak (it waits); two missed days in a row start over at day 1.
- Held-back star walks say her star count at the moment they play (see "Star walk wording").

## Non-goals

- No badge, number or calendar showing the day count anywhere. Robo's words are the only place she sees it (user).
- No streak freezes, shop, coins, or anything bought.
- No change to stars, levels, scoring, hints, the learning path, or what plays for stars, level-ups and unlocks
  (apart from the walk's wording and the new moments taking their turn).
- No reminders or notifications outside the app.

## Anti-goals (failure even if it works)

- **Anything that reads as "you lost your streak"** — words, a number dropping, a sad Robo. A reset must sound exactly
  like her first-ever day.
- **Anything that reads as "you're done for today".** Celebrations are encouragement to keep going; play continues
  straight on. (User rejected "That's your math for today!" for this reason.)
- Using a hint, a wrong try or a slow answer costing her the day.
- The welcome or a celebration blocking her from answering, or covering the problem, answer boxes, pad or buttons.

## Constraints

- Her iPad: iPadOS 18.7.11, home-screen web app, offline-capable. A home-screen app is usually **resumed**, not
  relaunched (the service worker already re-checks for updates on `visibilitychange`).
- All state in localStorage via the versioned progress record (`src/storage.ts`); each version under its own key,
  older keys read once to migrate and never written.
- Robo's existing behaviour, layout rules (standing vs peek mode, moments shrink to the room under the problem, end
  on a rotation), mute button and Reduce Motion must keep working.
- Synthesized sound only (Web Audio), respecting mute.

## Approaches considered

1. **Through Robo's existing moment system, day count in saved progress (chosen by the user).** The welcome and day
   celebrations become new Robo moments decided in `src/core/robo.ts` and played by `src/ui/robo/robo.ts` like walks,
   high fives and kicks, so priority, held-back moments, peek mode and rotation come along. The day count joins the
   progress record (v7, migrated from v6).
2. Same moments, day count under its own localStorage key. No migration, but saved state lives in two places that
   can drift apart (rollbacks, partly cleared storage); the app has always kept one record. Not chosen.
3. A separate daily system beside Robo's moments. Would collide with walks/kicks and need its own conflict rules.
   Ruled out.

## Decided

### The day count (rules)

- A **day** is the iPad's local calendar date (midnight to midnight). Store dates as local `YYYY-MM-DD` strings so
  daylight-saving changes don't matter. (My call.)
- A **right answer** counts toward the day's 10: any problem finished by typing the right answer, including after
  hints or wrong tries. A Pass does not count. (User: hints never cost her the day; Pass is my call.)
- The 10th right answer on date D **completes** day D. Answers after that add nothing to the day streak.
- When day D completes, with `lastDone` the last completed date:
  - `lastDone` is D−1 or D−2 → `days = days + 1` (one missed day is forgiven: the streak waited, it doesn't grow
    for the missed day).
  - otherwise (never played, or 3+ days ago) → `days = 1`.
  - then `lastDone = D`.
- Starting over is silent: day 1 after a reset plays exactly what her first-ever day 1 plays.
- If the clock goes backwards (D earlier than `lastDone`), don't break or grow anything; treat it as an
  already-completed day. (My call; the builder may pick an equivalent safe rule.)

### Saved progress (v7)

- New key `math-practice-progress-v7`; v6 → v7 migration adds the day fields with defaults (no days yet); v6 key is
  never written. Rest of the migration chain unchanged.
- New fields (shape is the builder's; this is the information): the date of the current count of right answers and
  that count; the day-streak length; `lastDone`. A reload mid-day keeps today's count.
- `streak` and `bestStreak` keep being counted as today.

### Hiding the 🔥

- Remove the 🔥 badge from the top bar. The ⭐ total stays. Nothing else changes about `streak`.

### Welcome

- **When:** on app start, and when the app comes back to the foreground after being hidden for **30 minutes or
  more** (my call; covers the resumed home-screen app). Not on shorter switches.
- **What:** Robo, at its spot by the pad, waves (the existing wave) and says "Welcome back, let's do some math!" in
  its own bubble, for about the length of the existing surprise wave plus reading time. She can answer straight away;
  any key/answer ends it early like other words do.
- If she has never played (nothing saved, or a total of 0 stars), Robo says "Hi! Let's do some math!" instead (my
  call — "welcome back" is odd on a first visit). Based on the existing progress, not the new day fields, so the v7
  upgrade itself never makes her see "Hi!".
- The service worker reloads the app when an update is found on coming back to the foreground, even after a short
  switch. That reload must not count as an app start: remember when the app was last hidden (saved, e.g. in
  localStorage) and skip the welcome if that was under 30 minutes ago. (My call.)
- If Robo is up beside the problem (a hint or Pass walkthrough) when the welcome is due, the welcome never shows
  beside the problem; it waits for Robo to be back at its spot or is skipped. (My call; builder picks which.)
- Peek mode (small screens): Robo peeks in with the same words, like other peek moments.
- Plays every qualifying open, including on days already completed.

### Day celebrations

- A new big moment, played after the answer that completes the day (the 10th right answer).
- Words: day 1 — "Good job getting your math in today! Tomorrow can be day 2!"; day N ≥ 2 — "You did your math N
  days in a row! Keep it up!" (user approved both).
- Movement by tier (user): day 1 wave; 2–4 arms up; 5–9 arms up + a little jump; 10+ arms up + jump + fireworks.
- Where: in the moment lane under the problem like the high five and kick (standing mode); Robo peeks in on small
  screens. Fireworks are bursts beside Robo inside the moment's lane (above only when there's spare height — the
  lane is usually just Robo's height), drawn in SVG/CSS like the soccer ball, scaled with the moment, never over the
  problem, answer boxes, pad or buttons. (Placement my call.)
- Sound: Robo's beep-boop as for other moments; fireworks may add a few soft synthesized pops (builder's call),
  all silent when muted.
- Reduce Motion: no jump and no flying sparks; Robo fades in with arms up, fireworks become a gentle fade-in of
  static bursts (or are left out). Follows how the other moments already handle it.

### Priority with other moments

- Only one big moment per answer, as now. Order: **kick (unlock) > day celebration > high five > walk**.
- The day celebration ignores the 4-problem cooldown (it's once a day, and it should land on the 10th answer).
- If it can't play on that answer (an unlock's kick plays instead), it is held back and plays on her next right
  answer. A walk displaced by it is held back as walks already are. A high five displaced by it is skipped, as a
  high five during cooldown is today.
- A held-back day celebration lives in Robo's in-memory memory like a held-back walk; a reload before it plays loses
  it (the day still counts). (My call; acceptable.)

### Star walk wording

- A walk that plays later than the milestone it was earned at says her **current** star count, e.g. earned at 40,
  plays at 45 → "You've gotten 45 questions right! Keep going!" (user; existing wording kept).
- The friend joins when the **earned** milestone is a multiple of 100, even if the count shown is 104.

### Code structure (my call)

- Pure date/day-count logic in a new core module (e.g. `src/core/days.ts`), fully unit-tested with explicit dates.
- `decideRobo` gains the day celebration (with tier) and its held-back slot; the walk words use `totalAfter`.
- The app takes a wall clock from deps (the existing `now` is `performance.now()`, wrong for dates and the 30-minute
  check), so tests control the date and time; `main.ts` passes the real one.
- New moments added to the dev preview page (`/robo-preview.html?moment=...`: welcome, day 1, a 2–4 day, a 5–9 day,
  a 10+ day) and to the Playwright layout check (`.context/playwright/shots.mjs`): never overlapping the problem,
  answer boxes, bubble, picture or controls, in every view, with and without Reduce Motion.

## Left to the builder

- Exact field names and shape in progress v7; module and function names.
- Exact timings of the welcome and celebrations (in line with existing `MOMENT_MS`), jump height, fireworks look
  (colours from Robo's palette), number of bursts.
- How the welcome's words show (Robo's bubble at its spot vs the moment's words element), as long as nothing is
  covered and she can answer during it.
- Whether the welcome on resume also waits for a moment already playing to end, or replaces it.
- Wording of code comments and test names.
