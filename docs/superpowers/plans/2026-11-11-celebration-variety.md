# Celebration Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Level-ups and 20-star milestones play one of several celebrations picked at random (never the same twice
in a row per group); every 100 stars plays a conga line that grows by one robot per hundred (2 → 10) with coloured
lights.

**Architecture:** `decideRobo` (core) picks the celebration with `roboRng` and returns it in the `BigMoment`
(`levelUp` / `stars` / `conga`). The view gets a new `scenes.ts` with one builder per celebration, built from shared
pieces moved out of `robo.ts`, with moves in a new `scenes.css`. Tall scenes draw their actors smaller (a per-scene
"room" factor) so nothing leaves the lane. A dev-only `?roboRng=` URL value lets the layout check force a pick.

**Tech Stack:** TypeScript, vanilla DOM + SVG/CSS animation, Vite PWA, vitest (+ jsdom), Playwright layout check.

**Spec:** `docs/superpowers/specs/2026-11-11-celebration-variety-design.md` (mockups:
`docs/superpowers/mockups/2026-11-11-celebrations/celebrations-v3.html`, `ideas-v2.html` — their keyframes and
scene builders are the starting point for each scene's moves).

## Global Constraints

- Run tools with `PATH="$HOME/.asdf/shims:$PATH"`. `sed -i` fails on /workspace — use the Edit tool or node.
- Level-up styles and words (order fixed, ids are also the scene's `data-moment`):
  `high-five` "High five!", `jump-together` "Level up!", `pass` "Nice pass!", `dance` "You leveled up!",
  `tower` "Level up!", `keepy-uppy` "Level up!", `light-show` "Level up!", `header` "Goal! Level up!",
  `cartwheel` "Wheee! Level up!".
- 20-star styles (order fixed): `walk`, `walk-friend`, `dribble`, `hop`, `stop-wave`, `ball-ride`, `cartwheel`;
  words `walkWords(totalAfter)` = "You've gotten N questions right! Keep going!".
- 100s: `conga`, robots = `min(10, milestone / 100 + 1)` from the **earned** milestone; words `walkWords(totalAfter)`.
- Never the same style twice in a row within a group; memory in `RoboMemory` (in memory only).
- Conga lights, friends 1–9 in this order (light / glow / rays): yellow `#f5c400 #fff0a8 #c99a00`, blue
  `#3d8bff #cfe2ff #1f5fc4`, purple `#a259ff #e6d4ff #7339c4`, orange `#ff9a1f #ffe0b8 #c76a00`, pink
  `#ff6fcf #ffd6f1 #c23d98`, teal `#1fc7b6 #c4f4ef #138c80`, light blue `#6fd3ff #d9f4ff #2f9fcf`, lime
  `#b6e61e #ecfac2 #7fa30f`, lavender `#c9a7ff #f0e6ff #8f6ad1`. Robo leads with green. No red anywhere in a celebration.
- Light show cycles green `#4cd964`, yellow, blue, purple (shades above).
- Nothing in a scene may go above or below the lane (`.robo-scene` box) or over the problem, answer boxes, bubble,
  picture or controls; the overlay takes no taps.
- Reduce Motion: no travelling/jumping/spinning/flying; actors fade in and out in their final pose; props still in
  their final positions; the light show may keep changing colour.
- Unchanged: kick (unlock), day celebration, cooldown 4, priority kick > day > level-up > stars, held-back stars,
  level-ups during cooldown skipped, peek mode = the existing peek with the moment's words.

## Review Focus

1. **A held-back 100 that plays at 104 or after a later 20** — still a conga sized from 100 (2 robots), words say the
   current count. (Test in Task 1.)
2. **Short lane (56px) on a tall scene** — tower/keepy-uppy/header/ball ride/cartwheel stay inside the lane box mid-move.
   (Layout check in Task 6; slot size test in Task 2.)
3. **A refit to the next problem's room mid-celebration** — shrunken actors keep their room factor (not reset to the
   full lane height). (Test in Task 2.)
4. **Rotation mid-conga** — ends like any moment; no stale line. (Layout check in Task 6, existing walk-rotate flow
   run on a conga.)
5. **A long conga under Reduce Motion** — no travelling; the line fades in centred, fitting the screen width
   (robots shrink to fit if needed). (Layout check in Task 6, RM run, conga-10.)

---

### Task 1: Robo picks the celebration

**Files:**
- Modify: `src/core/robo.ts`, `src/ui/robo/robo.ts` (temporary mapping only), `src/ui/robo/preview.ts` (types only)
- Test: `src/core/robo.test.ts`, `src/ui/robo/robo.test.ts` (fixtures only)

**Interfaces:**
- Produces:
  ```ts
  export const LEVEL_UPS = ['high-five','jump-together','pass','dance','tower','keepy-uppy','light-show','header','cartwheel'] as const;
  export type LevelUpStyle = typeof LEVEL_UPS[number];
  export const LEVEL_UP_WORDS: Record<LevelUpStyle, string>;
  export const STAR_STYLES = ['walk','walk-friend','dribble','hop','stop-wave','ball-ride','cartwheel'] as const;
  export type StarStyle = typeof STAR_STYLES[number];
  export const CONGA_MAX = 10;
  export function congaSize(milestone: number): number;            // min(CONGA_MAX, milestone / 100 + 1)
  export function pickStyle<T>(list: readonly T[], last: T | null, rng: Rng): T; // uniform over list minus last; calls rng once
  BigMoment: remove 'highFive' and 'walk'; add
    | { kind: 'levelUp'; style: LevelUpStyle; words: string }
    | { kind: 'stars'; style: StarStyle; words: string }
    | { kind: 'conga'; robots: number; words: string }
  RoboMemory gains lastLevelUp: LevelUpStyle | null, lastStars: StarStyle | null (initial null).
  ```
  `pickStyle`: `choices = list.filter(x => x !== last)`; index `Math.min(choices.length - 1, Math.floor(rng() * choices.length))`.

- [ ] **Step 1: Write the failing tests** in `src/core/robo.test.ts` (rng `never` = 0.99 picks the last choice):
  - `congaSize`: 100→2, 200→3, 800→9, 900→10, 1000→10, 2300→10.
  - `pickStyle(['a','b','c'], null, () => 0)` → 'a'; `(…, 'a', () => 0)` → 'b'; `(…, 'c', () => 0.99)` → 'b'; with `mulberry32(3)`, 3000 picks from `LEVEL_UPS` with `last` = previous pick: never equal to the previous, each style between 9% and 14%.
  - A level-up → `{ kind: 'levelUp', style: 'cartwheel', words: 'Wheee! Level up!' }` with `never`; with `() => 0` → `high-five` / "High five!"; memory `lastLevelUp` is the style; two level-ups (cooldown cleared) never repeat.
  - 40 stars → `{ kind: 'stars', style: 'cartwheel', words: "You've gotten 40 questions right! Keep going!" }` with `never`; `() => 0` → `walk`.
  - 100 stars → `{ kind: 'conga', robots: 2, words: "You've gotten 100 questions right! Keep going!" }`; 900 → robots 10; 1000 → 10.
  - Held-back 100 (reached during cooldown) plays at 104 → `{ kind: 'conga', robots: 2, words: …104… }` (Review Focus 1).
  - `LEVEL_UPS`, `LEVEL_UP_WORDS`, `STAR_STYLES` equal the Global Constraints lists exactly.
  - Update existing tests: `kind: 'highFive'` → `kind: 'levelUp'` (`toMatchObject`), walks → `stars`/`conga`; the "rng not called" test keeps `throws` for the wrong-try line, the unlock and the Pass, and drops the level-up case (a level-up now calls the rng once to pick).

- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/core/robo.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** in `decideRobo`: level-up branch picks `pickStyle(LEVEL_UPS, m.lastLevelUp, rng)`; walk branch: `pendingWalk % 100 === 0` → conga, else `pickStyle(STAR_STYLES, m.lastStars, rng)`. Remove `walk()`. Temporary view mapping in `robo.ts` `standingMoment` so the app keeps working until Task 2: `levelUp` → today's high-five scene (`data-moment="high-five"`) with `big.words`; `stars` → today's walk scene (`walk-friend` when `style === 'walk-friend'`); `conga` → today's walk-friend scene. Update `robo.test.ts`/`preview.ts` fixtures to the new kinds.

- [ ] **Step 4: Run all tests + typecheck** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npx tsc --noEmit` — Expected: PASS (app tests that look for `data-moment="walk"` still pass through the mapping).

- [ ] **Step 5: Commit** — `git commit -am "feat: Robo picks a celebration at random, never the same twice in a row"`

---

### Task 2: Scene module, room factor, conga with coloured lights

**Files:**
- Create: `src/ui/robo/pieces.ts` (moved from `robo.ts`: `div`, `words`, `cheering`, `slot`, `BALL`, plus `ball(cls)`), `src/ui/robo/scenes.ts`, `src/ui/robo/scenes.css`
- Modify: `src/ui/robo/robo.ts`, `src/ui/robo/drawing.ts`
- Test: `src/ui/robo/scenes.test.ts`, `src/ui/robo/robo.test.ts`

**Interfaces:**
- Consumes: Task 1 `BigMoment` variants, `LevelUpStyle`, `StarStyle`.
- Produces:
  ```ts
  // drawing.ts
  export interface LightColours { light: string; glow: string; rays: string }
  export const CONGA_LIGHTS: readonly LightColours[];        // the 9 from Global Constraints, in order
  export function paintLight(f: HTMLElement, c: LightColours): void; // data-light='green' (so glow/rays show) + the three custom properties
  // scenes.ts
  export type SceneMoment = Extract<BigMoment, { kind: 'levelUp' | 'stars' | 'conga' }>;
  export function buildScene(big: SceneMoment, at: MomentPlace): { node: HTMLElement; ms: number };
  export const ROOM: Record<LevelUpStyle | StarStyle | 'conga', number>; // lane heights per actor height (≥ 1)
  export function congaMs(robots: number, viewportWidth: number): number;
  ```
  The scene node is `.robo-scene` with `data-moment="<style or 'conga'>"` and `data-room="<ROOM value>"`.
  `robo.ts` `fit()` sizes each `.robo-slot` to `round(at.size / room)` (room from `data-room`, default 1) and sets
  `--a` = `--s / room` on the scene for CSS offsets. `standingMoment` delegates `levelUp`/`stars`/`conga` to
  `buildScene`; until Tasks 3–4 build them, unbuilt styles fall back to the plain walk (stars) or high five (level-up)
  scene but keep their own `data-moment`. Move today's walk, walk-friend and high-five scenes into `scenes.ts` as the
  `walk`, `walk-friend` and `high-five` builders (their CSS moves to `scenes.css`).
- ROOM starting values (tune in Task 6 against the layout check): `tower` 1.75, `keepy-uppy` 1.5, `header` 1.4,
  `ball-ride` 1.35, `cartwheel` 1.3, `jump-together` 1.25, `hop` 1.25, `pass` 1.2, `dance` 1.1, all others 1.
- `congaMs`: same walking speed as today's 4 s walk across `viewportWidth`: line length = robots × 0.7 robot widths
  spacing + the words; result ≈ 4000 for 2 robots and ≤ 8000 for 10 robots at 810 px.

- [ ] **Step 1: Write the failing tests** (`scenes.test.ts`, jsdom):
  - `CONGA_LIGHTS` has 9 entries equal to the Global Constraints colours, none containing `#ff5a4f`/`#d9362b`.
  - conga with 2 robots → `[data-moment="conga"]`, 2 figures, first has `--robo-light: #4cd964`, second `#f5c400`; with 10 → 10 figures, the 10th `#c9a7ff`; words shown.
  - `congaMs(2, 810)` within 3500–4500; `congaMs(10, 810)` ≤ 8000; increasing in robots.
  - `buildScene({ kind: 'stars', style: 'walk', … })` → `data-moment="walk"`, 1 figure; `walk-friend` → 2; `levelUp high-five` → `high-five`, 2 figures.
  - Room factor: `robo.play({ kind: 'levelUp', style: 'tower', … }, standing)` → slots 78px tall (`round(136 / 1.75)`); `robo.refit({ ...standing, size: 68 })` → slots 39px (Review Focus 3).
  - Update `robo.test.ts` moment tests to the new kinds and names.

- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/ui/robo` — Expected: FAIL.

- [ ] **Step 3: Implement** as above; conga scene: one `.robo-walker`-style line (Robo first, friends flipped, `paintLight` per friend), bobbing + a kick every few steps (mockup `ideas-v2.html` conga), duration `congaMs`. Reduce Motion for walk/walk-friend/high-five/conga as Global Constraints (conga: centred, robots shrink so the line fits `viewportWidth − 32`).

- [ ] **Step 4: Run all tests + typecheck** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npx tsc --noEmit` — Expected: PASS.

- [ ] **Step 5: Commit** — `git add src/ui/robo && git commit -m "feat: celebration scenes module; the 100s conga grows with coloured lights"`

---

### Task 3: The level-up scenes

**Files:**
- Modify: `src/ui/robo/scenes.ts`, `src/ui/robo/scenes.css`, `src/ui/robo/preview.ts`
- Test: `src/ui/robo/scenes.test.ts`

**Interfaces:**
- Consumes: Task 2 `buildScene`, pieces, `ROOM`, `paintLight`.
- Produces: builders for `jump-together`, `pass`, `dance`, `tower`, `keepy-uppy`, `light-show`, `header`, `cartwheel`; each returns its duration (2500–4500 ms).

Scene contents (moves from the mockups; spec "Each celebration"):
`jump-together` Robo + friend arms up, two jumps · `pass` kicker (today's kick classes) + ball rolling to the friend, friend arms up + jump on arrival · `dance` sway, alternating arm swings, little leg kicks · `tower` two friends side by side, Robo runs in and lands standing on their heads, all arms up on landing, words appear then · `keepy-uppy` four foot taps, ball ends on Robo's head, arms up, words appear then · `light-show` sway with the light cycling green/yellow/blue/purple (animate `fill`/`stroke` on light/glow/rays) · `header` friend tosses, Robo nods it into a net (`.robo-goal`, dark outline, light mesh, lane's far side), words appear on the goal · `cartwheel` travels across turning about its middle twice, arms up.

- [ ] **Step 1: Write the failing tests** — for each of the 8 styles: `buildScene({ kind: 'levelUp', style, words: LEVEL_UP_WORDS[style] }, standing)` → `data-moment` is the style; figure count (jump-together 2, pass 2, dance 1, tower 3, keepy-uppy 1, light-show 1, header 2, cartwheel 1); a ball for pass/keepy-uppy/header; `.robo-goal` for header; words element text = `LEVEL_UP_WORDS[style]`; `ms` between 2500 and 4500; no `--robo-light` other than green on any figure except light-show's.
- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/ui/robo/scenes.test.ts` — Expected: FAIL (fallback scenes have the wrong figure counts).
- [ ] **Step 3: Implement** the builders + CSS (with a Reduce Motion block per scene) and preview entries `?moment=<style>` for all 9 level-ups.
- [ ] **Step 4: Run all tests + typecheck** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npx tsc --noEmit` — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: eight new level-up celebrations"`

---

### Task 4: The 20-star scenes

**Files:**
- Modify: `src/ui/robo/scenes.ts`, `src/ui/robo/scenes.css`, `src/ui/robo/preview.ts`
- Test: `src/ui/robo/scenes.test.ts`

**Interfaces:**
- Consumes: Task 2/3 builders (`cartwheel` reused with the count words).
- Produces: builders for `dribble`, `hop`, `stop-wave`, `ball-ride` (`walk`, `walk-friend` from Task 2, `cartwheel` from Task 3).

Scene contents: `dribble` walking with the ball rolling ahead · `hop` bouncing across, arms up · `stop-wave` walks to the middle, **legs still while it stops**, waves, walks on (mockup `celebrations-v3.html` m-legs keyframes) · `ball-ride` Robo, arms up and swaying, on a big ball rolling across.

- [ ] **Step 1: Write the failing tests** — for each of the 7 star styles: `data-moment` is the style; 1 figure (walk-friend 2); a ball for dribble/ball-ride; words = the given count words; `ms` 3500–5000.
- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/ui/robo/scenes.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** builders + CSS (Reduce Motion per scene) + preview entries `?moment=stars-<style>` and `?moment=conga-2|conga-5|conga-10`. Remove the Task 2 fallback (every style now has a scene).
- [ ] **Step 4: Run all tests + typecheck** — same command — Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat: six 20-star celebrations (and the cartwheel)"`

---

### Task 5: App wiring and a dev hook to force a pick

**Files:**
- Modify: `src/main.ts`, `src/ui/app.test.ts`

**Interfaces:**
- Produces: in dev builds only (`import.meta.env.DEV`), `main.ts` reads `?roboRng=<number in [0,1)>` and passes `roboRng: () => value` to `mountApp`. A pick of style k from a group of n (fresh memory) uses value `(k + 0.5) / n`. Production builds ignore it.

- [ ] **Step 1: Write the failing tests** (`app.test.ts`, standing): with `roboRng: () => 0`, reaching 40 stars plays `[data-moment="walk"]`, a division level-up plays `[data-moment="high-five"]`; with default `0.99`, 40 stars plays `[data-moment="cartwheel"]` with the count words; 99 → 100 plays `[data-moment="conga"]` with 2 figures. Update existing app tests that relied on `walk`/`high-five` names under `0.99`.
- [ ] **Step 2: Run to verify they fail** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/ui/app.test.ts` — Expected: FAIL only where the old names are assumed (if all pass already, the wiring from Tasks 1–4 is complete: record that and continue).
- [ ] **Step 3: Implement** the `main.ts` dev hook; fix tests.
- [ ] **Step 4: Run everything** — `PATH="$HOME/.asdf/shims:$PATH" npx vitest run && PATH="$HOME/.asdf/shims:$PATH" npm run build && grep -l "'roboRng'\|\"roboRng\"" dist/assets/*.js` — Expected: tests PASS, build OK, and grep finds no file (the dev-only URL read is stripped from the production bundle).
- [ ] **Step 5: Commit** — `git commit -am "feat: dev-only ?roboRng to force Robo's pick for layout checks"`

---

### Task 6: Layout check every celebration

**Files:**
- Modify: `.context/playwright/shots.mjs`, `.context/running.md`; `src/ui/robo/scenes.ts` (ROOM tuning only, if the check demands)

- [ ] **Step 1: Extend `momentCheck`**: parts = `.robo-slot, .robo-words, .robo-fireworks, .robo-ball, .robo-goal` inside the moment layer; also fail `moment outside lane` when any part's box leaves the `.robo-scene` box by more than 1px (Review Focus 2).
- [ ] **Step 2: Add flows per view**: each level-up style (division level-up fixture, URL `?roboRng=(k+0.5)/9`), each star style (40th-star fixture, `(k+0.5)/7`), conga-2 (total 99), conga-10 (total 899); `momentCheck` at ~40% and ~70% of each scene's duration; the walk-rotate check also on conga-10 (Review Focus 4); `data-moment` equals the expected style.
- [ ] **Step 3: Run** (dev server per running.md) `ROBO_ONLY=1 node shots.mjs` and `ROBO_ONLY=1 RM=1 node shots.mjs` — Expected: only se-tab `cell 31<38`. Tune `ROOM` values (Task 2) until no `moment outside lane`; rerun. Then the full `node shots.mjs` once. Look at her iPad screenshots (`ipad102-p-tab`) for tower, header, keepy-uppy, conga-10, stop-wave.
- [ ] **Step 4: Note** the new flows, `?roboRng`, and preview moments in `.context/running.md`.
- [ ] **Step 5: Commit** — `git add .context src/ui/robo/scenes.ts && git commit -m "test: layout checks cover every celebration"`
