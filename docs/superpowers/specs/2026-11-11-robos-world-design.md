# Robo's world — design (part 1: the world itself)

Date: 2026-11-11. Size: project. Builds on the Robo companion, the day streak, celebration variety and the days
practised counter (`docs/superpowers/specs/2026-11-08-robo-companion-design.md`, `…-11-11-day-streak-design.md`,
`…-11-11-celebration-variety-design.md`, `…-11-11-days-practised-design.md`). Mockups:
`.superpowers/brainstorm/1061579-1794434541/content/` (world-idea-v2, pick-moment-v2, robos-world-for-her, roads-v2).

## Intent and why

The child (who invented Robo) imagined Robo having a window onto a world. The user turned it into a reward that only
ever adds: **Robo's world**, a landscape she builds one thing at a time, one pick for every 5 days she practises
(in total, not in a row — "then it's always additive, and never feels punishing"). The world sits behind the math,
blurred; the bigger celebrations slide the math away and play out in it, so seeing it clearly is a treat she earns
(user: celebrations only, no "visit" button). Every-20-stars celebrations play there too, as motivation to keep
going after her 10 answers for the day (user).

Success: she looks forward to the next pick, can say what she's added and where, and the world never makes the
math harder or slower than the celebrations already do.

### The whole idea, in three parts (user agreed the order)

1. **The world itself** — this document.
2. **Her friends move in** — Beep, Boom and Room (the child's new characters, `character/`) are drawn and animated,
   arrive with her first three houses (my proposal, user agreed), live in them and join the world celebrations.
3. **Roads and vehicles** — she draws roads with her finger (the child's first choice), helped by smoothing and
   snapping ends onto things (her second choice, "connect two places"); cars, trucks and bikes drive along them.

Parts 2 and 3 get their own designs. Part 1 must not block them (see Constraints).

## Goals (part 1)

- **The world appears on her 5th day practised** (`day.practised` reaches 5), together with her first pick. Before
  that nothing changes: every celebration plays in the strip as today.
- **A pick for every 5 days practised**: on the answer that completes a day and brings `practised` to a multiple of
  5. Picks are never lost: one she doesn't finish (app closed, reload) is offered again (see Picks).
- **Things she can add in part 1** (the child's list, minus roads and vehicles, which are part 3): **tree, bush,
  mountain, lake, house**. As many of each as she likes.
- **Behind the math**: from then on, the world fills the app's background, blurred and still, with the problem on a
  soft white card and only a light veil over the world, so the problem, keys and buttons stay as easy to read as now
  (user, after trying it on her iPad: "both more vibrant, and also simultaneously seems less distracting").
- **World celebrations**: every 20 stars (all 7 styles), every 100 stars (the conga) and the day streak (all its
  tiers, fireworks included) slide the math away and play in the world, panning across part of it; then the math
  slides back. Picks happen inside the day celebration that earns them.
- **Strip celebrations unchanged**: level-ups and the unlock kick stay in the strip under the problem, as today
  (user: the kick is rare by the time she has a world).
- **A world that grows wider**: one long strip of land, starting one screen wide; when the area she's building in
  fills up, a new empty stretch opens to the right (user).

## Non-goals (part 1)

- Beep, Boom and Room; houses are just houses for now (part 2).
- Roads, paths and vehicles (part 3).
- Visiting the world outside celebrations, or rearranging/removing things after placing (user: celebrations only).
- Any count of days, picks or items shown as a number. No shop, coins or currency.
- Changing when celebrations happen (cooldown, priority, held-back rules stay as specified in the earlier specs).

## Anti-goals

- **Anything that takes away or shrinks her world**, or reads as "you lost something" (a broken streak never
  touches the world).
- **Motion behind the math.** Nothing in the world moves while she's working.
- **The world making the problem, keys or buttons harder to read**, or taking taps meant for them.
- **A pick that feels like homework**: long menus, lots of steps. The whole pick should take well under half a
  minute.

## Constraints

- Her iPad: iPadOS 18.7.11, installed home-screen web app, upright. Must also work on phones (where Robo peeks
  today) and in landscape.
- Built on the existing Robo moment system: `decideRobo` (src/core/robo.ts) decides the big moment per answer
  (priority kick > day > level-up > stars; cooldown 4; held-back stars/day), the view plays it and returns its
  length, Robo's random choices use `roboRng`.
- Respect Reduce Motion and mute, as every Robo moment does.
- Saved progress moves to **v9** (key `math-practice-progress-v9`), following the save pattern (older keys read once,
  never written). `day.practised` (v8) is the count of days practised.
- Leave room for parts 2 and 3: saved items carry a kind and a place that later kinds (roads, friends' houses,
  vehicles) can extend; the world drawing has layers into which characters and vehicles can later be added.

## Approaches

1. **SVG and CSS, the way Robo is built (chosen by the user).** The world is a wide vector drawing behind the app;
   each item is a small SVG drawing in the robots' marker-sketch style, placed from saved data. The blur is baked
   into a picture (see Behind the math); the slide-away and the pan are CSS movement; world celebrations reuse Robo's
   scenes at a bigger size. Same tools and tests as Robo; crisp at any size; friends and vehicles slot in later. Cost:
   a live blur is heavy on an iPad — checked: see Behind the math.
2. A canvas drawing. Smooth with any number of things, but a different way of drawing from the rest of the app,
   Robo and friends drawn twice or layered awkwardly, harder to test, more up-front work for a benefit she won't need
   for a long time. Not chosen.
3. A ready-made landscape with fixed spots. Dropped: it takes away her choosing where things go.

## Decided

### The world
- **Shape**: one long strip of land seen from the side and a little above: sky above a horizon, ground below. It's
  made of **areas** of one fixed shape: her iPad held upright (3 wide by 4 tall). (My call, after the builder check:
  a fixed shape means a rotation or another screen never stretches or squashes her world, and saved positions mean
  the same thing everywhere — part 3's roads depend on that.) It starts with one area; a new empty area opens to the right of the newest
  when the newest has enough things in it (builder: a count around 8, tuned so an area looks full but not cramped).
- **Depth**: where she places a thing sets how far away it is: higher on the ground (nearer the horizon) is farther
  and drawn smaller; lower is nearer and bigger. Things are drawn far-to-near, so nearer things overlap farther ones.
  (User: "something further up towards the horizon is further away, and something lower is closer and bigger".)
- **Kinds and how they sit** (my calls): tree, bush and house stand on the ground where she taps; a lake lies flat
  on the ground where she taps; a **mountain** always sits on the horizon (only where along it is chosen), as
  mountains far away do.
- **Look** (my call, to confirm with her on a mockup): the robots' style — dark `#2b2b2b` rounded outlines, simple
  shapes, no shading — with soft flat colours for the world (sky blue, grass green, lake blue, lilac mountains), as in
  the mockups. The sky/ground with sun is the empty world she starts with.
- **On screen** the world is scaled so its height fills the screen's height. On her iPad upright that's exactly one
  area; wider screens (landscape, a desktop) show more of the world on either side; narrower ones (a phone upright)
  show the middle of an area, and placing there uses the same swipe as moving between areas.
- **Behind the math** she sees the area she most recently placed something in (centred on it), blurred. It's still:
  no animation, no sun moving.
  - **The card** (user): the problem sits on a soft white card (rounded, ~92% white, the app's key shadow), drawn
    behind the problem without changing its layout; empty answer boxes are tinted warm cream so they still read as
    boxes on the white card. When a multiplication/division picture shows, the card covers it too (my call). A light
    veil (~15% cream) softens the world everywhere else.
  - **How it's blurred** (tested on her iPad, 2026-11-11): the world is blurred **once into a picture** (an SVG image
    with the blur inside it, redrawn only when the world changes) on **its own layer** (`will-change: transform`).
    A live CSS `filter: blur()` made Robo's hop up beside the problem visibly stutter on her iPad; the baked, layered
    version was smooth. Anything that moves over the world must not force it to repaint.

### World celebrations
- **Which**: every 20 stars (its 7 styles from the celebration-variety spec), every 100 stars (the conga), the day
  streak (its tiers: wave; arms up; jump; fireworks). Only once she has a world; before that, as today.
- **How a world celebration goes**: the problem (with the top bar) slides up and the keys and buttons slide down off
  the screen (~0.5 s), the world comes into focus, the celebration plays in the world with its words, panning across
  part of it, then the math slides back and the world blurs again (~0.5 s). Robo (and friends) are much bigger than
  in the strip (builder's call on size), standing on the ground in front of her things.
- **Panning**: a 20-star celebration pans across about one screen of her world; the day streak and the 100s conga,
  being bigger, may pan further and show more of it (builder: keep each under about 8 s in all, slide included).
  With a one-area world there's nothing to pan: it plays in place.
- **Skipping** (user): only a dedicated **skip button ("»")** ends a world celebration early and brings the math
  back; taps anywhere else do nothing, so an accidental tap never cuts a celebration short ("I could see her getting
  sad if she accidentally taps and suddenly she loses a celebration"). The button sits in a corner away from where
  the keys were (my call: top right), at least 44 px, plain and quiet so it doesn't invite tapping. Picks have no
  skip button (a pick waits; see Picks).
- **While it plays** the math isn't on screen, so nothing can be answered; her place in the problem (typed digits,
  hint state) is kept and is exactly as she left it when the math slides back.
- **Level-ups and the unlock kick** play in the strip over the blurred world, as today.

### Picks
- **When**: on the answer that completes a day and brings `practised` to a multiple of 5 (5, 10, 15…). The day
  celebration plays in the world, then Robo says something like "N days of math! Let's add something to our world!"
  and the pick opens. On day 5 this is also the moment the world appears for the first time (my call: the math
  slides away to reveal the empty world, then the pick).
- **Choosing**: three different kinds, picked at random with `roboRng` from the five (my call: three, so it's quick).
  Shown as big buttons with the drawing and its name. She taps one.
- **Placing**: "Tap where it goes!" She taps the ground; the thing appears there at the size its depth gives it. She
  can tap again to move it, and swipe left/right to place it in an older area. An OK button places it for good. Robo
  cheers beside it and says one of several happy lines, picked at random (`roboRng`) and never the same twice in a
  row (user): "That's awesome!", "That looks great!", "Cool!" (user's), plus "It's perfect!", "I love it!", "Wow!"
  (my additions). Then the math slides back.
- **Never lost** (my call): the offer (which three) and an unfinished pick are saved. If she closes the app or it
  reloads mid-pick, the same pick opens again after her next right answer. If she somehow has more than one pick
  owed, they come one at a time, one per right answer.
- **Placed is permanent**: nothing she places is moved, removed or replaced by the app.
- **Where a reopened pick ranks** (my call, after the builder check): after the unlock kick and the day celebration,
  ahead of level-ups and stars; it ignores the cooldown. A level-up that loses to it is dropped and stars wait, as
  they do today when something bigger plays.

### Reduce Motion
- No sliding, panning or travelling: the math fades out as the world fades into focus, the celebration plays as it
  does under Reduce Motion today (still poses, fades), on a still view of her world, then the math fades back.

### Small screens and landscape
- The same world and celebrations on phones and in landscape (my call): the whole screen slides away, so the strip's
  size limits don't apply. The world is scaled to the screen's height (see The world), so a rotation shows more or
  less of it, never a stretched version.
  A rotation during a world celebration ends it (as moments end on rotation today); during a pick, the pick stays
  open and re-lays out.

### Saving (progress v9)
- Adds a `world` record: the things she's placed (each with its kind, area, position along the area, and depth),
  how many picks she has used, and the open offer if any. `picksOwed = floor(day.practised / 5) − picksUsed`.
- v8 → v9: an empty world with no picks used. (With `practised` shipped today, nobody has 5 yet.)

### Sound
- Robo's beep-boop as for other moments; a soft synthesized "pop" when a thing is placed (builder's call).

## Testing

- Core: the placing line is one of the six and never repeats twice in a row; when a pick is owed (4 → 5 practised, not 4, not on a non-completing answer, 10 owed twice if two picks
  are pending, one per answer); offers are three distinct kinds; a saved offer survives a reload; world celebrations
  only once the world exists; the 7 star styles, conga and day tiers still chosen as today.
- Storage: v8 → v9 migration, v9 validation (kinds, areas, depths in range), rollback leaves v8 untouched.
- View (jsdom): world layers built from saved items, far-to-near order, mountain on the horizon, blur class behind
  the math only, slide-away and back, the skip button ends it while a tap elsewhere does not, pick flow (choose, place, move, OK), Reduce Motion classes.
- Playwright layout check: world celebrations and the pick on her iPad and a phone, upright and landscape: math fully
  off screen during, back exactly as before after; nothing of the world over the problem/keys behind the math beyond
  the blurred background; pick buttons and OK reachable; Reduce Motion.
- On her iPad: the slide-away smoothness (the blur cost behind the math was checked with a throwaway build on
  2026-11-11; see Behind the math).

## Delivery in releases (user agreed)

Each release is useful on its own, gets its own short plan, and goes to dev then prod.

1. **Her first pick (the core loop).** The world appears on day 5 practised: three choices, tap to place, Robo's
   cheer line; tree, bush, mountain, lake, house; afterwards the world sits blurred behind the math with the card.
   One area, no panning. Celebrations stay in the strip for now. The pick may show **on top of the app** (covering
   it) instead of sliding the math away; the slide-away comes with release 2. Aim: before her 5th day practised (a
   late release only means the pick waits for her).
2. **Celebrations move into her world.** The slide-away and the » skip button; the day streak, every 20 stars and
   the 100s conga play in the world (no panning yet); Reduce Motion fades.
3. **A world that grows.** New areas open to the right, the swipe while placing, celebrations pan across what she's
   built. Needed once her first area fills (about 8 things, ~40 days practised).

Then part 2 (her friends move in) and part 3 (roads and vehicles), each sliced the same way.

## Left to the builder

- Exact sizes (Robo in the world, item scale by depth, area width in world units, the "area is full" count).
- Timings of the slide, pan speed, how far each celebration pans (within the limits above).
- Item drawings (in the robots' style; confirm with the user on a mockup before finishing them).
- Where the code lives (e.g. a `world` core module and `ui/world/` views), names, save field names.
- How the world celebration reuses the existing scenes at a bigger size (scale the scene, or new world-sized
  versions of the same moves).
