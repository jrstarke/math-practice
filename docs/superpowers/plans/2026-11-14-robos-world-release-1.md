# Robo's World, Release 1 (her first pick) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the answer that completes her 5th practised day (and every 5th after), a pick opens: three random kinds, she chooses, taps where it goes (zones dim), presses OK, Robo cheers; the world then sits blurred behind the math under a white card.

**Architecture:** Pure rules in `src/core/world.ts` (kinds, zones, offers, cheer lines, saved state) and a pick flag in `decideRobo`. Drawing and views in `src/ui/world/` (SVG scene string builder, pick overlay, blurred background). `app.ts` only wires them. Saved progress becomes v9 with a `world` record.

**Tech Stack:** TypeScript, Vite, vanilla DOM (`el()` from `src/ui/dom.ts`), vitest (+ jsdom), Playwright layout check in `.context/playwright/`.

**Spec:** `docs/superpowers/specs/2026-11-11-robos-world-design.md` (release 1 only: one area, no panning, celebrations stay in the strip, the pick covers the app instead of sliding the math away).

## Global Constraints

- Area is 270 wide by 360 tall (3:4). Horizon at y=90 (25% down). Ground is the bottom three quarters.
- Kinds: `tree`, `bush`, `mountain`, `lake`, `house`. Offer = 3 distinct kinds, chosen with `roboRng`.
- Pick when `day.practised` reaches a multiple of 5 on the completing answer: `picksOwed = floor(day.practised / 5) - picksUsed`.
- Colours: sky gradient `#bfe6ff` (top) to `#eaf7ff` (horizon); ground `#d8efc4`; lake `#9fd4f2`; outlines `#2b2b2b` 3px rounded; far hills `#c4e3ad` / `#b5dc9c`; mountains `#b9b3d6` with white snow caps; sun `#ffe27a`.
- Behind the math: baked blur `feGaussianBlur stdDeviation="2"` inside an SVG `<img>` on its own layer (`will-change: transform`); card `rgba(255,255,255,.92)`, radius, `box-shadow: 0 3px 0 var(--key-shadow)`; veil `rgba(255,248,236,.15)`. Never a live CSS `filter: blur()`.
- Nothing in the world moves behind the math. Never take taps meant for the problem, keys or buttons.
- Placed items are permanent. An unfinished pick (the offer) is saved and reopens on her next right answer.
- Cheer lines (never the same twice in a row): "That's awesome!", "That looks great!", "Cool!", "It's perfect!", "I love it!", "Wow!".
- Pick prompt: `"${days} days of math! Let's add something to our world!"`, then `"Tap where it goes!"` after she chooses.
- Safari/iPadOS 18 target; respect `prefers-reduced-motion` (no fades).
- Progress key `math-practice-progress-v9`; older keys read once, never written.

## Review Focus

1. A Pass on the answer that would complete a day: no pick (Pass never counts the day). Pinned in Task 3.
2. Reload mid-pick: the same offer reopens after her next right answer, not a new random one. Pinned in Task 6.
3. Two picks owed (e.g. `practised` 10, `picksUsed` 0): they open one per right answer, not both at once. Pinned in Task 3 and 6.
4. Keys pressed (keyboard) or taps on the pad while the pick is open must not reach the problem. Pinned in Task 6.
5. A tap on a dimmed zone, or outside the frame, does nothing and keeps the ghost where it was. Pinned in Task 2 and 5.
6. Rotation while the pick is open: it stays open and re-lays out; a saved offer with a corrupt kind falls back to a fresh offer. Pinned in Task 5 and 1.

---

### Task 1: World rules and saved state (core + progress v9)

**Files:**
- Create: `src/core/world.ts`, `src/core/world.test.ts`
- Modify: `src/core/progress.ts` (version 9, `world` field, `defaultProgress`), `src/storage.ts` (v9 key, `upgradeV8`, `isValidWorld`, load chain), `src/storage.test.ts`
- Modify: `.context/playwright/shots.mjs` fixtures `version: 8` to v9 with `world` (26 occurrences across src + shots; fix every test fixture the compiler flags)

**Interfaces:**
- Produces in `src/core/world.ts`:
  - `export const AREA_W = 270, AREA_H = 360, HORIZON_Y = 90, PICK_EVERY = 5;`
  - `export const KINDS = ['tree','bush','mountain','lake','house'] as const; export type WorldKind = (typeof KINDS)[number];`
  - `export interface WorldItem { kind: WorldKind; area: number; x: number; y: number }` (`area` is always 0 in release 1; x in 0..AREA_W, y in HORIZON_Y..AREA_H)
  - `export interface WorldState { items: WorldItem[]; picksUsed: number; offer: WorldKind[] | null }`
  - `export const initialWorld = (): WorldState` (empty, 0, null)
  - `export function picksOwed(practised: number, w: WorldState): number`
  - `export function makeOffer(rng: Rng): WorldKind[]` (3 distinct, partial Fisher-Yates calling `rng` 3 times)
  - `export function placeItem(w: WorldState, item: WorldItem): WorldState` (appends, `picksUsed + 1`, `offer: null`)
  - `export function isValidWorld(x: unknown): x is WorldState` (kinds known, area 0 for now accepted as any int >= 0, x/y in range, mountains at y === HORIZON_Y, offer null or 3 distinct kinds, picksUsed int >= 0)
- Produces in `progress.ts`: `Progress.version: 9`, `Progress.world: WorldState`.
- Produces in `storage.ts`: `STORAGE_KEY = 'math-practice-progress-v9'`, `V8_STORAGE_KEY = 'math-practice-progress-v8'`.

- [ ] **Step 1: Write failing tests** in `world.test.ts`: `picksOwed(4, empty) === 0`, `picksOwed(5, empty) === 1`, `picksOwed(10, {picksUsed:1}) === 1`, `picksOwed(9, {picksUsed:1}) === 0`; `makeOffer(mulberry32(n))` over seeds 1..200 always returns 3 distinct valid kinds and every kind appears at least once overall; `placeItem` clears the offer and increments `picksUsed` without mutating its input; `isValidWorld` rejects an unknown kind, a mountain at y 120, y < 90, a 2-kind offer, a duplicate-kind offer, negative `picksUsed`.
- [ ] **Step 2: Write failing tests** in `storage.test.ts`: v8 blob loads as v9 with `initialWorld()` and all other fields unchanged; a valid v9 round-trips; a v9 blob with a corrupt world is rejected and loading falls back down the chain (v8 key, then defaults); `save` writes only the v9 key and leaves the v8 key untouched (rollback safe); the whole older chain (v1..v7) still reaches v9.
- [ ] **Step 3: Run** `npx vitest run src/core/world.test.ts src/storage.test.ts` and confirm they fail.
- [ ] **Step 4: Implement** `world.ts` as above. In `progress.ts` bump to version 9 and add `world: initialWorld()` to `defaultProgress`. In `storage.ts` rename the current key constant to v9, add `V8_STORAGE_KEY`, add the old shape as `type ProgressV8 = Omit<Progress,'version'|'world'> & { version: 8 }`, `isValidProgressV8` (the current `isValidProgress` body with `version === 8`), `upgradeV8(p): Progress` (adds `world: initialWorld()`), `isValidProgress` now checks `version === 9 && ... && isValidWorld(x.world)`, and every older branch in `load()` wraps its result in `upgradeV8(...)` (the v7 branch becomes `upgradeV8(upgradeV7(v7))`, and so on). Rename the old `upgradeV7` return type to `ProgressV8`.
- [ ] **Step 5: Fix compile errors** (`npx tsc --noEmit`): every test or fixture building a `Progress` literal with `version: 8` gets `version: 9` and `world: initialWorld()` (use `defaultProgress()` spreads where the literal is not required). Update `.context/playwright/shots.mjs` fixtures the same way (key `math-practice-progress-v9`, `world: { items: [], picksUsed: 0, offer: null }`).
- [ ] **Step 6: Run** `npx vitest run` (all pass) and `npx tsc --noEmit` (clean).
- [ ] **Step 7: Commit** `feat: progress v9 with the world record, pick rules`

### Task 2: Zones, depth and placement rules (core)

**Files:**
- Modify: `src/core/world.ts`, `src/core/world.test.ts`

**Interfaces:**
- Consumes: constants from Task 1.
- Produces:
  - `export type Zone = { x0: number; x1: number; y0: number; y1: number }`
  - `export function zoneOf(kind: WorldKind): Zone` : mountain `{40,230, 42,102}` (the band), tree/bush/house `{24,246, 102,360}`, lake `{48,222, 135,360}`
  - `export function snapPlacement(kind: WorldKind, x: number, y: number): { x: number; y: number } | null` : `null` when `(x,y)` is outside the kind's zone; otherwise the point, except a mountain returns `y: HORIZON_Y` (x kept)
  - `export const depthScale = (y: number): number` : `0.4 + 0.75 * (y - HORIZON_Y) / (AREA_H - HORIZON_Y)`
  - `export const CHEER_LINES: readonly string[]` (the six) and `export function pickCheer(last: string | null, rng: Rng): string` (reuse `pickStyle` from `src/core/robo.ts`; one rng call)
  - `export const pickPrompt = (days: number): string` and `export const PLACE_PROMPT = 'Tap where it goes!'`

- [ ] **Step 1: Write failing tests**: mountain tap at (120, 70) returns `{120, 90}`; mountain tap at (120, 200) returns `null`; tree at (120, 70) (sky) is `null`; tree at (120, 200) kept as is; tree at x=5 is `null` (would hang off the edge); lake at (120, 110) is `null` (horizon strip) and at (120, 200) is kept; `depthScale(90) === 0.4`, `depthScale(360) === 1.15`, strictly increasing; `pickCheer(l, rng)` never returns `l`, over 500 seeds covers all six lines; `pickPrompt(5)` equals `"5 days of math! Let's add something to our world!"`.
- [ ] **Step 2: Run to fail**, **Step 3: Implement**, **Step 4: Run** `npx vitest run src/core/world.test.ts` to pass.
- [ ] **Step 5: Commit** `feat: world zones, depth and cheer lines`

### Task 3: A pick is decided with Robo's moment (core)

**Files:**
- Modify: `src/core/robo.ts`, `src/core/robo.test.ts`

**Interfaces:**
- Consumes: nothing new in core types (the caller computes the flag).
- Produces: `RoboOutcome.pickOwed: boolean` (caller passes `picksOwed(progress.day.practised, progress.world) > 0` after the answer is recorded); `RoboDecision.pick: boolean`.

Rules (spec "Where a reopened pick ranks"): `pick = o.pickOwed && !o.passed`. When `pick` is true: an unlock kick or a day moment still plays (the app opens the pick after it); a level-up or stars moment is dropped, with the star milestone kept in `pendingWalk` so it plays later, and the level-up simply lost, as today when something bigger plays; the pick ignores the cooldown; `sinceBig` is reset to 0 only when a big moment actually played.

- [ ] **Step 1: Write failing tests** (extend the existing outcome helper with `pickOwed: false`): pick true with no other moment gives `decision.big === null, pick === true`; kick + pick gives kick and `pick === true`; day + pick gives day and `pick === true`; level-up + pick gives `big === null`, `pick === true`, `memory.lastLevelUp` unchanged; milestone 40 + pick gives `big === null` and `memory.pendingWalk === 40`, then the next outcome with `pickOwed: false` and cooldown passed plays the stars/walk; **a Pass with `pickOwed: true` gives `pick === false`**; no `line` and no `surprise` when `pick` is true.
- [ ] **Step 2: Run to fail**, **Step 3: Implement** in `decideRobo` (compute `pick` first; if `pick` and the chosen `big` is `levelUp`/`stars`/`conga`, set `big = null` and keep `pendingWalk` as it was; skip `line`/`surprise` when `pick`). Update every `decideRobo` caller and test helper for the new field.
- [ ] **Step 4: Run** `npx vitest run src/core/robo.test.ts src/ui` (existing app tests need `pickOwed` wired in Task 6; for now pass `pickOwed: false` at the single call site in `app.ts`) and `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat: a pick outranks level-ups and stars`

### Task 4: Drawing the world (SVG)

**Files:**
- Create: `src/ui/world/kinds.ts`, `src/ui/world/scene.ts`, `src/ui/world/scene.test.ts`

**Interfaces:**
- Consumes: `WorldItem`, `WorldKind`, `depthScale`, `HORIZON_Y`, `AREA_W`, `AREA_H` from `core/world`.
- Produces:
  - `kinds.ts`: `export const KIND_NAMES: Record<WorldKind, string>` ('Tree', 'Bush', 'Mountain', 'Lake', 'House') and `export function drawKind(kind: WorldKind, x: number, y: number, scale: number): string` (an SVG `<g>` string in the marker style; shapes copied from `.superpowers/brainstorm/1106-1794639231/content/world-25-hills-placing.html`: `mountain`, `tree`, `bush`, `house`, `lake`)
  - `scene.ts`: `export function sceneSvg(items: WorldItem[], opts?: { blur?: number }): string` : full `<svg xmlns viewBox="0 0 270 360">` with sky gradient, ground, sun at (226, 26), three small mountains on the horizon (x 60/150/235, scale .55/.4/.5), three hills in front (`#c4e3ad` at x30 w70 h9, `#b5dc9c` at x165 w80 h11, `#c4e3ad` at x262 w50 h8), then placed items sorted by `y` ascending (far to near; ties keep placement order), each scaled by `depthScale(y)`; a placed mountain is drawn at the horizon at scale .9 (bigger than the scenery ones, so hers reads as hers) and sits behind the hills; when `blur` is set the land group has `filter="url(#bl)"` with `feGaussianBlur stdDeviation={blur}`
  - `export const svgDataUri = (svg: string): string` (`data:image/svg+xml;charset=utf-8,` + `encodeURIComponent`)
  - `export const SKY_TOP = '#bfe6ff', SKY_LOW = '#eaf7ff', GROUND = '#d8efc4'` (reused by CSS fills in Task 5/6)

- [ ] **Step 1: Write failing tests** (jsdom, parse with `DOMParser` as `image/svg+xml`): empty world still contains the sky rect, ground rect starting at y=90 and the sun; items are emitted far-to-near (a tree at y=120 comes before a tree at y=300 in document order, found by `data-kind`/`data-y` attributes you put on each item's `<g>`); a placed mountain's `<g>` is at y=90; item scale grows with y (read from `transform`); `sceneSvg(items, { blur: 2 })` contains `feGaussianBlur` with `stdDeviation="2"` and no blur filter when `blur` is omitted; `svgDataUri` round-trips back to the same string via `decodeURIComponent`; five kinds all draw non-empty strings.
- [ ] **Step 2: Run to fail**, **Step 3: Implement** both files, **Step 4: Run** `npx vitest run src/ui/world/scene.test.ts` to pass.
- [ ] **Step 5: Add a dev-only preview** page is NOT needed; instead render `sceneSvg` of a sample world to `/tmp/claude-1000/-workspace/0fd928d1-bd60-4d07-84e5-eba0d7fa6138/scratchpad/scene.svg` with a one-off `npx vite-node` script, open it in the visual companion as a mockup next to the approved `world-25-hills-placing.html` and check by eye that the five kinds look like the approved mockup. Note anything off in the commit message; do not add the script to the repo.
- [ ] **Step 6: Commit** `feat: draw the world as SVG (five kinds, hills, depth order)`

### Task 5: The pick view

**Files:**
- Create: `src/ui/world/frame.ts`, `src/ui/world/pick.ts`, `src/ui/world/world.css`, `src/ui/world/pick.test.ts`
- Modify: `src/main.ts` only to `import './ui/world/world.css'` if CSS is not imported from `pick.ts` (follow how `robo.ts` imports `./robo.css`)

**Interfaces:**
- Consumes: Task 2 (`snapPlacement`, `zoneOf`, `depthScale`, `pickPrompt`, `PLACE_PROMPT`), Task 4 (`sceneSvg`, `drawKind`, `KIND_NAMES`), `createFigure`/`setFigure` from `src/ui/robo/drawing.ts`.
- Produces:
  - `frame.ts`: `export function fitFrame(w: number, h: number): { left: number; top: number; width: number; height: number }` the largest 3:4 box that fits in `w`×`h`, centred.
  - `pick.ts`: `export interface PickDeps { items: WorldItem[]; offer: WorldKind[]; days: number; cheer(): string; onPlaced(item: WorldItem): void; onDone(): void }` and `export function createPick(deps: PickDeps): { el: HTMLElement; destroy(): void }`; `export const PICK_CHEER_MS = 2500`.

Behaviour (data attributes are the test hooks):
- `el` is `data-role="pick"`, fixed, full viewport, `z-index` above `.app` content and the Robo layers (Robo's own `el` hidden by the app while the pick is open, Task 6), `role="dialog"`. The scene (`sceneSvg(items)`, sharp, not blurred) sits in a frame from `fitFrame(innerWidth, innerHeight)`; flat `SKY_TOP`/`GROUND` fills continue beyond the frame with the horizon line meeting the frame's horizon. Recompute on `resize`.
- A small Robo figure (`createFigure()`, arms down, light off) stands bottom-left of the frame with a words bubble (`data-role="pick-words"`) showing `pickPrompt(days)`.
- A tray at the bottom with one big button per offered kind (`data-role="pick-kind" data-kind="tree"`, drawing + `KIND_NAMES`), at least 56px high. Before a choice nothing is selected and no zone shows.
- Choosing a kind (pointerdown): sets `data-selected`, words become `PLACE_PROMPT`, and zone dimming appears: `data-role="pick-dim"` layers cover everything outside `zoneOf(kind)` (converted to frame pixels) and the zone gets a dashed outline; the dim and outline update when she picks a different kind. Choosing again swaps the ghost kind; if a ghost position exists and is still valid for the new kind (`snapPlacement` not null) it stays (mountains snap to the horizon), otherwise the ghost is removed and OK is disabled.
- Tapping the frame converts client coordinates to area units (`x = (clientX - frame.left) / frame.width * 270`, same for y) and calls `snapPlacement(kind, x, y)`; `null` does nothing (the ghost and OK stay as they were); otherwise the ghost (`data-role="pick-ghost"`, drawn with `drawKind` at `depthScale`) is placed or moved there and OK becomes enabled. Taps with no kind chosen do nothing.
- OK (`data-role="pick-ok"`, at least 56px, disabled until a ghost exists): calls `deps.onPlaced({ kind, area: 0, x, y })` once, locks the view (further taps and kind buttons inert), draws the item solid, Robo figure goes green + smile + arms up, the words bubble shows `deps.cheer()`, and after `PICK_CHEER_MS` calls `deps.onDone()` once. Double taps on OK place only one item.
- Reduce Motion (`@media (prefers-reduced-motion: reduce)`): no entry fade or bounce; everything else the same.
- `destroy()` removes listeners and the timer; no `onDone` after destroy.

- [ ] **Step 1: Write failing tests** (`// @vitest-environment jsdom`, fake timers; stub `getBoundingClientRect` on the frame element to a known box so pointer maths is exact): initial state shows the prompt for `days`, three kind buttons in offer order, no dim layers, OK disabled; choosing `mountain` shows the dim layers and prompt `Tap where it goes!`; tap inside the band places a ghost at `y === 90`; tap in the sky above the band does nothing (ghost unchanged); switching to `tree` with a mountain ghost on the horizon keeps nothing valid (y 90 is outside the tree zone) so the ghost is removed and OK disabled, and the dim layers change; switching from `tree` (ghost at 120,200) to `bush` keeps the ghost; tapping elsewhere moves the ghost; OK with no ghost does nothing; OK calls `onPlaced` once with `{ kind, area: 0, x, y }`; two quick OK taps call it once; the cheer line from `deps.cheer()` shows in `pick-words`; `onDone` fires after exactly `PICK_CHEER_MS`; after OK, kind buttons and frame taps change nothing; `destroy()` before the timer means `onDone` never fires; `fitFrame(810,1080)` is the full screen, `fitFrame(1080,810)` is 607.5 wide centred, `fitFrame(390,844)` is 390 wide 520 tall centred vertically.
- [ ] **Step 2: Run to fail**, **Step 3: Implement** the three files and CSS (Safari 15-safe CSS only; no `:has()`, no nesting; `inset` shorthand avoided like `robo.css`), **Step 4: Run** `npx vitest run src/ui/world` to pass.
- [ ] **Step 5: Look at it:** serve the dev app (running.md "Dev"), and with a quick dev-only URL or console call mount `createPick` with a sample offer; screenshot at 810×1080, 1080×810 and 390×844 with Playwright (scratchpad script, not committed); check the tray never covers the placeable ground in a way that makes it unreachable and the OK button is reachable. Fix the CSS until it is.
- [ ] **Step 6: Commit** `feat: the pick view (choose, dim zones, place, move, OK, cheer)`

### Task 6: The blurred world behind the math, and the app wiring

**Files:**
- Create: `src/ui/world/background.ts`, `src/ui/world/background.test.ts`
- Modify: `src/ui/app.ts`, `src/ui/app.test.ts`, `src/styles.css` (card, cream empty boxes) or `world.css`, `src/ui/testUtil.ts` (a helper to start from a given Progress is already there: `setup(seed, overrides, initial)`)

**Interfaces:**
- Consumes: everything above; `fitFrame`; `picksOwed`, `makeOffer`, `placeItem`, `pickCheer`.
- Produces: `createWorldBackground(): { el: HTMLElement; update(items: WorldItem[]): void }`: `el` is `data-role="world-bg"`, `position: fixed` behind `.app` (`z-index: -1`, `pointer-events: none`, `aria-hidden`), contains flat sky/ground fills and an `<img>` (own layer, `will-change: transform`) whose `src` is `svgDataUri(sceneSvg(items, { blur: 2 }))`, sized by `fitFrame` on mount and resize, with a veil div `rgba(255,248,236,.15)`. It is hidden (`hidden` attribute) when `items.length === 0`, and `update` only rebuilds the `src` when items changed (compare JSON).

Wiring in `app.ts`:
- Mount the background into `appEl`'s parent (`root`) before `.app`; call `update(progress.world.items)` on mount and after each placement. When it has items, set `data-world` on `.app` so CSS draws the card: `.app[data-world] .problem-area::before` (absolutely positioned behind the problem, `inset` via top/right/bottom/left 0, no layout change, `z-index: -1` inside the problem-area's stacking context) with the card style from Global Constraints, covering the picture too; empty answer cells get `background: #fff3dd` under `[data-world]`.
- After recording a right answer, compute `pickOwed = picksOwed(progress.day.practised, progress.world) > 0` and pass it in the `RoboOutcome` (also for Pass: the value is passed but the core ignores it).
- If `decision.pick`: set `pickPending = true`. If a big moment (kick or day) is playing, open the pick when it ends (hook in `endMoment()` when `pickPending && !pickView`, setting the flag only after `playMoment` returns so the moment's own opening `endMoment()` doesn't trigger it); otherwise open it right away. `startPick()`: offer = `progress.world.offer ?? makeOffer(roboRng)`; if it was new, save progress with that offer first (never lost); hide Robo (`robo.show(false)`), `endMoment` any greeting; create the pick with `days: progress.day.practised`, `cheer: () => lastCheer = pickCheer(lastCheer, roboRng)` (`lastCheer` is in-memory), `onPlaced: item => { progress = { ...progress, world: placeItem(progress.world, item) }; store.save(progress); bg.update(...); app data-world on }`, `onDone: closePick`. `closePick` destroys the view, removes it, clears `pickPending`, calls `measureRobo()` to bring Robo back.
- While the pick is open: `onKeyDown` and `onPointerDown` return early when the target is outside the pick view (the pick view handles its own pointer events and stops propagation to the app's pad); the problem timer (`showNext` after `ADVANCE_MS`) may run underneath.
- Mid-pick reload: nothing special beyond the saved offer: on the next right answer `picksOwed > 0` so the pick reopens with `progress.world.offer`.
- `destroy()` also removes the background and the pick.

- [ ] **Step 1: Write failing tests** in `background.test.ts`: hidden with no items; shown with one; `img` src decodes to an SVG containing `feGaussianBlur` `stdDeviation="2"`; `update` with identical items does not change `src` (spy via a counter on the attribute setter or compare object identity of a data attribute `data-rev`); the veil exists; `el` never receives pointer events (`pointer-events: none` in CSS asserted through the class, not computed style).
- [ ] **Step 2: Write failing tests** in `app.test.ts` (start from `{...defaultProgress(), day: {date:'2026-11-11', right:9, days:4, lastDone:'2026-11-10', practised:4}}`, answer one right): the 10th right answer completes day 5 and the day moment plays, then after its length `[data-role="pick"]` exists with 3 kind buttons; (**Review Focus 1**) the same setup answered with Pass never opens a pick and `practised` is unchanged; the pick opens at once (no moment) when `practised` is 5 owed but today's answer is not a completing one (progress with `practised: 5, picksUsed: 0`, answer any right) and the level-up that would have played does not; choosing, tapping the ground and pressing OK saves a progress with one item, `picksUsed 1`, `offer null`, shows the cheer, then after `PICK_CHEER_MS` the pick is gone, Robo is shown again and `[data-role="world-bg"]` is visible and `.app` has `data-world`; (**Review Focus 2**) a progress with `offer: ['tree','lake','house']` and `practised: 5` reopens exactly those three after a right answer; (**Review Focus 3**) `practised: 10, picksUsed: 0`: the first right answer opens the pick, after OK the next right answer opens the second, not both at once; (**Review Focus 4**) with the pick open, `[data-key="1"]` pointerdown and a window `keydown` of "1" leave the answer unchanged; before day 5 no `world-bg` is in view (`hidden`) and the strip celebrations are unchanged (existing tests still pass); the new offer is saved before the pick shows (the last `saved` entry has a non-null `offer` while it's open).
- [ ] **Step 3: Run to fail**, **Step 4: Implement** as above, **Step 5: Run** `npx vitest run` (all) and `npx tsc --noEmit` and `npm run build`.
- [ ] **Step 6: Commit** `feat: Robo's world, first pick: the pick opens on day 5, the blurred world sits behind the math`

### Task 7: Layout check, iPad pass and notes

**Files:**
- Modify: `.context/playwright/shots.mjs`, `.context/running.md`, `.context/wip.md`, `.context/decisions.md`

- [ ] **Step 1:** Extend the Playwright check with a world fixture (progress v9, `practised: 5`, a few items, `picksUsed: 1`) per view in `shots.mjs`: with items the card sits behind the problem and never changes the problem's size or position compared to the no-world run (assert the problem/answer/keys boxes are identical within 1px); a second flow with `practised: 5, picksUsed: 0, right: 9` completes the day, waits for the pick, and asserts: OK, the three kind buttons and the whole area are inside the viewport, tap targets >= 44px, tapping the ground places a ghost and OK places it, then the pad works again and Robo is back. Cover her iPad (`ipad102-p`, `ipad102-p-tab`), a landscape iPad and a phone. Screenshot to `out/world-<view>-*.png`. Run per running.md; only the accepted se-tab 31px cell failure may remain.
- [ ] **Step 2:** Run `RM=1` for the pick (no fade) and check nothing breaks.
- [ ] **Step 3:** Update `running.md` (world fixture, what the new checks do), `wip.md` (release 1 built; the on-iPad checklist below; releases 2 and 3 next), `decisions.md` (anything decided while building).
- [ ] **Step 4:** Build and give the user the on-iPad checklist: the pick appears on the answer that completes her 5th day; the three choices are big enough to tap; the dim zones read clearly; switching the choice before OK; OK cheers; the blurred world behind the math looks like the earlier test (same blur and card); Robo's hop still smooth over it; rotating while the pick is open.
- [ ] **Step 5: Commit** `docs: release 1 layout check and notes`. Do not push or force-push anything; ask the user before pushing to dev or prod (and remind them dev's `main` is still the throwaway spike).

---

## Self-review notes

- Spec coverage: world on day 5 (T3, T6), 3 random kinds (T1), tap/move/OK, switch before OK, zones dim (T2, T5), cheer lines never twice (T2, T6), blurred baked world + card + veil (T4, T6), v9 save and never-lost offer (T1, T6), pick outranks level-ups and stars and ignores cooldown (T3), strip celebrations unchanged (T6 test), Reduce Motion (T5 CSS, T7 `RM=1`), small screens and landscape via `fitFrame` (T5, T7). Out of scope for this release: slide-away and » (release 2), areas, swipe, panning (release 3).
- Release-1 differences from the spec, both mine: the pick overlay covers the app (the spec allows this) and uses its own small Robo figure for the cheer (the real Robo is hidden while it is open); on screens narrower than 3:4 the whole area is shown fitted to the width with flat sky/ground continuing, instead of cropping to the middle (so every placeable spot stays visible until release 3's swipe exists).
- Names used across tasks match their Interfaces blocks: `picksOwed`, `makeOffer`, `placeItem`, `snapPlacement`, `zoneOf`, `depthScale`, `pickCheer`, `pickPrompt`, `PLACE_PROMPT`, `sceneSvg`, `drawKind`, `svgDataUri`, `fitFrame`, `createPick`, `PICK_CHEER_MS`, `createWorldBackground`.
