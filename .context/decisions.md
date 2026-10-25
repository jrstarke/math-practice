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
