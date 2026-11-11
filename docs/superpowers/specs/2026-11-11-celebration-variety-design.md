# Celebration variety — design

Date: 2026-11-11. Size: project. Builds on the Robo companion (`docs/superpowers/specs/2026-11-08-robo-companion-design.md`)
and the day streak (`docs/superpowers/specs/2026-11-11-day-streak-design.md`).

## Intent and why

Every level-up plays the same high five and every 20 stars plays the same walk. They're starting to feel samey. The
user wants **variety and surprise**: each time, Robo picks one of several celebrations at random. The child invented
Robo; the celebrations are playful, soccer-flavoured, and always encouragement to keep going — never a stopping point.

Success: over a week of play she sees lots of different celebrations, rarely the same one twice close together, and
none of them slows her down or covers her work.

## Goals

- **Level-ups**: one of these, picked at random (user chose all of them from mockups):
  1. **High five** — today's (the friend runs in, they high-five). "High five!"
  2. **Jump together** — Robo and the friend side by side, arms up, jump twice. "Level up!"
  3. **Pass to the friend** — Robo kicks the ball (today's kick wind-up) across to the friend, who throws its arms up
     and jumps for joy. "Nice pass!"
  4. **A little dance** — Robo sways with arms swinging alternately and little leg kicks. "You leveled up!"
  5. **Tower** — two friends stand side by side; Robo runs in and jumps up to stand on their heads; then all three
     throw their arms up and the words appear. "Level up!" (user's idea)
  6. **Keepy-uppy** — Robo taps the ball up off its foot four times, then it lands on Robo's head; arms up. "Level up!"
  7. **Light show** — Robo sways while its light cycles green, yellow, blue, purple (never red). "Level up!"
  8. **Header into a goal** — the friend tosses the ball, Robo heads it into a small net. "Goal! Level up!"
  9. **Cartwheel** — Robo cartwheels across, arms up like a star. "Wheee! Level up!" (user's idea)
- **Every 20 stars** (not multiples of 100): one of these, picked at random, all saying today's words
  "You've gotten N questions right! Keep going!" (N = her count when it plays, as today):
  1. **Walk across** — today's.
  2. **Walk with the friend** — today's 100s walk, moved down to the 20s (user).
  3. **Dribble across** — walking with the ball rolling along in front.
  4. **Hop across** — bouncing across with arms up.
  5. **Stop and wave** — walks in, **stops (feet still, user's note)**, waves at her, walks on.
  6. **Ball ride** — Robo balances (swaying, arms up) on a big ball rolling across.
  7. **Cartwheel** — as above, with the count words (user: in both groups).
- **Every 100 stars: a growing conga line** (user): Robo and friends bob across in a line, a kick every few steps, with
  today's count words. One robot per hundred, starting at 2: 100 → 2 robots, 200 → 3, … 900 → 10, and 10 from then on
  (cap agreed with the user: a longer line takes too long to cross and stops reading as separate friends). The count
  comes from the milestone she earned (a held-back 100 still gets its own size). Same walking speed as the walk, so a
  longer line takes longer to pass (about 7 s for 10 robots on her iPad). Always the conga — not random.
  **Coloured lights** (user): Robo leads with its green light; each friend behind it has its own light colour in a
  **fixed order** (user), so each new hundred adds the next colour at the end of the line: yellow, blue, purple,
  orange, pink, teal, light blue, lime, lavender (friends 1–9). Never red, and orange/pink kept clearly away from red
  (my call on the exact shades, with glow and rays to match like `LIGHT` in `drawing.ts`). The coloured lights are
  only in the conga; friends elsewhere keep the green light.
- **No repeats in a row**: a group never plays the same celebration twice in a row. (My call.) The rule is per group,
  so a level-up cartwheel may be followed by a 20-star cartwheel; that's rare and harmless.

## Non-goals

- No change to **when** celebrations play: cooldown (4 problems), held-back 20-star celebrations, priority
  (kick > day > level-up > 20 stars), level-ups during cooldown skipped — all as today.
- No change to the **unlock kick** or the **day streak** (its fireworks stay exclusive to it — user).
- Not chosen by the user from the mockups: take a bow, moonwalk. Not part of this.
- No sound changes beyond today's beep-boop per moment. No shop, unlocks, settings or collection of celebrations.

## Anti-goals

- Anything that reads as Robo failing (tripping, falling, missing the goal).
- Red on Robo's light during a celebration (red means "wrong").
- A celebration covering the problem, answer boxes, hint bubble, picture or controls, or taking taps.
- Fireworks anywhere but the day streak.

## Constraints

- Moments play in the **lane under the problem**, which is only as tall as the room there: Robo's height, or less
  (down to 56px, `layout.momentSize`). Celebrations that go **above Robo's head** (tower, keepy-uppy, header, ball
  ride, cartwheel, jumps/hops) must still fit inside the lane: draw the actors smaller in those scenes so the whole
  scene stays inside it (e.g. the tower is ~1.75 Robos tall, so its Robos are lane ÷ 1.75). Nothing may poke above
  the lane.
- Existing rules: moments refit to the next problem's room, end on a rotation, respect Reduce Motion and mute; the
  lane overlay takes no taps; small screens (peek mode) show the existing peek with the celebration's words.
- Her iPad: iPadOS 18.7.11, home-screen web app.
- Robo's random choices use the app's separate Robo random source (`roboRng`), so problem sequences don't change.

## Approaches considered

1. **The decision code picks; the view knows how to play each one (chosen by the user).** `decideRobo` (core) picks
   the celebration from its group at random, skipping the last one, and returns it in the `BigMoment`. The view has
   one small scene builder per celebration, built from today's pieces (figure, slot, words, ball), with its moves in
   `robo.css`. Testable; adding a celebration later = one scene + one list entry.
2. The view picks at random when it plays. Randomness and "no repeat" memory would sit in the hardest-to-test layer,
   split from Robo's other random choices. Not chosen.
3. A general choreography engine (celebrations as data). Most flexible for future ideas, but much more up-front work
   than these 15 simple scenes warrant. Not chosen.

## Decided

### Choosing
- Level-up and 20-star celebrations are each a named list in core (`src/core/robo.ts` or a sibling module). On a
  level-up (that plays) / a 20-star milestone (that plays): pick uniformly at random among the group **except the
  one that group played last**. Memory lives in Robo's in-memory memory (`RoboMemory`); a reload starts afresh.
  (My call: in memory is fine — a repeat right after a reload is harmless.)
- The 100s: always the conga line, sized from the earned milestone: `min(10, milestone / 100 + 1)` robots (not part
  of the random group).
- The chosen celebration and its words are part of the `BigMoment` the view receives. 20-star words use the count
  at play time (unchanged from today).

### Each celebration (the mockups are the reference)
- Mockups (rough timing and sizes, real drawing; the scenes run on their own in a browser, the card styling came from
  the brainstorm frame): `docs/superpowers/mockups/2026-11-11-celebrations/` —
  `celebrations-v3.html` (high five, jump together, pass, dance, tower, cartwheel, walk, dribble, hop, stop-and-wave)
  and `ideas-v2.html` (keepy-uppy, light show, header, conga, ball ride). Their CSS keyframes and scene builders are a
  starting point, not production code.
- Durations in line with today's moments (2.5–4.5 s). Words show for the whole celebration except where a reveal is
  the point (tower, keepy-uppy, header: words appear at the payoff).
- Robo's light is green and smiling throughout, except the light show's colour cycle (green, yellow, blue, purple).
- **More robots** (tower: 3; conga: 2–10): every robot besides Robo is drawn exactly like the friend (the child's art
  has identical robots). This lifts the Robo spec's "no new characters beyond Robo and its friend" for these scenes
  (the user chose them). Robo leads the conga line.
- **Goal** (header): a small net drawn in the same line style (dark outline, light mesh), at the lane's far side.
- **Stop and wave**: the legs swing only while moving; they stand still while it waves.
- **Tower**: Robo jumps up from the side and lands standing on the two friends' heads; arms go up on landing.
- **Cartwheel**: travels across while turning about its middle, arms up; two turns.

### Reduce Motion
- No travelling, jumping, spinning or flying: each celebration fades in and out with its actors in their final pose
  (arms up where they end that way), as the existing moments do. Props (ball, net, big ball) show still, in their final
  positions (my call). The light show may still change colour (not motion).

### Testing
- Core: picking is uniform over the group minus the last one; never the same twice in a row; 100s always the conga
  with 2 robots at 100, 3 at 200, 10 at 900 and 1000+ (and a held-back 100 keeps its earned size); each group's list
  exactly as above; the cooldown/priority/held-back rules are unchanged.
- View (jsdom): each celebration builds its scene (the right `data-moment`, actors, ball/goal where needed, words).
- Dev preview page: one `?moment=` per celebration.
- Playwright layout check: every celebration in every view (standing, peek, Reduce Motion), mid-moment: nothing over
  the problem, answer boxes, bubble, picture or controls, nothing above the lane, taps reach the pad. The check needs
  a way to force a specific celebration (builder's call: e.g. a dev-only hook or a seeded `roboRng`).

## Left to the builder

- Names (celebration ids, scene/CSS class names), module layout, and how `BigMoment` carries the choice.
- Exact timings, jump heights, how much each scene shrinks its actors to fit the lane, ball and goal sizes.
- How the layout check forces a celebration.
- Whether existing `MOMENT_MS` entries become per-celebration durations.
