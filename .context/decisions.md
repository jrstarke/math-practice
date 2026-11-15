# Decisions

- 2026-10-24: Math practice PWA for kids 7–9 (add/sub, positive only). Full design in
  docs/superpowers/specs/2026-10-24-math-practice-design.md. Key choices: vanilla TS + Vite PWA,
  vertical layout, left-to-right entry right-aligned, custom number pad, optional scratch boxes,
  unlimited tries + tap-only column hints + Pass, invisible timing, separate 9-level ladders per op,
  endless mode w/ streak, synthesized Web Audio sounds + mute, single user, localStorage, no parent view.
- 2026-10-24 (final review fixes): hint bubble floats above the problem (never resizes it); problem sized by container
  query to the space left; borrow-across-zero hint split into 2 steps; 400ms Hint/Pass guard after Next;
  audio unlock retried on every gesture. Details + all rulings in wip.md.
- 2026-10-25: Hosting = GitHub Pages on math-practice.jamiestarke.com (prod) + math-practice-dev.jamiestarke.com (dev),
  separate repos, user pushes manually. No progress transfer from the ngrok origin — user accepted she starts fresh
  on the new domain. Progress v2 lives under localStorage key math-practice-progress-v2 (v1 key read-only).
- 2026-10-25: Multiplication levels reordered to match BC (7 = 2-digit × 2–5, 8 = 3-digit × 2–5, 9 = facts 6–9);
  2-digit × 6–9 dropped (user OK). Progress v5 remaps saved levels. Curriculum notes: add/sub hints teach column
  carry/borrow while BC Grade 2 teaches mental strategies (bridging 10, decomposing) — possible future project.
- 2026-11-02: Division designed (docs/superpowers/specs/2026-11-01-division-design.md, on branch feat/sub-unlock-2,
  awaiting user approval): mirrors the 9 mult levels, no remainders, unlocks at mult 2 and stays one level behind
  mult (cap lifts to 9 at mult 9; slips never take levels away), sharing picture with a "to share" pile, progress v6.
  Also new mix rule for all ops: weight 1 + 0.25/level behind strongest still-learning op (cap 2), level 9 = 0.2,
  new op weight 1 at levels 1-2, division gap vs its cap, 3-problem welcome after any unlock (persisted).
  Subtraction now unlocks at addition 2 (commit 9adb562, same branch).
- 2026-11-02: Division "one level behind multiplication" cap REMOVED (user): multiplication still comes first via the
  unlock at mult 2, but after that division climbs freely — if division comes easier, advancing it helps multiplication
  (fact families), and the practise-what's-behind mix boosts multiplication when it lags. Cap code recoverable from 9f4f80d.
- 2026-11-08: Robo companion built (spec docs/superpowers/specs/2026-11-08-robo-companion-design.md). Her iPad is now
  iPadOS 18.7.11 (was 15), so Safari-15 limits no longer bind new work; Robo's JS layout measuring stays. Robo moments
  shrink to fit the room under the problem (min 56px), peek at the stage's bottom-left on small screens, and end on a
  rotation.
- 2026-11-13: Always use the visual companion (browser mockups) when brainstorming — start it without asking (user:
  "always :)"). Show mockups beside any playback of something she'll look at.
- 2026-11-14: Robo's world horizon = about a third down (y=120 of 360), more ground (user: "more ground"); sketch mockups used 42%. In spec (commit 993f1ed). Tune by eye on a mockup in release 1.
- 2026-11-14 (later): horizon changed again to 25% down (y=90 of 360; user: "the 25 to give more space to play"); small mountains plus a few smaller scenery-only hills in front; a one-zone kind dims the rest while placing (mountain = horizon band, tree/bush/house = ground, lake = open ground); she can switch among the three offered picks before OK; blur numbers (stdDeviation 2, card 92%, veil 15%) written into the spec. Mockup: .superpowers/brainstorm/1106-1794639231/content/world-25-hills-placing.html.
- 2026-11-14 (release 1 build): the pick is an overlay over the whole app; its world frame is fitted (fitFrame) in the
  space above the bottom strip (Robo, words, tray), so the tray never covers ground she can place on. The card behind
  the math hugs the problem and its picture (padded), out of flow, measured in app.ts (fitCard) — it never changes the
  layout. The pick draws its own small Robo figure for the prompt and cheer; the real Robo is hidden while it is open
  (and pad, keys, Hint, Pass, mute are inert). On screens narrower than 3:4 (phones) the whole area is letterboxed
  (fitted to the width, flat sky/ground continuing) instead of cropped, so every spot stays visible until release 3's
  swipe. A pick waiting on a moment opens when the moment ends; Hint or Pass never opens it (the next right answer does).
- 2026-11-14 (after release 1): picks come every 3 days practised (was 5; user), so the world and her first pick appear on her 3rd practised day (PICK_EVERY in src/core/world.ts). Sounds built: Robo's beep-boop when the pick opens, a soft pop (sound.pop) when she places something. Phone layout is not a concern (she is fully on the iPad).
- 2026-11-14 (later): the first pick is on day 1, then every 3 days practised (days 1, 4, 7, ...): picksOwed = ceil(practised / 3) - picksUsed (user: "unlock robo's world now, first item on day 1"). The prompt reads "1 day of math!" on day 1.
- 2026-11-14/15 (world polish, all user calls): the world starts with no mountains (she adds them) and only three soft hills; ground zone x 12-258, lake x 30-240 ("closer to the edge"; heights unchanged); the hills sit inside the 270-wide area and repeat so the sky/ground/hills run to the screen's edges (sceneExtent). Release 1 merged to main and live on dev + prod (3f37ddb). Still open: lighter dim, bigger frame vs the bottom tray strip.
