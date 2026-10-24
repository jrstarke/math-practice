# WIP (updated 2026-10-24)

## Status
- On master (no main branch; no remote). 145 tests pass, build OK. Ledger in .superpowers/sdd deleted after merge.
- Plan: docs/superpowers/plans/2026-10-24-math-practice.md; Spec: docs/superpowers/specs/2026-10-24-math-practice-design.md

## Merged (2026-10-24)
- feat/math-practice fast-forwarded into master (HEAD 4d9b6a5); branch + .superpowers/sdd ledger deleted. No git remote yet.
- Next ideas: GitHub Pages deploy (needs remote + Vite base path; streak lives per-origin, so moving off ngrok loses it unless we add a transfer), then multiplication (brainstorm started: times tables vs multi-digit undecided).

## Device testing
- $PUBLISH_PORT is set on newer container runs (was 64181). Daughter uses the app via ngrok https://slate-washer-unreal.ngrok-free.dev (see running.md); her progress (streak 58+) lives in that origin's localStorage.

## Final-review fixes (done)
- #2 double-tap Next→Pass + #3 iOS audio unlock: 9f29593. #1 iPhone SE overflow + #4 iPhone landscape: dde6403.
- New bug found in browser + fixed (dde6403): empty answer row had 0 height → answer boxes invisible until first digit.
- Layout approach: `.problem-area` is a size container (in `@supports`); `--cell` = min(84px, 100cqw/5.8,
  (100cqh − bubble-room − 22px)/3.46). Bubble is absolute, anchored above `.problem-anchor`, grows upward.
  Compact rules `@media (max-height: 760px)`; phone landscape `@media (orientation: landscape) and (max-height: 500px)`.

## Rulings I made (all reported to user)
- nav dep optional (defaults to navigator); vitest globals; extra scratch-overwrite test (432 − 178);
  ghost digits in sibling overlay; test `setup` in src/ui/testUtil.ts from Task 8.
- Pass reveals next step immediately then every 1.5 s; Pass clears typed answer.
- 400 ms guard on Hint/Pass after Next (not `click` — click doesn't stop a deliberate double-tap).
- Hint bubble overlays above problem, grows upward → long hints may briefly cover streak/mute on phones.
- Borrow-across-zero hint split into 2 steps (scratch shows 10, then 9); longest hint 145→95 chars.
- Install tip floats over number pad on ≤760px tall (incl. iPad landscape in Safari) or ≤600px wide screens.
- iPhone SE in Safari tab accepted at 34px cells (51px installed). shots.mjs exits 1 for se-tab only (38px floor).
  Offered alternative if user wants bigger: make the always-reserved message row an overlay (~+9px/cell).

## Deferred minors (reported to user)
- Streak 🔥 resets only at problem end (spec §6: on wrong submit/hint).
- Keyboard: Enter does nothing in `passed`; no hint key; e.repeat unfiltered.
- Final-carry hint says "carries to the hundreds" with no following step.
- Grid widens while typing a long answer (problemView cols includes answer length).
- Hint/Pass look enabled while inert (correct/passing).
- Faded wrong answer overlaps ghost digits after hint.

## Needs real-device check (Chromium can't verify)
- Whether pointerup counts as user activation for audio on iOS WebKit.
- Real safe-area insets in landscape (only simulated with forced padding).
- Pre-iOS 16 (no container queries) falls back to old sizing → may still overflow.

## Visual check tooling
- Scripts in `.context/playwright/` (shots.mjs = 13 viewports × seeds × all hint/pass states, overlap/size asserts;
  hintlen.ts = longest hint finder via `npx vite-node`). See running.md for how to run.
- Playwright pkg lives in scratch /tmp/claude-1000/pw (gone after restart → `npm i playwright` there).
- Only full Chromium (`~/.cache/ms-playwright/chromium-1248`) downloaded; headless-shell + ffmpeg failed
  → scripts use `chromium.launch({ channel: 'chromium' })`. Chromium system libs are present now.

## iPad landscape overlap (reported 2026-10-24, ON HOLD — user upgrading iPadOS 15 → 16+)
- Screenshot (IMG_0580.PNG, since deleted): Safari, landscape,
  2160x1620 px (≈1080x810 CSS, 10.2" iPad), tab bar. Layout is STACKED (column, controls max-width 460) instead of
  side-by-side; install tip in-flow at top (so max-height:760 rule didn't match either); cells at 84px fallback
  → answer row sits under Hint/Pass.
- Chromium at 1024x665/1080x740 etc. lays out side-by-side and passes — can't reproduce.
- iOS 15 lacks container queries (16+), so the cell-size fallback explains the oversized problem; it does NOT
  obviously explain why the landscape/max-height media queries didn't match. Re-test after upgrade; if still
  broken, investigate the media-query mismatch (maybe show innerWidth/innerHeight on device).
