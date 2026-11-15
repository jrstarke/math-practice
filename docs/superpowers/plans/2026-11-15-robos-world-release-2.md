# Robo's World, Release 2 (celebrations play in her world) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once she has a world, the every-20-stars, 100s-conga and day-streak celebrations slide the math away and play, scaled up, in her sharp world; a quiet » ends one early. First, the blurred background and the pick share one world frame (they don't today).

**Architecture:** One `worldFrame()` in `src/ui/world/frame.ts` used by the pick and the background. The background gains a sharp twin picture that cross-fades in (`focus(on)`). A new `src/ui/world/moment.ts` decides which moments go to the world and where they stand. `app.ts` runs the slide-away, the existing `robo.play()` with a world-sized `MomentPlace`, the » button, and the hand-off to a waiting pick. CSS does all movement.

**Tech Stack:** TypeScript, Vite, vanilla DOM (`el()` in `src/ui/dom.ts`), vitest + jsdom, Playwright check in `.context/playwright/shots.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-15-robos-world-release-2-design.md` (release 2 only) on top of `2026-11-11-robos-world-design.md`.

## Global Constraints

- Safari/iPadOS 15+ safe CSS: no container queries, `:has()`, nesting or `inset` shorthand. Her iPad only matters for layout, but keep phones working.
- Never a live CSS `filter: blur()` on anything that moves. The blurred world stays the baked SVG picture; the sharp world is a second unblurred picture. Nothing in the world moves while the math is on screen.
- Slide: problem + top bar up, keys + buttons down, ~0.5 s (`SLIDE_MS = 500`). World comes into focus over the same 0.5 s.
- Which moments: `stars`, `conga`, `day` kinds, only when `progress.world.items.length > 0`. `levelUp` and `kick` stay in the strip.
- » skip: top right, at least 44 x 44 px, translucent, no label text beyond "»" (aria-label "Skip"). Only it ends a world moment early; taps elsewhere do nothing.
- Reduce Motion: no sliding; the math fades out, the world fades into focus, the scene plays as it does today under Reduce Motion, the math fades back.
- A rotation ends a world moment (math back at once). Total under about 8 s including slides: celebration at most `WORLD_MAX_MS = 6000`.
- Her place in the problem (typed digits, hint state) is untouched; nothing can be answered while the math is away (pointer and keyboard).
- Pick rules, saved progress (v9) and when celebrations happen do not change.

## Review Focus

1. Taps and physical-keyboard digits while the math is sliding or away never reach a key, Hint, Pass or the answer. (Task 4)
2. Skipping (or finishing) a day celebration that owes a pick opens the pick, and the math comes back correctly after the pick. (Task 4)
3. A rotation, a welcome-back greeting or a new answer-time event during a world moment ends it cleanly: math back, Robo back, no stuck `data-world-moment`. (Task 4)
4. A world with no items (first pick not yet placed) keeps every celebration in the strip. (Task 3, 4)
5. The conga-10 on a wide screen and on a phone finishes within the cap and the whole line crosses the screen. (Task 3, 5)

---

### Task 1: One world frame for the pick and the background

**Files:**
- Modify: `src/ui/world/frame.ts`, `src/ui/world/background.ts`, `src/ui/world/pick.ts`, `src/ui/world/world.css`
- Create: `src/ui/world/frame.test.ts`
- Test: `src/ui/world/pick.test.ts`, `src/ui/world/background.test.ts`

**Interfaces:**
- Produces: `STRIP_H = 176` (px, the pick's bottom strip without the safe area), `safeBottom(): number` (px of `env(safe-area-inset-bottom)`, 0 where unsupported, e.g. jsdom), `worldFrame(w: number, h: number): { left: number; top: number; width: number; height: number }`: `fitFrame(w, h - STRIP_H - safeBottom())`, left centred, bottom edge on the strip's top (`top = above - height`). `fitFrame` stays.

- [ ] **Step 1: Write failing tests.** `frame.test.ts`: `worldFrame(810, 1080)` has height 904 (±1) width 678 (±1), left 66 (±1), top 0; landscape `worldFrame(1080, 740)` is width-limited: its bottom equals `740 - STRIP_H`. `pick.test.ts`: with `innerWidth 810, innerHeight 1080` the `[data-role="pick-frame"]` style left/top/width/height equal `worldFrame(810, 1080)` (no use of `offsetHeight`). `background.test.ts`: the background `img` style top and height equal that frame's top and height, and its SVG `viewBox` starts at `-left/(width/270)` (same extent maths as the pick). Add one parity test (same file or `pick.test.ts`) that mounts both for 3 viewports (810x1080, 1080x740, 393x852) and asserts the pick's `.pick-scene` and the background `img` have identical left/top/width/height styles.
- [ ] **Step 2: Run** `npx vitest run src/ui/world` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the three exports in `frame.ts`; `safeBottom()` reads a lazily created hidden probe (`position: fixed; bottom: 0; padding-bottom: env(safe-area-inset-bottom)`) via `getComputedStyle`. Both `layout()` functions call `worldFrame(window.innerWidth, window.innerHeight)`. In `world.css` give `.pick-bottom` the fixed height `calc(176px + env(safe-area-inset-bottom, 0px))` with `box-sizing: border-box`, `justify-content: flex-end`, bottom padding `env(safe-area-inset-bottom, 0px) + 10px` folded in, and `.pick-robo` height 80px (so rows 80 + gap 6 + tray 80 fit in 176 − 10). Remove the `ResizeObserver` on the strip in `pick.ts` (the strip no longer decides the frame); keep the `resize` listener.
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit` — Expected: all pass.
- [ ] **Step 5: Commit** `fix: the pick and the blurred world share one frame, so what she places stays where she put it`.

### Task 2: A sharp twin of the background

**Files:**
- Modify: `src/ui/world/background.ts`, `src/ui/world/world.css`
- Test: `src/ui/world/background.test.ts`

**Interfaces:**
- Consumes: Task 1's frame use inside `layout()`.
- Produces: `createWorldBackground()` returns `{ el, update(items), focus(on: boolean): void, destroy() }`. `el` has a second `<img data-role="world-sharp">` over the blurred one and the attribute `data-focus` while focused (absent otherwise). The sharp picture is unblurred (`sceneSvg(items, { extent })` without `blur`), drawn on the first `focus(true)` and redrawn by `update()`/`layout()` only while focused or once drawn.

- [ ] **Step 1: Write failing tests:** `focus(true)` sets `data-focus` and the sharp img `src` decodes to an SVG that contains `data-kind="tree"` and NOT `feGaussianBlur`; `focus(false)` removes `data-focus`; `update()` with a new item while focused redraws the sharp picture; the blurred img still has `feGaussianBlur stdDeviation="2"`; the css has `.world-bg[data-focus] .world-veil` hidden (opacity 0) and no `filter: blur`.
- [ ] **Step 2: Run** `npx vitest run src/ui/world/background.test.ts` — Expected: FAIL (`focus` is not a function).
- [ ] **Step 3: Implement.** Both pictures share the same layout styles. CSS: the sharp img `opacity: 0` and `.world-bg[data-focus]` makes it `opacity: 1`, the blurred one `opacity: 0`, veil `opacity: 0`, each with `transition: opacity 0.5s` (opacity only; `will-change: transform` stays on both pictures).
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit` — Expected: pass.
- [ ] **Step 5: Commit** `feat: the world background can come into focus (a sharp twin that fades in)`.

### Task 3: Which moments play in the world, and where Robo stands

**Files:**
- Create: `src/ui/world/moment.ts`, `src/ui/world/moment.test.ts`
- Modify: `src/ui/robo/robo.ts` (`MomentPlace.maxMs?: number`), `src/ui/robo/scenes.ts` (`congaMs`, conga builder)
- Test: `src/ui/robo/scenes.test.ts`

**Interfaces:**
- Produces in `moment.ts`: `WORLD_LANE_H = 0.34` (lane height as a fraction of the screen height), `WORLD_FEET_Y = 330` (world y of Robo's feet), `WORLD_MAX_MS = 6000`, `isWorldMoment(big: BigMoment, items: number): boolean`, `worldMomentPlace(w: number, h: number): MomentPlace`: `mode 'standing'`, `spot null`, `size = round(h * WORLD_LANE_H)`, `laneTop = frame.top + frame.height * WORLD_FEET_Y / 360 - size` (frame = `worldFrame(w, h)`), `viewportWidth = w`, `maxMs = WORLD_MAX_MS`, `peek` and `wordsAt` filled with zeros (unused in standing mode).
- Changes: `congaMs(robots: number, viewportWidth: number, robotW = ROBO_W): number` computes with `congaLength(robots, robotW)`; the conga builder passes `Math.max(ROBO_W, ROBO_W * at.size / ROBO_H)` and clamps its result to `at.maxMs ?? Infinity`. Strip behavior is unchanged (strip robots are never bigger than `ROBO_W`).

- [ ] **Step 1: Write failing tests.** `moment.test.ts`: `isWorldMoment` is true for `stars`, `conga`, `day` with 1+ items; false with 0 items; false for `levelUp` and `kick`. `worldMomentPlace(810, 1080)`: size 367, `laneTop + size` equals `frame.top + frame.height * 330 / 360` (±1), `maxMs` 6000. `worldMomentPlace(852, 393)` has `laneTop >= 0`. `scenes.test.ts`: `congaMs(10, 810, 302)` is greater than `congaMs(10, 810)`; building the conga with `maxMs: 6000` and 10 robots returns `ms <= 6000`; with no `maxMs` the strip's value is unchanged (existing tests stay green).
- [ ] **Step 2: Run** `npx vitest run src/ui` — Expected: new tests FAIL.
- [ ] **Step 3: Implement** as specified above.
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit` — Expected: pass.
- [ ] **Step 5: Commit** `feat: world moments know where Robo stands and how long a conga may take`.

### Task 4: The slide-away, the » button and the app wiring

**Files:**
- Modify: `src/ui/app.ts`, `src/ui/world/world.css`
- Test: `src/ui/app.test.ts` (inside `describe("Robo's world")`, using its `base`/`owed` fixtures and the `roboRng` option the existing moment tests use)

**Interfaces:**
- Consumes: `worldMomentPlace`, `isWorldMoment`, `bg.focus`, `robo.play(big, at)`.
- Produces: exported `WORLD_DELAY_MS = 600` (her answer's tick shows first) and `SLIDE_MS = 500` in `app.ts`. While a world moment runs: `appEl` has `data-world-moment` (`""` while sliding/playing); a `[data-role="world-skip"]` button (class `world-skip`, text "»", `aria-label="Skip"`) is in `root`, shown only then. Timeline: delay → slide (and `bg.focus(true)`, standing Robo hidden) → `robo.play()` for its `ms` → `endMoment()`.

- [ ] **Step 1: Write failing tests.**
  - `'a 20-star celebration with a world slides the math away, plays in the world, then the math comes back'`: after the answer and `advance(WORLD_DELAY_MS)` `data-world-moment` is set, the world-bg has `data-focus`, `[data-moment]` exists in `[data-role="robo-moment"]`; after `advance(SLIDE_MS + ms)` the attribute and focus are gone, skip is hidden, `measureRobo`'s standing Robo is back.
  - same for the 100s conga and the day streak (day tiers: a `wave` day with items).
  - `'with no items in the world the celebration plays in the strip as before'` (no `data-world-moment`, no `data-focus`).
  - `'level-ups and the unlock kick stay in the strip'`.
  - `'the » button ends it at once and the math is back'`; `'a tap on the pad area and on the world does nothing'` (attribute stays; `world-skip` is the only thing that ends it).
  - Review Focus 1: during the moment a `pointerdown` on `[data-key="5"]`, Hint, Pass, and a `keydown` of `5` change nothing (answer text identical; saved progress count identical).
  - Review Focus 2: a day celebration that owes a pick: skipping it opens the pick (one `[data-role="pick"]`), `data-world-moment` is cleared under it, and after the pick closes the math is interactive (`actionsReadyAt` guard applies).
  - Review Focus 3: `window.dispatchEvent(new Event('resize'))` after changing `innerWidth` ends it immediately (attribute gone, Robo back, no timers pending: `advance(10000)` throws nothing); a `visibilitychange` greeting (`greet()`) does not start while one runs.
  - her typed digits (type `4`, then trigger the celebration through the next answer path) are still in the answer row when the math returns (`answerText` before = after).
  - css assertions on `world.css`: under `@media (prefers-reduced-motion: reduce)` the `data-world-moment` rules use `opacity` and no `transform`; `.world-skip` has `min-width: 44px; min-height: 44px`; no `filter: blur`.
- [ ] **Step 2: Run** `npx vitest run src/ui/app.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement in `app.ts`.** `playMoment(big)` routes to `playWorldMoment(big)` when `isWorldMoment(big, progress.world.items.length)`; the existing `pickPending` hand-off in `cheer()` stays. A local `worldMoment` flag. `playWorldMoment`: `endMoment()`, then one `later()` chain (delay, then slide, then play, then end) stored in `momentTimer` so `endMoment()` cancels it. `endMoment()` gains a first step: if `worldMoment`, clear the attribute, `bg.focus(false)`, hide skip, `robo.endMoment()`, and `measureRobo()`; if a pick is pending open it first (`startPick()`), so the math un-slides under the pick. Guard `onPointerDown` (only the skip button is handled while `worldMoment`) and `onKeyDown`; add `worldMoment` to `greet()`'s early-return; `measureRobo()` ends a world moment (re-slide instantly: add `data-snap` on `appEl` for that one frame so there is no transition before re-measuring). CSS in `world.css`: `.app[data-world-moment]` moves `.topbar` and `.stage` up (`translateY(-120%)`) and `.controls` down (`translateY(120%)`) with `transition: transform 0.5s ease-in-out`, `pointer-events: none` on all three, `visibility: hidden` after the transition is unnecessary (off-screen); `.world-skip` is `position: fixed` top right with the safe-area offset, 44 px minimum, `rgba(255,255,255,.55)`, above the moment layer (`z-index: 6`), `pointer-events: auto`. Reduce Motion: no transform, `opacity: 0` with the same 0.5 s transition.
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit` — Expected: all pass.
- [ ] **Step 5: Commit** `feat: celebrations play in her world (the math slides away; » skips)`.

### Task 5: Layout check, Reduce Motion and notes

**Files:**
- Modify: `.context/playwright/shots.mjs`, `.context/running.md`, `.context/wip.md`, `.context/decisions.md`

- [ ] **Step 1: Extend `shots.mjs`** (world flow, views `ipad102-p`, `ipad102-p-tab`, `ipad102-l-tab`, `ip15`): (a) frame parity: record the pick's `.pick-scene` rect, place something, wait for close, assert the background img rect equals it within 1px, and the placed item's centre is where it was tapped (±2px); (b) world celebrations: fixture total 19 (a 20-star celebration), then 99 with `?roboRng` forcing the conga (total 99 and 899 as the existing check does), day 7: after `answerNow`, `WORLD_DELAY_MS + SLIDE_MS` later the problem's bottom is above the top and the controls' top is below the viewport; the world is sharp (`[data-focus]`); the scene's `[data-moment]` is right; Robo's biggest slot is at least 0.2 of the screen's height; every `.robo-slot` and `.robo-words` box stays inside the viewport at 40% and 70% of the moment (a conga may start outside and cross; check it is fully off by the end and the moment lasts at most 6.2 s); the skip button is at least 44 x 44 inside the top-right 120 px and a tap in the middle of the screen does not end it; tapping skip brings the layout boxes back identical (±1px, `layoutBoxes`) within 1 s and the typed digits are unchanged. (c) `RM=1`: no stage/controls transform while it plays.
- [ ] **Step 2: Run** `WORLD_ONLY=1 node shots.mjs` and `RM=1 WORLD_ONLY=1 node shots.mjs` per `.context/running.md` (start the dev server first, never `pkill -f` with its own text). Expected: no failures except the known `se-tab cell 31<38`. Look at the screenshots of one celebration on the iPad for obvious problems (Robo standing on the ground in front of her things, words readable).
- [ ] **Step 3: Update notes:** `running.md` (the new checks and `WORLD_ONLY`), `wip.md` (release 2 state, the on-iPad checks: slide smoothness over the blurred world, scene placement at the bigger size, the » being hard to hit by accident, the pick/background now matching), `decisions.md` (one shared frame, the pick's, over the full-window option; `WORLD_DELAY_MS` so she sees her tick; scaling not redrawing). Update the memory file `math-app-state.md`.
- [ ] **Step 4: Commit** `test: layout check for world celebrations and the shared frame; notes` (do not push: she tries it on dev first, only on the user's say-so).

## Self-review notes

- Spec coverage: which moments, slide, Robo size (lane 34% of height), » skip, state kept, Reduce Motion, rotation, picks hand-off, non-goals (no panning) are in Tasks 3-5; the shared frame (decided after the spec) is Task 1.
- My calls to flag: `WORLD_DELAY_MS = 600`, feet at world y 330, lane 34% of the height, conga capped at 6 s (faster walk than the strip's), the pick strip height fixed at 176 + safe area (about 3% smaller world on her iPad than today).
