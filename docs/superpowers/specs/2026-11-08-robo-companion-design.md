# Robo companion — design

Date: 2026-11-08. Size: project. Character reference: `character/robot-character.md` and the SVGs beside it
(`character.svg` standing, `robots.svg` two robots, `robot-walk.svg` walk cycle, `robot-kick.svg` soccer kick).

## Intent and why

The child (Grade 2) finds the game less engaging than apps like Duolingo Math. She invented Robo, a small friendly
robot with a light on its head, and wants it in the game. Research (summary in `.context/wip.md`, 2026-11-08) found
the best-supported lever is an on-screen character that reacts to the learner: it makes the experience feel warmer
and more helpful. The risks to avoid are rewards that replace the maths as the point, and pressure or guilt.

This adds Robo as her companion: it watches her work, reacts to answers, gives hints, and cheers her on at
milestones. The milestones are **encouragement to keep going, never a place to stop** (user's framing). The game
stays endless.

Success: on her iPad, Robo is always there beside the number pad. It looks at the problem while she thinks (light
off), lights up green and smiles when she's right, turns red with a kind "Try again" when she isn't, hops up to explain hints, and
every so often does something that makes her want to keep playing. Nothing about it slows her down.

## Goals

- Robo drawn in the game in her style, with movable parts: light, eyes, mouth, arms, legs.
- Robo reacts during every problem (thinking, right, wrong, hint, Pass), as decided below.
- Robo gives the hints in its own speech bubble, from beside the problem (mockup option A, chosen by the user and
  the child).
- Cheering moments: every 20 stars, every 100 stars (with the friend), level-ups (high five with the friend), new
  operations (soccer kick), and now and then a small surprise.
- Small screens: Robo stays hidden and peeks in for the big moments only.
- Works offline, respects the mute button and the iPad's Reduce Motion setting.

## Non-goals

- Soccer mini-game, unlockables, customization, coins or a shop (later ideas from the research, not now).
- Fixed-length sets or rounds. The game stays endless.
- Changing the ladder, scoring, stars, streak rules, hints' wording or the learning path.
- Voice or recorded audio. Robo's "voice" is a short synthesized chirp at most.
- A polished phone experience. The user won't play on a phone; small screens only need to stay correct.
- Any new characters beyond Robo and its friend.

## Anti-goals (failure even if it "works")

- A celebration that blocks her: delays the next problem, eats a tap, or covers anything she needs to see or touch
  (problem, answer boxes, picture, buttons, number pad).
- Robo making a mistake feel worse: sad Robo, a fuss when a streak breaks, anything about losing.
- Making hints feel like failure. Robo should make asking for help feel good.
- Guilt, nagging, or anything she can lose by taking a break.
- Hints becoming harder to read than today (they're two lines at most and sit right by the numbers they describe).
- Losing or resetting saved progress. (This design stores nothing new, so there's no migration.)
- Breaking the small-screen layouts that were tuned before (iPhone SE, phone landscape).

## Constraints

- Vanilla TypeScript + Vite PWA, no UI framework, **no new dependencies**. Offline, like the rest.
- Main device: 10.2" iPad (≈810×1080 CSS px upright, ≈1080×810 landscape), installed to the home screen.
- **Her iPad is still on iPadOS 15** (user, 2026-11-08; upgrading failed and is being handled separately). Robo must
  work in Safari 15: no CSS container queries, so Robo's mode and positions are measured in script from the real
  layout (element sizes), not from container-query CSS. Avoid other CSS newer than Safari 15.0 for Robo. SVG, CSS
  keyframes, the Web Animations API and `prefers-reduced-motion` are all fine there.
- Upright is the main target. Landscape on iPadOS 15 has a known layout bug (stacked layout, oversized problem;
  `.context/wip.md`, "iPad landscape overlap") that is out of scope here. Robo just follows its rules there: stand
  if there's room, otherwise peek.
- Chromium screenshots can't show iPadOS 15 exactly, so the final check of positions and animations is on her iPad.
- Art follows `character/robot-character.md`: marker-sketch lines `#2b2b2b`, ~3.5px stroke at reference size, white
  body, the light is the only colour, no extra robot details. Green light `#4cd964` / glow `#c8f7c5` / rays
  `#2fa84f`; red is the red versions of all three. **Off** (the child's choice, 2026-11-08, over a yellow or green
  pulse): a pale grey light (about `#e4e1d8`), no glow, no rays, no highlight. This changes the guide's "default
  green" for in-game use; see "Robo's light" below.
- Tests: Vitest (jsdom for UI); the Playwright layout script in `.context/playwright/shots.mjs` checks layouts.

## Approaches considered

1. **Draw Robo as inline SVG and animate it with the browser's own animation (CSS keyframes and/or the Web
   Animations API). Chosen.** Her drawings are already SVG with CSS animation, so they carry over almost unchanged;
   no new dependency; works offline; the logic for *which* moment plays is plain code that unit tests cover. Cost:
   animations are tuned by eye (screenshots, then the child on the iPad).
2. **Rive** (what Duolingo uses). Smoothest, but needs authoring in Rive's visual editor, which we can't use here,
   adds a sizeable runtime, and means redrawing her character in another format.
3. **Lottie.** Same authoring problem (After Effects), and replaces her drawings rather than building on them.

## Decided

### Robo's spot and the two modes

- **Standing mode** (her iPad): Robo stands in the lower corner beside the number pad, as in her original sketch,
  in space the layout doesn't use today (the pad is capped at 460px wide). Robo must not shrink the pad or the
  problem.
- **Peek mode** (small screens, any time there isn't room to stand beside the pad without shrinking anything): Robo
  is hidden. Hints and messages work exactly as today (hint bubble above the problem, text line under it). Robo
  pops in from the bottom of the stage area, just above the buttons, never over the buttons or number pad, only for the big moments (20 stars, 100 stars, level-up, new operation), does a short
  version (arms up, light flashing, its bubble with the moment's words), and drops back out. My call: no friend in
  peek mode; keep it simple.
- The mode is decided from the actual space available, not the device name, and is re-checked on resize and
  rotation.
- All Robo layers ignore taps (`pointer-events: none`), so taps always reach what's underneath.

### Robo's light (the child chose these, 2026-11-08, from a mockup)

- **Off** while she works, and while Robo is up giving hints or walking through Pass (my call: hints and Pass are
  Robo thinking with her).
- **Green** for anything good: right answers, walks, the high five, the kick, peeking in on small screens.
- **Red** after a wrong answer, until her next key press.
- The guide's pulse moves to green moments: the light can pulse or flash while it's on.

### During a problem (standing mode)

| Moment | Robo |
|---|---|
| Problem showing, she's working | Looks at the problem (eyes toward it), flat "thinking" mouth, **light off**. A small sign of life now and then, such as a blink or a slight bob (my call, so Robo doesn't look switched off) |
| She taps Hint | Hops up beside the problem and says the hint in its own speech bubble (talking mouth), one arm pointing at the problem. Stays up for further hints |
| Wrong answer | Light turns red, kind "Not quite — try again!" in Robo's bubble. Light goes back off at her next key press (my call). If Robo is up with a hint, the hint stays in the bubble and "Not quite — try again" shows on today's text line under the problem instead (my call: the hint must never disappear) |
| Right answer, first try, no hints | Light comes on green with a bright flash, smile. No words (my call: so words stay special) |
| Right after one or more wrong tries, no hints | Green, smile, "You got it!" |
| Right after using hints | Green, smile, "You figured it out!" |
| Pass | Robo goes up (or stays up) and its bubble walks through the steps, just as hints do. No red, no words of its own |
| Next problem appears | If Robo is up, it hops back down to its spot |

- **Up by the problem:** Robo stands beside the problem on the side with room (right, as in the mockup). The problem
  shifts sideways to make room as needed; it may not shrink below what it is today, and Robo may not cover the
  answer boxes or the picture. Robo's bubble replaces today's hint bubble while Robo is up: same text, same place
  relative to the problem (above it), with its tail pointing to Robo. My call: if a particular problem leaves no
  room beside it (a wide picture), Robo stays at its spot and points up at today's bubble (mockup option B) for that
  problem.
- Wrong-answer words move from today's text line to Robo's bubble (standing mode, when Robo isn't up with a hint).
  The text line stays as the screen-reader announcement source.

### Cheering her on (never stopping her)

| Trigger | What happens | Words in Robo's bubble |
|---|---|---|
| Her star total reaches a multiple of 20 | Robo walks across the screen | "You've gotten {total} questions right! Keep going!" |
| Her star total reaches a multiple of 100 | Robo and its friend walk across together (instead of the 20-star walk) | Same as above |
| Any operation goes up a level | The friend runs in and they high-five | "High five!" (my call) |
| A new operation unlocks | The soccer kick, light flashing bright (from `robot-kick.svg`) | "New: division!" (today's unlock text) |
| Now and then, nothing in particular | A small wave or bounce at its spot | None |

- **Stars** are today's ⭐ total: answers right on the first try with no hints and no Pass. She keeps her current
  total; the first walk comes at her next multiple of 20.
- **The friend** looks exactly like Robo (user decision), as in `robots.svg`. It will usually first appear at her
  first level-up after this ships; that's an expectation, not a rule (my call: if a 100-star walk comes first, the
  friend appears there, and nothing new is saved to track it).
- **Level-downs** are silent, as today.
- **One at a time:** if several land on the same answer, only the biggest plays: kick > high five > walk with the
  friend > walk alone > surprise. The kick wins over a high five because an unlock follows a level-up. A short line
  ("You got it!") is replaced by the big moment's words.
- **Not too often (my call):** right after an unlock, the quick-settling phase can level her up every two
  problems. So walks and high fives don't play again within 4 problems of the last big moment (the kick counts as
  one); a skipped level-up still gets today's level-up sound and Robo's green flash and smile. A walk that is
  held back is **saved and plays on the next answer where it's allowed** (my call: she never misses a star
  milestone, especially the 100-star walk with the friend). The kick always plays (unlocks are rare).
- **Surprises (my call):** about 1 problem in 15, chosen at random, never on a problem with another moment and
  never two in a row.
- **Timing:** the next problem still appears 1 second after a right answer, as today. Big moments run over the
  top of the next problem (about 2–4 seconds) without covering what she needs and without delaying input. Walking
  happens along the bottom of the stage area, above the number pad.

### Sound

- Today's correct, wrong and level-up sounds stay.
- Add one short synthesized "beep boop" chirp for Robo's big moments (walks, high five, kick), with the existing
  mute button controlling it. Exact sound is the builder's.

### Reduce Motion

If the device asks for reduced motion (`prefers-reduced-motion: reduce`), Robo fades in and out instead of walking,
hopping, high-fiving or kicking. The light still changes colour and the words still appear.

### Saved progress

No change. Milestones come from her total crossing a multiple of 20 on this answer, level-ups and unlocks from what
`recordResult` already returns, and the "not too often" count lives in memory only (a reload may reset it, which is
fine).

### Code structure (my call)

- **What happens when** lives in a pure module in `src/core/` (for example `robo.ts`): given the answer's result
  (stars before and after, level change, unlocks, wrong tries, hints, Pass) plus the cooldown state and the
  random number source, it returns which moment plays and Robo's words. Unit tests cover every row of the tables
  above, the priority order, the cooldown, surprise frequency with a seeded random source, and that nothing fires on
  a level-down.
- **Drawing and animation** live in `src/ui/` (for example `robo/`): one SVG Robo with named parts, poses set by
  classes or attributes, animations in CSS keyframes or the Web Animations API. The friend is a second copy.
- `app.ts` passes results to the core module and plays what it returns.
- UI tests (jsdom) check that the right moment and words appear for each case and that Robo layers ignore taps.
- The Playwright layout script gains checks for the iPad upright and landscape (Robo beside the pad, and up by the
  problem with a hint, doesn't overlap the problem, answer boxes, picture, buttons or pad) and confirms peek mode on
  the iPhone SE.

## Left to the builder

- Exact sizes, positions, easing and durations (within the timings above), following the guide's tips (0.8s per
  walk step, about 3s for the kick, bouncy and cartoony).
- New poses not in her files: hop up, point, high five, peek, wave. Drawn from the character guide; the user and the
  child review them on screenshots.
- How the problem shifts to make room, and the exact peek-mode motion.
- The chirp sound and the surprise animations' variety.
- Where Robo stands when the iPad is in landscape (lower corner nearest the pad, same rules).
