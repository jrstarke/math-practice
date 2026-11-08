# Robo Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the child's character Robo into the game: it watches her work (light off), reacts to answers (green/red),
hops up to give hints, and cheers her on (walks at star milestones, a high five on level-ups, the kick on unlocks).

**Architecture:** A pure decision module in `src/core/robo.ts` says *what* happens after each finished problem
(big moment, short line, surprise), with a small in-memory cooldown. `src/ui/robo/` draws Robo as inline SVG with
named parts (`drawing.ts`), measures where it fits (`layout.ts`, pure maths on rectangles), and plays poses and
moments (`robo.ts`, CSS keyframes). `app.ts` wires the two together.

**Tech Stack:** Vanilla TypeScript, Vite PWA, Vitest (+ jsdom for UI), Playwright layout script.

**Spec:** `docs/superpowers/specs/2026-11-08-robo-companion-design.md`

## Global Constraints

- No new dependencies. Works offline.
- Must run on **iPadOS 15 Safari**: no container queries, no `:has()`, no `dvh`/`svh`, no CSS nesting, no
  `inset:` shorthand in new CSS. Positions are measured in script (`getBoundingClientRect`), not via CSS queries.
- Art per `character/robot-character.md`: lines `#2b2b2b`, round caps/joins, ~3.5px at the reference size, white
  body, light is the only colour, no extra details. Light colours:
  `green {light:'#4cd964', glow:'#c8f7c5', rays:'#2fa84f'}`, `red {light:'#ff5a4f', glow:'#ffd2cc', rays:'#d9362b'}`,
  `off {light:'#e4e1d8'}` (no glow, no rays, no highlight).
- Exact words: wrong `'Not quite — try again!'` (Robo's bubble; the existing text line keeps
  `'Not quite — try again'`), `'You got it!'`, `'You figured it out!'`, `'High five!'`,
  walk `` `You've gotten ${n} questions right! Keep going!` ``, kick `` `New: ${unlocked.join(' and ')}!` ``.
- Never delay input: the next problem still appears `ADVANCE_MS` (1000) after a right answer. Every Robo layer has
  `pointer-events: none` and `aria-hidden="true"`.
- No change to saved progress (`Progress`, storage keys, migrations).
- `prefers-reduced-motion: reduce` → every Robo movement becomes a fade; colours and words unchanged.
- Commands need `PATH="$HOME/.asdf/shims:$PATH"`. Tests `npx vitest run`, types `npx tsc --noEmit`. `sed -i` does
  not work on /workspace; edit with the Edit tool or node scripts.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push.

## Review Focus

1. She taps Hint or Pass while a walk / high five / kick is still playing: the moment ends at once and Robo goes
   up; there are never two Robos on screen (test in Task 5).
2. The iPad rotates, or the window resizes, while Robo is up or mid-moment: Robo re-measures, switches
   standing/peek correctly and never overlaps the problem, picture or controls (Task 6 layout script).
3. `destroy()` while a moment is playing: no timers fire afterwards and the Robo layers are removed (Task 5).
4. A wrong answer while Robo is up with a hint, then a key press: the hint text stays, the text line shows the
   wrong message, and the light goes red then back off (Task 5).
5. Safari 15 CSS: any property or selector in the new CSS that Safari 15.0 lacks. Chromium can't catch this;
   the reviewer checks the CSS by hand.

## Rulings carried from the spec (decided while planning)

- A walk outranked on the same answer by a kick or high five is also **held back and played later**, like a walk
  held back by the cooldown ("she never misses a star milestone"). A high five that is outranked or cooled down is
  dropped (the level-up sound still plays).
- The cooldown counts finished problems (right answers and Passes). Surprises don't count as big moments.
- Surprises happen only on clean right answers (no line, not a Pass), never in peek mode.
- Standing mode checks the space to the **right** of the controls only. In the side-by-side landscape layout
  there's no room there, so Robo peeks. That's within the spec ("stand if there's room, otherwise peek").
- Robo's hint bubble *is* the existing `[data-role="bubble"]`, restyled with its tail toward Robo (`robo-says`
  class). Existing hint tests stay valid.
- In standing mode the text line `[data-role="message"]` is visually hidden (`sr-only`) while Robo says the same
  thing; it's visible while Robo is up with a hint, and always in peek mode.
- Surprises use their own random source `AppDeps.roboRng` (default `Math.random`) so existing seeded problem
  sequences don't change.

---

### Task 1: What happens when (pure decision module)

**Files:**
- Create: `src/core/robo.ts`
- Test: `src/core/robo.test.ts`

**Interfaces:**
- Consumes: `LevelChange` from `src/core/adaptive.ts`, `OpKey` from `src/core/progress.ts`, `Rng` from `src/core/rng.ts`.
- Produces:
  ```ts
  export const COOLDOWN = 4;
  export const SURPRISE_CHANCE = 1 / 15;
  export type BigMoment =
    | { kind: 'kick'; words: string }
    | { kind: 'highFive'; words: string }
    | { kind: 'walk'; withFriend: boolean; words: string };
  export interface RoboOutcome {
    totalBefore: number; totalAfter: number; levelChange: LevelChange; unlocked: OpKey[];
    wrongSubmits: number; hintsUsed: number; passed: boolean;
  }
  export interface RoboMemory { sinceBig: number; pendingWalk: number | null; lastWasSurprise: boolean }
  export interface RoboDecision { big: BigMoment | null; line: string | null; surprise: boolean }
  export function initialRoboMemory(): RoboMemory; // { sinceBig: Infinity, pendingWalk: null, lastWasSurprise: false }
  export function walkWords(n: number): string;
  export function decideRobo(m: RoboMemory, o: RoboOutcome, rng: Rng): { memory: RoboMemory; decision: RoboDecision };
  ```

Rules `decideRobo` implements, in order:
1. `s = m.sinceBig + 1` (finished problems since the last big moment, counting this one). Walks and high fives are
   allowed only when `s > COOLDOWN`.
2. Milestone: if `totalAfter > totalBefore && totalAfter % 20 === 0`, this answer's walk is `totalAfter`; it
   replaces any older `pendingWalk`.
3. Big moment, highest first: `unlocked.length > 0` → kick (always). Else, if allowed: `levelChange === 1` →
   high five; else a walk (this answer's or the pending one; `withFriend = n % 100 === 0`). A walk not played
   becomes `pendingWalk`; a played walk clears it. Any big moment sets `sinceBig = 0`, else `sinceBig = s`.
4. Line, only when there's no big moment and not `passed`: `hintsUsed > 0` → `'You figured it out!'`, else
   `wrongSubmits > 0` → `'You got it!'`, else `null`.
5. Surprise, only when no big moment, no line, not passed, `!m.lastWasSurprise`: `rng() < SURPRISE_CHANCE`. The
   rng is called **only** in this case. `lastWasSurprise` = whether this answer had one.

- [ ] **Step 1: Write the failing tests** in `src/core/robo.test.ts`, using
  `const clean = { totalBefore: 10, totalAfter: 11, levelChange: 0, unlocked: [], wrongSubmits: 0, hintsUsed: 0, passed: false }`
  and `never = () => 0.99`:
  - `'a clean answer has no big moment, no line'` → `{ big: null, line: null, surprise: false }`.
  - `'right after a wrong try says "You got it!"'` (`totalAfter: 10, wrongSubmits: 1`).
  - `'right after hints says "You figured it out!"', also when there were wrong tries too`.
  - `'Pass has no line and no surprise'` (`passed: true, hintsUsed: 3`, rng `() => 0`).
  - `'reaching 40 stars walks alone with the milestone words'` → `big` equals
    `{ kind: 'walk', withFriend: false, words: "You've gotten 40 questions right! Keep going!" }`, `line: null`.
  - `'reaching 100 stars walks with the friend'`.
  - `'a level-up high-fives'` → `{ kind: 'highFive', words: 'High five!' }`.
  - `'a level-down does nothing'` (`levelChange: -1`) → no big moment.
  - `'an unlock kicks with the unlock words'` (`unlocked: ['division']`) → words `'New: division!'`; two unlocks
    → `'New: subtraction and multiplication!'`.
  - `'kick beats high five; the same answer's walk is held back and plays when allowed'`: `levelChange 1,
    unlocked ['division'], totalBefore 39, totalAfter 40` → kick, `pendingWalk 40`; then 4 clean answers →
    no big; the 5th → the 40 walk; `pendingWalk` back to `null`.
  - `'within 4 problems of a big moment, a level-up gets no high five and is not saved'`: high five at answer 0;
    level-ups at answers 1–4 → no big; a clean answer 5 → no big; a level-up at answer 5 → high five.
  - `'the kick always plays, even straight after another big moment'`.
  - `'a Pass counts toward the cooldown'`.
  - `'surprise: about 1 in 15 and never two in a row'`: rng `() => 0` gives a surprise, then the next clean answer
    with rng `() => 0` gives none, then the one after gives one; with `mulberry32(5)` over 15,000 clean answers the
    rate is within 0.06 ± 0.015 (no two in a row lowers it below 1/15).
  - `'no surprise on an answer with a line or a big moment, and the rng is not called then'` (rng that throws).
- [ ] **Step 2: Run to see them fail**
  Run: `PATH="$HOME/.asdf/shims:$PATH" npx vitest run src/core/robo.test.ts`
  Expected: FAIL, cannot find `./robo`.
- [ ] **Step 3: Implement `src/core/robo.ts`** per the interface and the five rules above.
- [ ] **Step 4: Run to see them pass**, then `npx tsc --noEmit`.
  Expected: all pass, tsc clean.
- [ ] **Step 5: Commit** `feat: decide Robo's moments (big moments, lines, surprises, cooldown)`

---

### Task 2: Robo's drawing

**Files:**
- Create: `src/ui/robo/drawing.ts`, `src/ui/robo/robo.css` (imported from `src/styles.css` or `main.ts`, your call)
- Test: `src/ui/robo/drawing.test.ts` (jsdom)
- Create (dev only, not built): `robo-preview.html` at the repo root + `src/ui/robo/preview.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Light = 'off' | 'green' | 'red';
  export type Mouth = 'flat' | 'smile' | 'talk';
  export type Look = 'front' | 'up' | 'side';
  export type Arms = 'down' | 'point' | 'up' | 'high-five';
  export const LIGHT: Record<Light, { light: string; glow: string | null; rays: string | null }>;
  /** A Robo figure. State lives in data attributes on the returned element, which CSS reads. */
  export function createFigure(): HTMLElement; // <div class="robo-figure" data-light="off" data-mouth="flat" data-look="front" data-arms="down"> + inline <svg>
  export function setFigure(f: HTMLElement, s: Partial<{ light: Light; mouth: Mouth; look: Look; arms: Arms }>): void;
  ```
- SVG parts carry `data-part`: `light`, `glow`, `rays`, `highlight`, `mount`, `body`, `eyes-front`, `eyes-up`,
  `eyes-side`, `mouth-flat`, `mouth-smile`, `mouth-talk`, `arm-left`, `arm-right` (one `<g>` each per arm pose:
  `data-pose="down|point|up|high-five"`), `leg-left`, `leg-right`. CSS shows only the variant matching the
  figure's attributes (e.g. `.robo-figure[data-mouth="smile"] [data-part="mouth-smile"] { display: inline }`).
- Geometry: take the centered body, light, mount and legs from `character/robots.svg` / `robot-walk.svg`
  (body arch `M-65 140 L-65 70 A65 70 0 0 1 65 70 L65 140 Z`, legs from y=140, feet as ovals), face and highlight
  from `character.svg`. Light fill and colours come from `LIGHT` via CSS on `data-light`.
- Idle sign of life (spec: blink or slight bob) is a CSS animation on `.robo-figure[data-light="off"]`, e.g. an
  eye blink every ~4s; disabled under reduced motion.

- [ ] **Step 1: Write the failing tests**
  - `'a new figure starts with the light off, flat mouth, looking ahead, arms down'` (attributes).
  - `'the figure has every named part'` (query each `data-part` above; each arm has all four poses).
  - `'setFigure changes only what it is given'`.
  - `'LIGHT matches the character guide'` (green values verbatim; `off.glow === null && off.rays === null`).
  - `'the figure ignores taps and is hidden from screen readers'` (`aria-hidden="true"`; the CSS rule
    `pointer-events: none` is checked in Task 6's layout script, as jsdom doesn't load styles).
- [ ] **Step 2: Run to see them fail** — `npx vitest run src/ui/robo/drawing.test.ts`, Expected: FAIL (module missing).
- [ ] **Step 3: Implement `drawing.ts` and the pose/colour rules in `robo.css`.**
- [ ] **Step 4: Run to see them pass**, then tsc.
- [ ] **Step 5: Preview page.** `robo-preview.html` (root, loads `src/ui/robo/preview.ts`) shows a grid of figures:
  every light × mouth, each arm pose, looking up. Screenshot it with Playwright at 1100×900 into
  `/tmp/claude-1000/pw/out/robo-poses.png` (dev server `npx vite --host 0.0.0.0 --port $PUBLISH_PORT`) and check
  it against the character guide: no gaps between mount and body, rounded ends, the light on top.
  Expected: matches the guide; `npx vite build` output contains no `robo-preview`.
- [ ] **Step 6: Commit** `feat: draw Robo with named parts and poses`

---

### Task 3: Where Robo fits (pure layout maths)

**Files:**
- Create: `src/ui/robo/layout.ts`
- Test: `src/ui/robo/layout.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface Box { left: number; top: number; right: number; bottom: number }
  export type RoboMode = 'standing' | 'peek';
  export const ROBO_W = 112, ROBO_H = 136, GAP = 12;
  /** Standing iff there's ROBO_W + 2*GAP of free width to the right of the controls. */
  export function chooseMode(viewportWidth: number, controls: Box): RoboMode;
  /** Robo's spot: right of the controls, feet level with their bottom. */
  export function spotPosition(controls: Box): { left: number; top: number }; // left = right + GAP, top = bottom - ROBO_H
  /** Up beside the problem. content = union of the problem anchor and the picture. Null → point from the spot. */
  export function placeUp(stage: Box, content: Box): { shift: number; left: number; top: number } | null;
  export function union(a: Box, b: Box | null): Box;
  /** Peek: Robo's top-left when popping up centred on the stage, feet on the controls' top edge. */
  export function peekPosition(stage: Box, controls: Box): { left: number; top: number };
  /** Walk lane: the row just above the controls. */
  export function laneTop(controls: Box): number; // controls.top - ROBO_H
  ```
- `placeUp`: `need = ROBO_W + GAP`; `shift = max(0, need - (stage.right - content.right))`; null if
  `shift > content.left - stage.left`. `left = content.right - shift + GAP`. `top = content.top`, pulled up to
  `stage.bottom - ROBO_H` if Robo would hang below the stage; null if that puts it above `stage.top`.

- [ ] **Step 1: Write the failing tests** with real-ish numbers:
  - `'iPad upright (810 wide, controls 175–635) stands'`; `'iPhone SE (375 wide, controls 16–359) peeks'`;
    `'exactly ROBO_W + 2*GAP to spare stands; one pixel less peeks'`.
  - `'spot sits right of the controls with its feet on their bottom'`.
  - `'room beside the problem: no shift'`; `'a little short: shifts left by the difference'`;
    `'no room even after shifting: null'`; `'a tall Robo next to a low problem is pulled up inside the stage'`;
    `'stage too short for Robo: null'`.
  - `'union with no picture is the problem box'`; `'union with a picture covers both'`.
  - `'peek is centred on the stage, just above the controls'`.
- [ ] **Step 2: Run to see them fail.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement `layout.ts`.**
- [ ] **Step 4: Run to see them pass**, then tsc.
- [ ] **Step 5: Commit** `feat: work out where Robo stands, goes up and walks`

---

### Task 4: Robo on screen (poses, bubble, moments)

**Files:**
- Create: `src/ui/robo/robo.ts`
- Modify: `src/ui/robo/robo.css`
- Test: `src/ui/robo/robo.test.ts` (jsdom)

**Interfaces:**
- Consumes: `createFigure`, `setFigure` (Task 2); `BigMoment` (Task 1); `RoboMode`, `ROBO_W`, `ROBO_H` (Task 3).
- Produces:
  ```ts
  export const MOMENT_MS = { walk: 4000, highFive: 2500, kick: 3000, peek: 2500, surprise: 1200, flash: 600 } as const;
  export interface MomentPlace { mode: RoboMode; spot: { left: number; top: number } | null;
                                 laneTop: number; viewportWidth: number; peek: { left: number; top: number } }
  export interface RoboView {
    el: HTMLElement;       // data-role="robo": the standing Robo (fixed-position) + its own bubble
    overlay: HTMLElement;  // data-role="robo-moment": fixed, full-viewport layer for moments
    show(visible: boolean): void;            // standing → shown; peek → hidden
    moveTo(p: { left: number; top: number }, place: 'spot' | 'up' | 'point'): void; // sets data-place + position
    think(): void;                            // light off, look up, mouth flat, bubble empty
    right(line: string | null): void;         // light green + flash, smile, say(line)
    wrong(words: string | null): void;        // light red, flat mouth; words → its bubble (null leaves bubble alone)
    calm(): void;                             // red → off (no-op otherwise)
    talk(on: boolean): void;                  // talking mouth while up with a hint
    play(big: BigMoment, at: MomentPlace): number; // renders the moment in overlay, returns its duration
    surprise(): number;                       // small wave or bounce at the spot, returns duration
    endMoment(): void;                        // clears overlay; standing Robo visible again
  }
  export function createRobo(): RoboView;
  ```
- Its own bubble: `data-role="robo-bubble"`, text = what Robo says at its spot (`''` hides it).
- Moments in `overlay`, one child with `data-moment`:
  - standing: `walk` (Robo walks the lane left→right, bubble with the words), `walk-friend` (two figures side by
    side), `high-five` (friend runs in from the right edge to the spot, both arms `high-five`, friend leaves),
    `kick` (Robo at its spot kicks a ball across the lane; leg/arm keyframes and ball arc ported from
    `robot-kick.svg`, light flashing green).
  - peek mode: always `peek` (Robo pops up at `at.peek`, arms up, green, with the moment's words), no friend.
  - Words in `[data-role="moment-words"]`.
- While a walk, high five or kick plays in standing mode, the standing Robo is hidden (`data-away`), so there's
  only ever one Robo. `endMoment()` brings it back.
- Movement: CSS keyframes per `data-moment` / `data-place` (hop up/down ~300ms). Walk: 0.8s step cycle and bob from
  `robot-walk.svg`. Under `@media (prefers-reduced-motion: reduce)`, all of these are opacity fades.

- [ ] **Step 1: Write the failing tests**
  - `'think: light off, looking up, nothing said'`.
  - `'right with a line says it and smiles green; right with null says nothing'`.
  - `'wrong turns red and says the words; calm turns the light off'`.
  - `'wrong(null) keeps whatever the bubble said'` (needed when up with a hint).
  - `'moveTo sets data-place and the fixed position'` (`style.left/top` in px).
  - `'play(walk) in standing mode shows the walk with its words, hides the standing Robo, returns 4000'`.
  - `'play(walk withFriend) shows two figures'`; `'play(highFive) shows the friend'`; `'play(kick) shows a ball'`.
  - `'in peek mode every moment is a peek with the words and no friend'`.
  - `'endMoment clears the overlay and brings Robo back'`.
  - `'all Robo layers are aria-hidden'`.
- [ ] **Step 2: Run to see them fail.** Expected: FAIL (module missing).
- [ ] **Step 3: Implement `robo.ts` and the movement CSS.**
- [ ] **Step 4: Run to see them pass**, then tsc. Add every pose and moment to the preview page and screenshot
  mid-animation frames (Playwright `page.waitForTimeout` at 25/50/75% of each duration) into
  `/tmp/claude-1000/pw/out/robo-moment-*.png`; check each against the guide (bouncy, arms swing opposite legs,
  speed lines on the ball).
- [ ] **Step 5: Commit** `feat: Robo's poses, speech bubble and moments`

---

### Task 5: Wire Robo into the game

**Files:**
- Modify: `src/ui/app.ts`, `src/ui/sound.ts`, `src/ui/testUtil.ts`, `src/styles.css`, `src/main.ts` (only if
  the CSS import goes there)
- Test: `src/ui/app.test.ts`, `src/ui/sound.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces:
  - `SoundPlayer.robo(): void` — a short "beep boop" (e.g. 880 Hz then 660 Hz square-ish, ~0.2s total, gain ≤ 0.1),
    silent while muted, also on `createSilentSound()`.
  - `AppDeps.roboRng?: Rng` (default `Math.random`) and `AppDeps.roboMode?: RoboMode` (test-only override; when
    set, `chooseMode` is skipped and positions default to zeros).
  - `testUtil.setup` passes `roboRng: () => 0.99` by default and adds `robo: vi.fn()` to the sound mock.

Behaviour to wire (spec "During a problem" and "Cheering her on"):
- Mount: create the Robo view, append `el` and `overlay` to `.app`. Measure mode + spot after the first render and
  on `resize` / the existing `ResizeObserver` callback (which also re-places Robo if it's up); `robo.show(mode ===
  'standing')` and `moveTo(spotPosition(controls), 'spot')` each time.
- `showNext`: `robo.think()`; if Robo was up, move it back to the spot (`'spot'`); clear `--robo-shift`; bubble
  loses `robo-says`.
- Hint (standing): end any playing moment; after `render()`, `placeUp(stage, union(problemAnchor, picture))`. If a
  placement: set `--robo-shift` on the problem area (`.problem-anchor` and `.picture-host` translate by
  `calc(-1 * var(--robo-shift, 0px))`), `moveTo(..., 'up')`, add `robo-says` to the bubble, `talk(true)`. If null:
  `moveTo(spot, 'point')`. Pass does the same, then walks the steps as today.
- Wrong: standing and not up → `robo.wrong('Not quite — try again!')`, text line `sr-only`. Up → `robo.wrong(null)`,
  text line visible. Peek → text line as today. Next key press → `robo.calm()`.
- Right / Pass: after `finish()`, `decideRobo(memory, outcome, roboRng)` with `totalBefore` = total before
  `finish`. If `decision.big`: `ms = robo.play(big, place)`, `sound.robo()`, `later(robo.endMoment, ms)`. Else if
  right: `robo.right(decision.line)`; if `decision.surprise` and standing: `later(robo.endMoment, robo.surprise())`.
  The existing correct / level-up sounds are unchanged.
- Unlock words: in standing mode the unlock note on the text line is `sr-only` (Robo's kick says it); peek mode as
  today.
- `destroy()`: also removes Robo's layers and the resize listener (timers already cleared).

- [ ] **Step 1: Write the failing tests** in `app.test.ts` (use `setup(seed, { roboMode: 'standing' }, progress)`
  unless stated):
  - `'Robo watches with its light off while she works'` → `[data-role="robo"]` has `data-light="off"`.
  - `'a wrong answer turns Robo red with "Not quite — try again!"; her next key turns it off'`; text line still
    contains `'Not quite — try again'` and has class `sr-only`.
  - `'right after a wrong try Robo says "You got it!"'`; `'a clean right answer: green, no words'`.
  - `'Hint sends Robo up and shows the hint in the bubble; the next problem brings it back'` (`data-place="up"`
    after Hint — jsdom rects are zeros, so assert `data-place` is `up` or `point`, and `robo-says` on the bubble
    when up; after the answer and `advance(1000)`, `data-place="spot"`).
  - `'a wrong answer while Robo is up keeps the hint and shows the message on the text line'`
    (bubble text unchanged, text line not `sr-only`, light red; next key → off). *(Review Focus 4)*
  - `'reaching 40 stars plays the walk with its words and the chirp, and it ends after 4s'`
    (progress `total: 39`; after a clean answer: `[data-moment="walk"]`, words, `sound.robo` called once;
    `advance(4000)` → overlay empty).
  - `'reaching multiplication 2 kicks with "New: division!"'` (reuse the existing division-unlock fixture).
  - `'tapping Hint during a walk ends the walk and sends Robo up'`: no `[data-moment]` left, one
    `[data-role="robo"]`. *(Review Focus 1)*
  - `'destroy during a walk removes Robo and fires no more timers'`. *(Review Focus 3)*
  - `'peek mode: hints and messages work as today, and 40 stars plays a peek'` (`roboMode: 'peek'`: no
    `robo-says`, text line not `sr-only`, `[data-moment="peek"]`).
  - `'a surprise plays now and then on a clean answer'` (`roboRng: () => 0`).
  - In `sound.test.ts`: `'robo() plays two short notes and is silent when muted'` (follow the file's existing
    fake-AudioContext pattern).
- [ ] **Step 2: Run to see them fail.** `npx vitest run src/ui/app.test.ts src/ui/sound.test.ts`
  Expected: the new tests FAIL; the existing ones still pass.
- [ ] **Step 3: Implement the wiring, the sound and the CSS** (`.sr-only`, `--robo-shift`, `.bubble.robo-says`).
- [ ] **Step 4: Run the full suite and tsc.** Expected: all tests pass (467 existing + new), tsc clean.
- [ ] **Step 5: Commit** `feat: Robo joins the game — reactions, hints from beside the problem, cheers`

---

### Task 6: Layout checks and screenshots for review

**Files:**
- Modify: `.context/playwright/shots.mjs`, `.context/running.md` (how to run the Robo checks)

**Interfaces:**
- Consumes: the `data-role`/`data-place`/`data-moment` hooks from Tasks 4–5.

Add to `measure()` and the per-view flow (copy the script to `/tmp/claude-1000/pw/` as `.context/running.md` says):
- Mode: views ≥ 700 wide upright (`ipad102-p`, `ipad102-p-tab`, `ipad-p`, `ipad6-p-tabs`) expect Robo shown and
  standing; `se-*`, `ip15*` expect it hidden (peek). Landscape views: whichever `chooseMode` gives, but if shown,
  it must pass the overlap checks.
- Standing Robo rect: inside the viewport, no overlap with `.controls`, `.problem`, the bubble or the picture.
- After the first Hint: if `data-place="up"`, Robo's rect doesn't overlap `.problem`, the answer boxes, the bubble
  or the picture, and stays inside `.stage`. Then `page.setViewportSize` to the rotated size and re-check
  (*Review Focus 2*).
- Pointer-through: during a walk (fixture `TOTAL=39`, answer one problem correctly), the centre of the `5` key
  `elementFromPoint` is the key (or inside it), and the walking figure doesn't overlap `.problem`.
- Reduced motion: one run with `reducedMotion: 'reduce'` takes the same screenshots without failures.
- Screenshots per view: thinking, up with a hint, wrong (red), mid-walk, mid-high-five, mid-kick, into
  `/tmp/claude-1000/pw/out/`.

- [ ] **Step 1: Add the checks** and run against the dev server (`npx vite --host 0.0.0.0 --port $PUBLISH_PORT`):
  `cd /tmp/claude-1000/pw && URL=http://localhost:$PUBLISH_PORT SEEDS=4 node shots.mjs` and again with `OP=÷`.
  Expected: no Robo failures on any view; the only accepted failure is the existing `se-tab` cell-size check
  (31–34px < 38px).
- [ ] **Step 2: Fix any overlap** the checks find (in Task 3's maths or Task 4/5's CSS), adding a unit test in
  `layout.test.ts` for each maths fix first.
- [ ] **Step 3: Look at the screenshots** for `ipad102-p` and `ipad102-p-tab` (her iPad) and record in
  `.context/wip.md` which ones the user should show the child, plus the reminder that iPadOS 15 positions and
  motion must be checked on her iPad.
- [ ] **Step 4: Commit** `test: layout checks cover Robo`

---

## Done when

- All tasks committed on `feat/robo`; full suite and tsc green.
- Layout script passes for Robo on every view (apart from the accepted `se-tab` cell size).
- Screenshots ready for the user and the child; the final iPadOS 15 check on her iPad is listed in
  `.context/wip.md` as the user's step.
