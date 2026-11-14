# WIP (updated 2026-11-13)

## >>> RESUME HERE (updated 2026-11-13, handed off to a new machine)
- **Branch to work on: `feat/robos-world`** (pushed to the `prod` remote as a branch; only `main` deploys). It holds
  main's characters commit plus the Robo's world design and mockups. Local `main` = 4cebb75 (characters, prod/main + 1).
- **Waiting on the user: approval of the Robo's world design**
  (docs/superpowers/specs/2026-11-11-robos-world-design.md). Once approved: superpowers:writing-plans for
  **release 1 = her first pick** (world appears on day 5 practised; 3 random kinds; tap to place, tap to move; Robo's
  cheer line; tree/bush/mountain/lake/house; baked-blur world behind the math with the card + light veil; the pick
  may be an overlay; one area; progress v9 `world`). Then build it, ideally before her 5th practised day.
  Releases after that: R2 celebrations into the world (slide-away, » skip, no pan), R3 world grows (areas, swipe,
  pan); then part 2 friends (Beep/Boom/Room in the first 3 houses), part 3 roads + vehicles (user: keep this order).
- **Mockups:** docs/superpowers/mockups/2026-11-11-robos-world/ (robos-world-for-her.html is the kid version;
  pick-moment-v2, world-idea-v2, roads-v2 are the latest of each).
- **Clean up dev:** dev's main is the throwaway blur test build (8f7b343, "spike: …" commits). When the user is done
  testing on the iPad: `git push --force dev main` (user OK'd force-pushing dev). The spike's code stays reachable
  as dev's old main until then; the local branch spike/world-blur was not carried over. Its findings are in the
  design: blur baked into an SVG <img> (feGaussianBlur) on its own layer (`will-change: transform`), because a live
  CSS `filter: blur()` made Robo's hop stutter on her iPad; the user prefers blur + card. Its next ▶ / replay ↻
  move buttons might be worth keeping as a dev-only tool (offered to the user, no answer yet).
- **Shipped and live (prod and dev):** day streak (v7), celebration variety (a0eb55e), days-practised counter
  (progress v8, f757a77). Open on-iPad checks for celebrations: arms switch at the payoff; var() in keyframes on a
  mid-tower refit. Deferred minors were reported to the user (details in the git log / final messages).
- **New machine setup:**
  - node via asdf (`asdf plugin add nodejs && asdf install nodejs latest && asdf global nodejs latest`); if `node`
    isn't found, prefix commands with `PATH="$HOME/.asdf/shims:$PATH"`. Then `npm install`.
  - `GH_TOKEN` must be set for pushes (dev + prod remotes, HTTPS). Remotes: `dev` = jrstarke/math-practice-dev,
    `prod` = jrstarke/math-practice. Watch a deploy: `gh run watch <id> -R jrstarke/<repo> --exit-status`.
  - Mockup server (superpowers brainstorming visual companion): run its `start-server.sh` with
    `BRAINSTORM_PORT=$PUBLISH_PORT --project-dir /workspace --host 0.0.0.0 --url-host localhost --foreground` as a
    background job (it dies with its shell otherwise, and stops itself after a while idle). Always use it: see
    decisions.md 2026-11-13.
  - Tests, build, the Playwright layout check: running.md.
- **Next-step candidates** (details further down this file):
  1. Gentler streak — today a hint breaks the 🔥 streak; conflicts with "hints should feel good" (small).
  2. Short sets with a finish line ending in Robo's kick (reverses the "endless" decision; user's call).
  3. Unlockables earned by practice (light colours, ball, the friend joining) — thin evidence; no shop/coins.
  4. Soccer mini-game with Robo (big, later).
  5. Add/sub hints teaching BC Grade 2 mental strategies (bridging 10, tens-and-ones) instead of column carry/borrow.
  6. Next levels: division remainders (Grade 5), add/sub to 10 000 (Grade 4).
  7. Re-check the old iPad landscape overlap bug now that her iPad is on iPadOS 18.7.11 (was likely iPadOS 15).
  8. Open multiplication picture questions (tiny 968×5 blocks on SE, pictures smaller than room, faint .part.hl).
  9. Robo deferred minors: extra hop after a bounce surprise (robo-hop class never removed); glow stops pulsing after
     first flash (robo-flash outranks robo-pulse); moments can sit over the centred text line; held-back walk on a
     hinted answer leaves the bubble tail pointing at nothing ~1s; unused MomentPlace.spot/.viewportWidth;
     .problem-anchor/.picture-host always a stacking context now (transform).
- **Robo (done):** spec docs/superpowers/specs/2026-11-08-robo-companion-design.md, plan
  docs/superpowers/plans/2026-11-08-robo-companion.md. Code: src/core/robo.ts (what happens when),
  src/ui/robo/{drawing,layout,robo}.ts + robo.css, wired in src/ui/app.ts; beep-boop in sound.ts.
  Final review "With fixes" → 3 fixes (try-again words follow Robo; moments refit to the next problem's room; a
  rotation ends a moment). Dev-only preview: /robo-preview.html (+ ?moment=walk|walk-friend|high-five|kick|peek|
  surprise|wrong|right|up). Robo layout checks: ROBO_ONLY=1 / RM=1 node shots.mjs (running.md).
- **Screenshots** for the user/child: /workspace/robo-screenshots/ (git-excluded via .git/info/exclude):
  ipad-home-screen/, ipad-safari-tab/, animation-frames/, phone/, all-poses.png.
- **User's on-iPad checklist:** Robo beside the pad and not over anything; Hint → hops up beside the problem;
  red on wrong, off at next key; walk at the next multiple of 20 stars; rotate while Robo is up; Reduce Motion →
  fades; arms/legs swing from shoulders/hips; a walk shrinks to fit a taller column problem that follows a × one.
- Untracked /workspace/.DS_Store is from the host's Finder — leave it alone (not ours).
- Character art + guide in character/ (the child's; Robo + identical friend).
- **Key decisions (all in the spec):** light OFF while she works (the child's pick over yellow/green pulse), green =
  good, red = wrong until next key; Robo stands beside the pad on her iPad, hops up beside the problem to say hints
  (the existing hint bubble restyled), peeks in on small screens; walks every 20 stars (friend at 100), high five on
  level-up, kick on unlock, rare surprises; cooldown 4 problems, held-back walks play later. No progress change.
- **Her iPad is on iPadOS 18.7.11** (upgraded 2026-11-08; was 15). The Robo design kept iPadOS 15 limits (JS measuring),
  which still works.
- Mockups from brainstorming: .superpowers/brainstorm/346246-1794165648/content/ (hint-robo-v2.html, robo-light.html).
  The visual companion server needs node on PATH and BRAINSTORM_PORT=$PUBLISH_PORT, --host 0.0.0.0, run in background.
- Division: merged to main and deployed to dev + prod on 2026-11-04 (c74cc7b).

## Division notes (2026-11-02; merged + deployed 2026-11-04)
- **Branch:** `feat/division` (main checkout, no worktree). Holds: subtraction unlocks at addition 2 (9adb562),
  division spec/plan, and the 5 division tasks. Not merged — ask before merging/pushing.
- **Division (plan docs/superpowers/plans/2026-11-02-division.md, executed inline):** all 5 tasks done. ÷ module
  (src/core/operations/division.ts) mirrors mult levels; sharing hints with a "to share" pile (PictureState.pile);
  progress v6 (key math-practice-progress-v6, adds division + welcome); path.ts: division unlocks at mult 2, then climbs
  freely (the one-level-behind cap was built, then removed 2026-11-02 at the user's request), opWeight (1 + 0.25/level behind strongest still-learning op, cap 2,
  level 9 → 0.2, levels 1-2 → 1), 3-problem welcome after any unlock (persisted). 467 vitest (after cap removal), tsc clean.
  Playwright (`OP=÷` / default ×, fixture now v6 + welcome forces the op): only se-tab cell 31px fails, as before.
- **Final review (2026-11-02):** fresh reviewer said With fixes; fixed 0 ÷ 10 "undefined groups", 10 ÷ 1 answer leak, 0 ÷ 1 grammar, scoped empty-group CSS to division (commit after 4644e25). 479 tests.
  Deferred minors: layout check uses random seeds (add fixed 495÷5, 90÷10, 0÷10); no test for serving division after a mult slip.
- **Known:** division pictures on iPhone SE Safari tab are tiny (fit, hard to read) — same trade-off as mult.
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

- 2026-11-04: feat/division merged to main (ff, c74cc7b) and pushed to dev and prod. Branch deleted. 467 tests, tsc clean.

## Engagement ideas (researched 2026-11-08, nothing decided yet)
Daughter wants it more fun, "like Duolingo math"; she made a character, Robo (character/robot-character.md + SVGs: stand,
walk, kick, two robots). Ideas offered, in recommended order: 1) Robo as an on-screen companion that reacts (light
green/red, speech bubble, says the hints, points at buttons); 2) short sets with a finish line, ending in Robo's soccer
kick (reverses v1 non-goal "fixed-length rounds"); 3) Robo moments for level-ups/unlocks/star milestones; 4) unlockables
earned through practice (light colours, balls, a robot friend from robots.svg); 5) gentler streak (hints currently
break it); 6) bigger later: soccer mini-game. Cautions: reward the maths not time spent, no shop/currency, no guilt or
loss pressure, never punish hint use. Character research is the strongest evidence; customization evidence is thin.
- 2026-11-08: Robo companion design drafted (docs/superpowers/specs/2026-11-08-robo-companion-design.md), awaiting user approval.
  Her iPad is STILL on iPadOS 15 (upgrade failed; user handling separately) → no container queries; Robo measures in JS.
