# Robo: Character Guide

Robo is a small, friendly robot with a light on its head. It appears in a math game, where it reacts to the player's answers, and in short animations such as walking and kicking a soccer ball.

Reference files:
- `character.svg`: Robo standing
- `robots.svg`: two copies of Robo walking side by side
- `robot-walk.svg`: walk cycle animation
- `robot-kick.svg`: soccer kick animation with a bouncing ball and speed lines

## Overall style

- Simple line drawing, like a kid's marker sketch made clean: rounded line ends and joins, no shading.
- Outline color `#2b2b2b`, stroke width about 3.5px. The body is filled white `#ffffff`.
- The only color on Robo is its light. Everything else is black and white.
- Keep it simple. Do not add panels, bolts, antennas or other "robot" details.

## Body

- A tall white shape with straight sides, a smooth rounded arch on top, and a flat bottom.
- Roughly 130 wide by 150 tall in the reference SVGs. The arch takes up about the top half.
- The body stays rigid. In animations it moves as one piece, for example bobbing up and down a few pixels with each step.

## Light (top of the head)

The light is Robo's most important feature. It is made of two parts:

1. **Mount:** a black rounded bar that attaches the light to the head. Its bottom edge follows the curve of the body's arch, so **there is never a gap** between the mount and the body.
2. **Light:** sits on top of the mount. It is slightly taller than it is wide, with straight sides and a **smooth rounded arch** on top, the same shape as the body. Add a small white curved highlight on the left side.

Default color is green:
- Light fill: `#4cd964`
- Glow behind it (soft circle, partly see-through): `#c8f7c5`
- Short rays around it: `#2fa84f`

How to use it:
- The light shows how Robo is feeling, or how the player is doing.
- **Green = good** (correct answer, "Pass", happy, ready).
- **Red = wrong** ("Try again"). In the original game sketch, the light is labeled "RED" on the wrong-answer screen. For red, make all three light colors red versions of the green ones.
- The light can **pulse** (glow fades in and out) when Robo is idle or walking, and **flash bright** at a big moment like a kick.

## Face

- **Eyes:** two short vertical lines, placed in the upper part of the body.
- **Mouth:** a single line under the eyes. It is the main way to show expression:
  - Flat line: neutral or concentrating
  - Gentle upward curve: happy or friendly
  - Filled black oval: talking, for example "Beep Boop" in a speech bubble
- **Eyebrows (optional):** short slanted lines above the eyes for a determined or "game face" look, like when kicking the ball.
- No nose, no ears.

## Arms and hands

- Thin single lines that come out of the sides of the body, around the middle.
- Each hand is a **solid black circle**.
- Arms are loose and expressive. A common pose is one arm raised with a bent elbow and the other arm hanging down.
- When walking, the arms swing opposite to the legs. When kicking, they fly outward for balance.

## Legs and feet

- Two thin straight lines from the bottom of the body.
- Each foot is a **solid black oval**, pointed in the direction Robo is moving or facing.
- When walking, the legs swing back and forth. When kicking, one leg swings back, then snaps forward fast.
- When standing still, both feet rest on the ground line.

## Speech

- Robo talks in a simple speech bubble with a pointed tail toward its mouth.
- Its catchphrase is **"Beep Boop"**.

## In the math game

From the original sketches:
- Robo stands in a lower corner of the question screen, next to the number pad.
- After the player answers, it reacts. On a correct answer it is happy with a green light ("Pass"). On a wrong answer its light turns red and it shows a "Try again" button.
- It can point to buttons with one arm.

## Animation tips

- Use about 0.8s per step for walking and about 3s for a full kick loop.
- Keep motion bouncy and cartoony. Ease in before big moves, then move fast.
- Moving objects (like the soccer ball) can have speed lines that trail behind them, point back along their direction of travel, and get shorter as they slow down.
