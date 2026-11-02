# WIP (updated 2026-11-01)

## >>> RESUME HERE (stashed 2026-11-01)
- **Branch:** on `feat/mult-reorder` in the main checkout (/workspace, no worktree). One feature commit 91046cf on top
  of main (55eea89) + this stash commit. Working tree clean. **Waiting on user:** "merge feat/mult-reorder into main?"
  (fast-forward). After merge: user pushes dev, then prod. Don't merge/push without asking.
- **What the branch does:** multiplication levels 7 = 2-digit × 2–5, 8 = 3-digit × 2–5, 9 = facts 6–9; progress v5
  (key math-practice-progress-v5; v4 mult level 7→7, 8→7, 9→8, moved levels clear window). Spec table updated with a
  dated note. Verified: 345 vitest, tsc clean, Playwright SEEDS=8 only se-tab/se-tab-tip FAIL (cell 31px < 38).
  No subagent review was run on this change (user said "just dive in"); consider one before merge if asked.
- **Deployed (last seen 2026-10-25):** dev/main = 6dce415 (multiplication + update-on-resume + build label, old level
  order, progress v4). prod/main = 89d0e75 — a mid-fix-wave commit, lacks the L9 picture-fit fix, update-on-resume and
  build label. Suggested user push main to prod. Both are live with v4 saves → the v5 migration matters.
- **Open product questions (asked, unanswered):** tiny blocks for 968×5 on iPhone SE Safari tab (now level 8);
  2-digit level (now 7) pictures scaled smaller than room allows; 2-digit tally ones line is bare "18" vs 3-digit
  "40 ones = 40"; pale-yellow .part.hl highlight may be too subtle.
- **Curriculum findings (BC, curriculum.gov.bc.ca, reported to user):** add/sub levels map cleanly to Grades 1–3.
  Suggestions not yet acted on: unlock subtraction at addition 2 instead of 3 (BC teaches both from Grade 1);
  add/sub hints teach column carry/borrow but BC Grade 2 teaches mental strategies (bridging 10, decomposing into
  tens and ones, friendly numbers, compensating) — a possible hint redesign project; division is the natural next
  operation (BC Grade 3 concepts, Grade 4 2–3-digit ÷ 1-digit, Grade 5 remainders); add/sub ceiling is 3-digit
  (Grade 4 goes to 10 000). Grades 6–8 add decimals, fractions, integers, ratios/percents, equations — out of scope.
- **Network:** curriculum.gov.bc.ca + www2.gov.bc.ca now in allowed-domains (commits 3b2e886, 55eea89). Global
  CLAUDE.md now says temporary grants use `docker exec --user root <container-id> allow-domain <domain>` (handles
  rotating CDN IPs) — use that instead of the old ipset loop. Chromium + playwright in /tmp/claude-1000/pw (lost on restart).
- **Shell quirk:** PATH lost asdf shims mid-session — prefix commands with PATH="$HOME/.asdf/shims:$PATH".

## Multiplication reorder (branch feat/mult-reorder, 2026-10-25)
- Levels now 7 = 2-digit × 2–5, 8 = 3-digit × 2–5, 9 = facts 6–9 (BC: multi-digit × 1-digit is Grade 4, 6–9 fact
  fluency Grade 5). Progress v5 (key math-practice-progress-v5): v4 mult level 7→7, 8→7, 9→8, moved levels clear
  their window; v4 key never written. 345 tests, Playwright only se-tab (cell now 31px since the build label).
- Deployed state seen 2026-10-25: dev/main = 6dce415, prod/main = 89d0e75 (mid fix-wave commit, lacks L9-fit fix,
  update-on-resume, build label) — told user.
- Shell PATH lost asdf shims mid-session: prefix commands with PATH="$HOME/.asdf/shims:$PATH".

## Multiplication — MERGED to main 2026-10-25 (HEAD 741e566); user pushed to dev and prod afterwards
- Also added (741e566): service worker update check on visibilitychange (home-screen iPad apps resume rather than
  relaunch), and a small build-time label "YYYY-MM-DD HH:MM UTC" under the mute button (__APP_VERSION__ via vite define).
  Branch + worktree + SDD workspace deleted.
- Spec docs/superpowers/specs/2026-10-25-multiplication-design.md, plan docs/superpowers/plans/2026-10-25-multiplication.md.
  All 6 tasks done + task-reviewed; final whole-branch review (With fixes) → one fix wave → scoped re-review clean.
  325 tests, tsc clean, Playwright: only the accepted se-tab 34px-cell exception at every level.
- Progress v4 key math-practice-progress-v4 (chain v4→v3→v2→v1); multiplication unlocks at addition 6 + subtraction 5.
- Rulings (reported to user): level-6 ×3/×4 use the level-4/5 strategies (spec over plan); dashed group circles +
  same-size outlines; hint highlighting added; add/sub import ../entry for MAX_ANSWER (no cycle); (10,0) → 10 groups
  accepted; level-9 zero-tens gives 3 steps; level-6 ×1 picture shows the answer-sized group (the spec's choice);
  last-resort block unit floor down to 1.5px (L9 968×5 on iPhone SE Safari tab renders at 2px — fits, hard to read).
- Open product questions for user: tiny L9 blocks on SE; L8 pictures scaled smaller than the room allows;
  L8 tally ones line is bare "18" vs L9 "40 ones = 40"; .part.hl highlight is subtle pale yellow.
- Deferred minors (left): dead answerColumns import in levels.ts; magic constants in fitPicture; --picture-budget
  hard-codes cell*1.84; picture rebuilt per keypress; shots.mjs ATTEMPT_CAP log off-by-one.
- Playwright: cdn.playwright.dev + storage.googleapis.com rotate IPs; install Chromium right after container start
  (worked first try 2026-10-25 after restart).

## Status
- On main. 179 tests pass. Running total + learning path merged. Two Pages sites (see running.md).
- Specs/plans: docs/superpowers/specs/*, docs/superpowers/plans/*.

## Merged (2026-10-24)
- feat/math-practice fast-forwarded into master (HEAD 4d9b6a5), then master renamed to main; branch + .superpowers/sdd ledger deleted. No git remote yet.
- Next ideas: GitHub Pages deploy (needs remote + Vite base path; decided 2026-10-25: no transfer, she starts fresh on the new domain), then multiplication (brainstorm started: times tables vs multi-digit undecided).

## Running total (branch feat/running-total, 2026-10-25)
- Spec docs/superpowers/specs/2026-10-25-running-total-design.md, plan docs/superpowers/plans/2026-10-25-running-total.md. Done + reviewed, 160 tests.
- Progress is now v2 under localStorage key `math-practice-progress-v2`; v1 key `math-practice-progress` is read once to migrate (total = bestStreak) and never written. Rolling back to an older build is safe: it reads the untouched v1 key (losing only progress made since the upgrade).
- dist/ (ngrok) still serves the pre-total build until someone runs `npm run build` on main.

## Learning path (branch feat/learning-path, 2026-10-25)
- Spec/plan: docs/superpowers/{specs,plans}/2026-10-25-learning-path*. Done + reviewed (no Critical/Important), 179 tests.
- Progress v3 under key `math-practice-progress-v3` (+ `unlocked`); load chain v3 → v2 key → v1 key; old keys never written.
- Rules in src/core/path.ts: subtraction unlocks at addition ≥3 (permanent); all ops start level 1; level-9 op gets 1/5 share.
- Deferred minors: unlock note persists through Hint/Pass; pass() ignores unlocks; no app-level v2-upgrade test.
- NEXT: multiplication project (full design + builder check). Decisions so far: written mult, BC curriculum, breaking apart,
  levels ×2, ×10, ×5, ×3, ×4, mixed, 6–9 (split 5+rest), 2d×1d, 3d×1d; hints = nudges along one strategy, last hint stops
  one step short, Pass shows all; picture = groups of base-ten blocks (appears on Hint); horizontal equation layout;
  approach A (one module per operation); unlock at addition 6 + subtraction 5.

## Device testing
- $PUBLISH_PORT is set on newer container runs (was 64181). ngrok tunnel stopped 2026-10-25 (she moves to math-practice.jamiestarke.com). Steps to restart it are in running.md.

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
