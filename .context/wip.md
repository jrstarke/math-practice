# WIP (updated 2026-10-25)

## >>> RESUME HERE (stashed 2026-10-25, multiplication implementation mid-flight)
- **Working in a worktree, not here:** /workspace/.claude/worktrees/multiplication, branch feat/multiplication
  (created via EnterWorktree; this main checkout is still on main, untouched, clean). All commits below live on
  that branch only. SDD ledger: `.superpowers/sdd/2026-10-25-multiplication/progress.md` inside the worktree —
  read that first on resume, it has the full per-task history (review verdicts, fix rounds, rulings).
- **Design approved, plan written and executed via subagent-driven-development (user chose subagent-driven
  over native for this one, given the size/cross-task-interface risk).**
- **Status: Tasks 1–5 of 6 complete, reviewed clean** (one real fix round in Task 2 — a plan-text defect I found
  and corrected mid-implementation, not a code bug; everything else approved with zero or cosmetic findings).
  Task 6 (Playwright layout check) — its script extension is done, reviewed clean (commit d06c757). The actual
  browser run was blocked on a Chromium/firewall issue (see domains.md), user unblocked it via docker-exec ipset
  grants (cdn.playwright.dev needed 3 grants — its IP rotates fast; storage.googleapis.com needed 1, since the
  download redirects there). Once unblocked: real overflow found (picture had no reserved vertical budget,
  escalating badly with level: 2/34→14/34→19/34→26/34 fail across levels 1/7/8/9). Two implementer sessions
  doing the CSS fix were killed mid-run by the harness (not failures of the work — see below); I (the
  controller) verified the final state myself directly and committed it. **Fix is verified working**: commits
  721b7e2 (independent --picture-cell scaling, ResizeObserver) + 53fd40e (--unit floor-unification, fixes a
  real self-caught bug where a floored rod could render taller than a floored flat). My own SEEDS=8 run across
  all 4 levels × 13 viewports × tip variants: 2/34 FAIL at every level, every failure the pre-existing
  se-tab 34px-cell exception (unrelated, already accepted baseline) — zero picture-overlap/overflow issues.
  307/307 vitest passing, tsc clean, confirmed just before this stash.
- **Not yet done:** this CSS-fix commit (721b7e2 + 53fd40e) has not been through the normal task-reviewer step
  — it was committed based on the controller's own direct verification (two implementer sessions crashed before
  finishing it) rather than an implementer's report. **Next step on resume: dispatch a task reviewer for this
  diff** (same pattern as every other task — see review-package/task-reviewer-prompt in the subagent-driven-
  development skill), then the final whole-branch review (references/final-review.md), then ask the user how
  to integrate (finishing-a-development-branch skill) — do NOT merge/push without asking, per standing instructions.
- **Why we're pausing here:** user raised container memory/context concerns mid-session and asked to stash +
  consider a restart. Nothing is at risk from a restart: the worktree and all commits live under /workspace
  (host-mounted, persists). What does NOT survive a restart: the Chromium browser binary
  (~/.cache/ms-playwright, ~400MB, outside /workspace) and the /tmp/claude-1000/pw scratch dir (playwright npm
  package + scratch scripts/logs) — both easy/fast to redo (`npm i playwright` in a fresh scratch dir, then
  re-grant cdn.playwright.dev + storage.googleapis.com the same way if a browser run is needed again; the task
  reviewer for the CSS fix doesn't need a browser itself, just the diff, so it's not actually blocked on this).
  Dev server + any background node/vite processes were stopped before this stash; nothing left dangling.
- **Playwright network pattern, for next time:** cdn.playwright.dev and storage.googleapis.com both have
  rotating IPs that go stale within minutes of the ipset grant (see domains.md's existing notes on this — this
  session re-confirmed it empirically, needed 4 total docker-exec grants across both domains before a clean
  install). Expect to re-run the grant command 1-3× per fresh container boot if a Playwright check is needed.

## >>> Previous resume note (stashed 2026-10-25, multiplication design approval) — superseded by the above
- **Waiting on user:** approval of the multiplication design
  docs/superpowers/specs/2026-10-25-multiplication-design.md (commit caf14f5; mockup in docs/superpowers/specs/assets/).
  Builder check done; its answers folded in. Last user decision: levels 8–9 draw one full group + outlines (option A).
- **Calls I made, listed to user for review:** level 9 single digit 2–5; levels 8–9 skip multiples of 10; ×3 drawn 2+1,
  ×4 drawn 2+2; ×1/×0 only in level 6 (single question hint); levels 1–5 other factor 2–9; answer boxes don't reveal
  answer length (fixed width per level); facts both orders, multi-digit first for 8–9; target times 8 s / 20 s / 30 s;
  level-6 tie-break picks one consistently.
- **After approval:** invoke superpowers:writing-plans for multiplication. Plan starts by refactoring add/sub into
  per-operation modules (approach A, no behaviour change, existing tests unchanged), then the × module, picture, hints,
  Progress v4 (key math-practice-progress-v4, chain v4→v3→v2→v1), unlock rule multiplication {addition:6, subtraction:5}.
  User chose **native** execution (executing-plans + one fresh opus reviewer) for the last two plans.
- **Git (2026-10-25):** on main. dev/main = 94d8e59 (learning path deployed to dev; main is ahead only by docs/notes commits).
  prod/main = f4372d6 (no learning path yet). User pushes manually from the host; container has no GitHub/SSH auth.
- **Dev site** math-practice-dev.jamiestarke.com verified working (custom domain reachable from container). User was
  testing the learning path there (their record: add 6, sub 6, both unlocked).
- **Open on user's side:** Enforce HTTPS on dev/prod Pages; Cloudflare SSL mode Full / DNS-only.
- **Mockups (private artifacts):** tally https://claude.ai/artifact/SQ1J9geaxxQDMbBBnkx9CG, layout options
  https://claude.ai/artifact/9LVRQ34AREHq9ZmyUXfXSg, three ways https://claude.ai/artifact/HwMdCMBqV5GsZEKuXiaPq3.

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
