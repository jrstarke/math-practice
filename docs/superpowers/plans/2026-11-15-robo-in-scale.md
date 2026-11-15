# Robo at the world's scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In a world celebration Robo is house-door-sized and obeys depth (nearer items stand in front of him), instead of being 34% of the screen tall.

**Architecture:** A pure `chooseSpot` picks where he stands from her placed items. `MomentPlace` gains `robotH` (the height of one robot in px) and `centerX`, so the existing scene builders draw small robots. A transparent "front" picture, holding only the items nearer than his feet, is drawn above the scene so those items cover him. A sparkle burst keeps the show big.

**Tech Stack:** vanilla TypeScript, Vite, Vitest (jsdom), `shots.mjs` (Playwright layout check).

**Spec:** `docs/superpowers/specs/2026-11-15-robo-in-scale-design.md`

## Global Constraints

- Robo's height is `ROBO_WORLD_H * depthScale(feetY)` world units, `ROBO_WORLD_H = 24`; the house door is `HOUSE_DOOR_H = 28` tall at scale 1. Robo is always smaller than a door at the same depth.
- World to px: `px = frame.width / AREA_W` per unit, `frame = worldFrame(w, h)` (src/ui/world/frame.ts).
- Only opacity/transform animations, no live blur (existing rule). Under Reduce Motion nothing slides or bursts; things fade.
- Level-ups and the kick stay in the strip with today's sizes (`isWorldMoment` unchanged).
- Keep: slide-away, » skip, `WORLD_MAX_MS = 6000`, 400 ms tap guard after a celebration, one shared frame.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Never push; the user approves pushes.

## Review Focus

- A house at the very bottom edge (y=360): Robo's feet are clear of it and it is at most a nearer-item cover, never under his whole body (Task 2 test).
- A world with no free ground (items everywhere): `chooseSpot` still returns a finite spot inside the ground zone (Task 2 test).
- Phone landscape (852x393): robot height stays at least 20px, the layer stays on screen (Task 3 test).
- Items exactly at Robo's feet y: they are NOT in the front layer (they are behind or beside him) (Task 4 test).
- Reduce Motion: sparkles do not move, they fade (Task 5 test).

---

### Task 1: Door-sized houses and Robo's world height

**Files:**
- Modify: `src/core/world.ts` (add constants), `src/ui/world/kinds.ts:14` (house art)
- Test: `src/core/world.test.ts`, `src/ui/world/scene.test.ts`

**Interfaces:**
- Produces: `export const ROBO_WORLD_H = 24` and `export const HOUSE_DOOR_H = 28` in `src/core/world.ts`; `export const robotUnits = (feetY: number): number` returning `ROBO_WORLD_H * depthScale(feetY)`.

- [ ] **Step 1: Write failing tests** in `src/core/world.test.ts`: `ROBO_WORLD_H < HOUSE_DOOR_H`; `robotUnits(HORIZON_Y)` equals `24 * 0.4`; `robotUnits(AREA_H)` equals `24 * depthScale(AREA_H)`; and `robotUnits(y) < HOUSE_DOOR_H * depthScale(y)` for y in 110, 200, 300, 360. In `scene.test.ts`: `drawKind('house', 0, 0, 1)` contains a door `<rect` whose `height="28"`.
- [ ] **Step 2: Run** `npx vitest run src/core/world.test.ts src/ui/world/scene.test.ts`; expect FAIL (missing exports, door height 16).
- [ ] **Step 3: Implement** the constants/helper in `world.ts`, and redraw the `house` shape in `kinds.ts`: body 48 wide x 38 tall, roof to y=-64, door 18 wide x 28 tall with rounded corners (`rx="3"`) and a small knob; same fills and `S` stroke as today.
- [ ] **Step 4: Run** the same command; expect PASS. Then `npx vitest run` (all) to see nothing else assumed the old house art.
- [ ] **Step 5: Commit** `feat: houses get a roomier door; Robo's height in the world is defined by depth`.

### Task 2: Choosing where Robo stands

**Files:**
- Create: `src/ui/world/spot.ts`
- Test: `src/ui/world/spot.test.ts`

**Interfaces:**
- Consumes: `WorldItem`, `AREA_W`, `AREA_H`, `HORIZON_Y` (src/core/world.ts), `zoneOf('house')`.
- Produces: `export function chooseSpot(items: readonly WorldItem[]): { x: number; y: number }` (world units: his feet), and `export function chooseLaneY(items: readonly WorldItem[]): number` (the feet y of the clearest horizontal band, for the conga).

- [ ] **Step 1: Write failing tests** (name each): `no items -> x within 100..170 and y >= 260`; `a house at (150,350) -> the spot is not within the house's footprint (|dx| >= 24+14 or |dy| >= 20)`; `a house at the very bottom (y=360) -> spot.y < 360 or |dx| >= 38`; `the spot is always inside the ground zone` over 30 pseudo-random worlds (seeded, 0..20 items of any kind); `a full world (items on a 20-unit grid across the ground) -> finite x and y inside the zone`; `mountains are ignored (a world of only mountains behaves like an empty one)`; `chooseLaneY returns a y in 200..345, and with a house at (150,300) it is not within 20 of 300`.
- [ ] **Step 2: Run** `npx vitest run src/ui/world/spot.test.ts`; expect FAIL (module missing).
- [ ] **Step 3: Implement** `chooseSpot`: scan a grid (step 10 in x over 40..230, step 10 in y over 200..345); score = `min(clear, 60) + 0.05 * y` where `clear` is the minimum over non-mountain items of `hypot(dx, 1.5 * dy) - halfWidth(kind) * itemScale` (halfWidths: house 26, tree 20, bush 22, lake 42); no items scores by y and centrality only; ties go to the point nearest x=135. `chooseLaneY`: for y in 200..345 step 5 score = number of items whose footprint reaches y (`|item.y - y| < 20`), choose the lowest count, ties to the larger y.
- [ ] **Step 4: Run** the test; expect PASS.
- [ ] **Step 5: Commit** `feat: Robo stands in the emptiest patch of her ground`.

### Task 3: Small robots in a world moment

**Files:**
- Modify: `src/ui/robo/robo.ts` (`MomentPlace`, `fit`), `src/ui/robo/scenes.ts:conga` (robot width), `src/ui/world/moment.ts`
- Test: `src/ui/robo/robo.test.ts`, `src/ui/robo/scenes.test.ts`, `src/ui/world/moment.test.ts`

**Interfaces:**
- Consumes: `chooseSpot`, `chooseLaneY` (Task 2), `robotUnits` (Task 1), `worldFrame`.
- Produces: `MomentPlace` gains optional `robotH?: number` (height of one robot, px) and `centerX?: number` (px; stay scenes and the day scene centre here; travelling scenes still cross the full width). `export type WorldMomentPlace = MomentPlace & { feetY: number }` and `export function worldMomentPlace(w: number, h: number, items: readonly WorldItem[], big: BigMoment): WorldMomentPlace` where `feetY` is the world y of his feet (conga: `chooseLaneY`, otherwise `chooseSpot().y`, and `centerX` from `chooseSpot().x`). Removes `WORLD_LANE_H` and `WORLD_FEET_Y`.

- [ ] **Step 1: Write failing tests.** `moment.test.ts`: `a house at the bottom -> robotH is less than the house's door height in px at that depth` (door px = `28 * itemScale * frame.width / 270`); `robotH equals Math.round(robotUnits(feetY) * frame.width / 270)`; `laneTop + size equals the frame y of feetY` (feet on the ground); `phone landscape 852x393 -> robotH >= 20 and the lane is inside the screen`; `conga uses chooseLaneY, stars use chooseSpot` (feetY differs for a world where they differ). `robo.test.ts`: playing a moment with `robotH: 40` makes every `.robo-slot` 40/room px tall, sets `--a` to `40/ROBO_H` and the layer height to `40 * room`. `scenes.test.ts`: a conga with `robotH: 30` is shorter in `ms` than with `robotH` unset and never longer than `maxMs`.
- [ ] **Step 2: Run** `npx vitest run src/ui/world/moment.test.ts src/ui/robo`; expect FAIL.
- [ ] **Step 3: Implement.** In `fit()` use `robot = at.robotH ?? Math.round(at.size / room)` for slot sizes and `--a`, layer height `at.robotH ? Math.round(robot * room) : at.size`, `--s` from the layer height; when `centerX` is set and the scene is `.robo-stay` or `day`, position the scene's box so its centre is at `centerX` (read scenes.css for how `left: 50%` is anchored; clamp inside the viewport). In `scenes.ts conga` use `ROBO_W * at.robotH / ROBO_H` as the robot width when `robotH` is set, else the current rule. Rewrite `worldMomentPlace` as above.
- [ ] **Step 4: Run** the same command plus `npx tsc --noEmit`; expect PASS. `app.ts` calls `worldMomentPlace(w, h)`: update it to pass `progress.world.items` and `big`, and keep the returned `feetY` for Task 4.
- [ ] **Step 5: Commit** `feat: world celebrations draw Robo and his friends small, at the depth he stands`.

### Task 4: Nearer things stand in front of Robo

**Files:**
- Modify: `src/ui/world/scene.ts` (add `frontSvg`), `src/ui/world/world.css`, `src/ui/app.ts` (create, show, hide)
- Create: `src/ui/world/front.ts`
- Test: `src/ui/world/scene.test.ts`, `src/ui/world/front.test.ts`

**Interfaces:**
- Consumes: `WorldMomentPlace.feetY` (Task 3), `sceneExtent`, `worldFrame`.
- Produces: `export function frontSvg(items: WorldItem[], feetY: number, opts: { extent: { x0: number; x1: number } }): string` (only items with `y > feetY`, non-mountain, same `drawKind`/`itemScale` and viewBox as `sceneSvg`, no sky or ground); `export function createWorldFront(): { el: HTMLElement; show(items: WorldItem[], feetY: number): void; hide(): void; destroy(): void }` (an `<img data-role="world-front">`, fixed, pointer-events none, positioned like `.world-sharp`, hidden until `show`).

- [ ] **Step 1: Write failing tests.** `scene.test.ts`: `frontSvg` contains items nearer than `feetY` and not one at `y === feetY` or farther; it has no sky/ground rect; an empty result still returns a valid svg. `front.test.ts`: `show` sets a data-URI `src`, un-hides; `hide` hides; the image box equals the sharp twin's (same left/top/width/height as `createWorldBackground`'s `.world-sharp` for one window size).
- [ ] **Step 2: Run** `npx vitest run src/ui/world`; expect FAIL.
- [ ] **Step 3: Implement** both; in `app.ts` add `front.el` to `root` after `appEl` and before `skipBtn` so it draws above the Robo overlay but under the », call `front.show(progress.world.items, place.feetY)` when the scene starts in `playWorldMoment`, and `front.hide()` in `endMoment()` and on resize (where the moment already ends). CSS: `.world-front { position: fixed; z-index: 5; pointer-events: none; }` (check the Robo overlay's z-index and put this above it, below `.world-skip` z 6).
- [ ] **Step 4: Run** `npx vitest run`; `npx tsc --noEmit`; expect PASS.
- [ ] **Step 5: Commit** `feat: things nearer than Robo stand in front of him`.

### Task 5: A sparkle burst so a small Robo still has a party

**Files:**
- Create: `src/ui/world/sparkles.ts`
- Modify: `src/ui/world/world.css`, `src/ui/app.ts`
- Test: `src/ui/world/sparkles.test.ts`

**Interfaces:**
- Consumes: the `WorldMomentPlace` (Task 3: `centerX`, `laneTop`, `robotH`, `size`, `maxMs`).
- Produces: `export function createSparkles(): { el: HTMLElement; play(at: { x: number; y: number; r: number }, ms: number): void; stop(): void }`: 10 small inline-SVG stars placed on a circle of radius `r` px around `(x, y)`, each fading and rising by opacity/transform CSS only, for `ms`.

- [ ] **Step 1: Write failing tests**: `play` adds 10 stars within `r` of `(x, y)`; `stop` removes them; under Reduce Motion (`matchMedia('(prefers-reduced-motion: reduce)')` mocked true) the stars have `data-still` and no animation class; `r` is `3 * robotH` as called by app (assert in a small app-level helper if it exists, else in `sparkles.test.ts` with the helper `sparkleCircle(place)` exported from the same file returning `{ x: centerX, y: laneTop + size - robotH / 2, r: 3 * robotH }`).
- [ ] **Step 2: Run** `npx vitest run src/ui/world/sparkles.test.ts`; expect FAIL.
- [ ] **Step 3: Implement** `sparkles.ts` and the CSS (`@keyframes` using opacity and transform only; a `@media (prefers-reduced-motion: reduce)` rule turns movement off and just fades). In `app.ts` play the sparkles right after `robo.play` in `playWorldMoment` (for ms = the returned ms) and stop them in `endMoment()`. Put the sparkle layer between the Robo overlay and the front picture.
- [ ] **Step 4: Run** `npx vitest run`; `npx tsc --noEmit`; expect PASS.
- [ ] **Step 5: Commit** `feat: a sparkle burst around the small Robo`.

### Task 6: Layout check, notes, and the review

**Files:**
- Modify: `shots.mjs` (world flow), `.context/wip.md`, `.context/decisions.md`
- Test: `WORLD_ONLY=1 node shots.mjs`

- [ ] **Step 1:** Extend the world flow in `shots.mjs` (see `.context/running.md` for how it runs): add three worlds (empty-ish with one tree, a house at the very bottom, a crowded one), and for each of stars, conga and day on iPad portrait, iPad landscape and phone landscape assert: Robo's box is inside the viewport, `robotH` is less than the nearest house's door in px, and for the bottom-house world Robo's box does not overlap the house's box by more than its front-layer cover.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx vitest run && WORLD_ONLY=1 node shots.mjs`; expect no failures and all views pass; open the shots for the bottom-house world and look at them yourself.
- [ ] **Step 3:** Update `.context/wip.md` (RESUME HERE: this release is built on `feat/robo-in-scale`, not pushed; list what the user should check on the iPad: Robo's size beside a door, a house covering his legs, the sparkle burst, the conga's path) and `.context/decisions.md` (door 28, Robo 24, roam only for the conga, no camera follow, front picture instead of splitting the background).
- [ ] **Step 4: Commit** `docs: notes and layout check for Robo at the world's scale`.
