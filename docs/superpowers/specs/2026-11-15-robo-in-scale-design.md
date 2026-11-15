# Robo at the world's scale (release 2.1)

## Why
In a world celebration Robo is drawn at a fixed 34% of the screen height, whatever depth he stands at. That is about twice
the height of a house, so a house placed near the bottom disappears behind his legs ("Godzilla"). The user's rule:
Robo and his friends will one day live in the houses, so they must be smaller than a door, and he must obey perspective like
everything else in her world.

## Goals
- Robo (and the conga's friends) are sized by depth like placed items, and always smaller than a door of a house at the same depth.
- Things nearer to the viewer than Robo can stand in front of him (depth order), so he can walk behind a house.
- Houses get a roomier door so Robo is still easy to see.
- Celebrations stay a party even though Robo is small.

## Non-goals / anti-goals
- No camera zoom or follow (the user's daughter picked "roomier houses" without the following camera).
- Level-ups and the kick stay in the bottom strip, unchanged.
- Nothing that makes a crowded world slow or unreadable; Robo must never cover her items.

## Approaches considered (chosen: B)
- A: truly door-sized with today's art (door 16 of 54): about 35pt on the iPad, a celebration is hard to see.
- **B: redraw houses with a bigger door (28 tall instead of 16) and make Robo about 24 tall at depth scale 1 (about 60pt): chosen by the user's daughter.**
- C: B plus a camera that zooms in and follows: rejected for now (more work, a camera move on top of the slide).
- Also rejected: Robo flying above the world, and placed things turning see-through under him.

## Design
- **Size.** `ROBO_H = 24` world units at depth scale 1; drawn height = `ROBO_H * depthScale(feetY)`. The house's door becomes
  28 tall (drawn `28 * itemScale`), so Robo is always about 0.86 of a door at the same depth. Houses are redrawn in `kinds.ts`
  (a bit larger body and a bigger, rounded door); placed houses just get the new look, no saved-data change.
- **Where he stands.**
  - Stars and the day celebration: Robo stands in the emptiest patch of ground: pick the spot (x, feetY) that has the most
    clear distance from every placed item (a simple scan over a coarse grid inside the ground zone, preferring the lower half
    so he is big enough); with no items he stands in the middle as today. The user's pick of when a world moment plays
    (only with items) is unchanged.
  - Conga: the line of friends walks a path across the world at a clear depth (the clearest horizontal band), each friend
    scaled by depth at that y, walking behind nearer things and in front of farther ones. The 6 s cap stays.
- **Depth order.** Robo's layer sits between two copies of the world picture: items with y at or above his feet (farther) are
  drawn behind him, items with y below his feet (nearer) in front. Today's blurred background plus the sharp twin that fades in
  becomes: the sharp twin is split into a "behind" and an "in front" picture, and the celebration scene is placed between them.
- **Party.** Because he is small, a burst of sparkles (new, drawn in screen pixels, about 3x Robo's height across) plays
  around him so the show still fills the screen. The words bubble keeps its size (it was too small next to the big Robo, and is
  about right next to a small one).
- **Kept as is.** The slide-away, the » skip, the 6 s cap, the 400 ms tap guard, and the shared world frame all stay.

## Left to the builder
- Exact art of the new door, the grid step of the clear-spot scan, effect scale factors, and how the conga's path dodges items.
- Update `shots.mjs` layout checks (house at the bottom, empty world, crowded world) and the existing moment tests.

## Done when
- With a house at the bottom of the ground, Robo's feet stand in clear ground, he is clearly smaller than the house's door,
  and a house nearer than him covers his legs rather than the other way round.
- An empty world and a crowded world both play all three celebrations without covering items or leaving the screen.
- Tests and `tsc` are clean; `WORLD_ONLY=1 node shots.mjs` passes on iPad, landscape iPad and phone.
