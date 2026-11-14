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
