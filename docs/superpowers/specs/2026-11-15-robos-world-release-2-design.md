# Robo's world, release 2: celebrations play in her world

Date: 2026-11-15. Size: small change (the full design is in `2026-11-11-robos-world-design.md`, "World celebrations",
"Reduce Motion", "Small screens and landscape"; this note records what was settled for release 2).
Mockup: `.superpowers/brainstorm/209122-1794751394/content/celebration-in-world-2.html` (git-ignored).

## Intent and why

Seeing her world clearly is the treat she earns. Release 1 put the world behind the math, blurred. Release 2 lets the
bigger celebrations play inside it: the math slides away, the world comes into focus, Robo celebrates in front of her
things, then the math slides back.

## Goals

- Once she has a world (`world.items` not empty or a pick used), these play in the world instead of the strip:
  every-20-stars (all 7 styles), every-100-stars (the conga), the day streak (wave, arms up, jump, fireworks).
- **Slide-away** (~0.5 s): the problem and top bar slide up, the keys and buttons slide down (user confirmed down), the
  world comes into focus. After the celebration, the reverse; the world blurs again.
- **Robo is big**: about a third of the screen's height, standing on the ground in front of her things (user liked the
  mockup's size).
- **» skip button**: top right, at least 44 px, translucent and unlabeled. It is the only way to end a world
  celebration early; taps anywhere else do nothing. The math comes back immediately.
- Her place in the problem (typed digits, hint state) is kept exactly; nothing can be answered while it plays.
- **Reduce Motion**: no sliding; the math fades out, the world fades into focus, the celebration plays as it does today
  under Reduce Motion (still poses), then the math fades back.
- A rotation during a world celebration ends it, as moments end on rotation today.
- Picks keep working: the day celebration plays in the world, then the pick opens as in release 1.

## Non-goals / anti-goals

- No panning (one area until release 3). No new celebrations, no change to when they happen (cooldown, priority and
  held-back rules stay).
- Level-ups and the unlock kick stay in the strip over the blurred world.
- Nothing may make the math harder or slower: no answer is ever lost or blocked after the slide back; an accidental tap
  never cuts a celebration short.
- No live CSS `filter: blur()` on moving content (it stuttered Robo's hop on her iPad): the blurred world stays the
  baked image on its own layer, and the sharp world is the unblurred scene.

## Approaches (how the celebrations get their size)

1. **Scale the existing scenes up (chosen by the user).** Reuse the strip scenes (`src/ui/robo/scenes.ts`, `.css`)
   in a world-sized stage. Cheap, and they look exactly as she knows them, only bigger. Risk: some scenes may sit
   awkwardly on the ground or over her things; fix those individually after seeing them.
2. Redraw world-sized versions of each of the ~10 scenes: better placement, much more work. Rejected for now; may
   return for single scenes that look wrong when scaled.

## Left to the builder

- Exact slide timings and easing, and the size cap on a phone or in landscape (same behavior on all screens).
- Where the sharp world and the stage live (likely `src/ui/world/` plus `app.ts`'s moment handling).
- Skip button look within the limits above; sound (existing moment sounds, no new ones required).
- Tests: unit tests for the flow (world exists, moment routes to world, skip ends it, rotation ends it, math state
  kept), plus the Playwright layout check (iPad, landscape iPad, phone) and a Reduce Motion pass.
- On-iPad checks afterwards: slide smoothness over the blurred world, scene placement, the » being hard to hit by
  accident.
