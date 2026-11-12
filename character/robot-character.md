# Robot Character Guide: Robo, Beep, Boom and Room

Four small, friendly robots designed from a kid's drawings. They appear in a math game, where they react to the player's answers, and in short animations. Each robot moves in its own way:

| Robot | Shape | Gets around by | Hands |
|---|---|---|---|
| **Robo** | Rounded arch body | Walking on two legs | Round black hands |
| **Beep** | Square head with goggles, rectangle body | Rolling on one wheel | U-shaped claws that pinch |
| **Boom** | Round head, triangle body | Walking (stomping) on two legs | Clamps that open to the side |
| **Room** | Square head, wide base | Gliding along the ground, or flying with spinners | Round black hands |

When drawing or animating these robots, match the reference SVGs. They are the source of truth. If this guide and an SVG disagree, follow the SVG and flag the difference.

## Reference files

| File | What it shows |
|---|---|
| `character.svg` | Robo standing |
| `robots.svg` | Two copies of Robo walking side by side |
| `robot-walk.svg` | Robo walk cycle animation |
| `robot-kick.svg` | Robo kicking a soccer ball (bouncing ball with speed lines) |
| `goggle-robot.svg` | Beep standing |
| `goggle-robot-moves.svg` | Beep range of motion: rolling, leaning, arms, elbows, claws |
| `boom.svg` | Boom standing |
| `boom-moves.svg` | Boom range of motion: stomping, arms, clamps |
| `room.svg` | Room standing |
| `room-moves.svg` | Room range of motion: gliding and flying |
| `all-robots.svg` | All four robots animating in a 2x2 grid with name labels |

All animations are plain SVG with CSS keyframes, with no JavaScript. Open them in a web browser to see them move.

---

## Shared style (all four robots)

- Simple line drawing, like a kid's marker sketch made clean: rounded line ends and joins, no shading, no gradients.
- Outline color `#2b2b2b`, stroke width about 3.5px (2.5-3px for small details like spokes and propellers).
- Bodies are filled white `#ffffff`.
- The only strong color is the light on top of the head. Everything else is black and white. (Beep's goggle lenses have a very pale blue tint, `#e6f4fb`.)
- **Eyes:** every robot has simple eyes. Robo, Boom and Room have two short vertical lines. Beep's eyes are inside its goggles.
- **Mouth:** a simple curved smile by default.
- Keep it simple. Don't add panels, bolts, antennas, or other extra "robot" details.
- Ground: a slightly wavy hand-drawn line under the robot.
- Robots are referred to as "it."

### The light (all four robots)

Every robot has the same kind of light on top of its head, made of two parts:

1. **Mount:** a black rounded bar that attaches the light to the head. There is **never a gap** between the mount and the head. On a round or arched head (Robo, Boom), the bottom edge of the mount follows the curve of the head. On a flat head (Beep, Room), the mount sits flat on top.
2. **Light:** sits on top of the mount. It is slightly taller than it is wide, with straight sides and a **smooth rounded arch** on top. Add a small white curved highlight on the left side.

Default color is green:
- Light fill: `#4cd964`
- Glow behind it (soft circle, partly see-through): `#c8f7c5`
- Short rays around it: `#2fa84f`

How to use it:
- The light shows how the robot is feeling, or how the player is doing.
- **Green = good** (correct answer, "Pass", happy, ready).
- **Red = wrong** ("Try again"). In the original game sketch, the light is labeled "RED" on the wrong-answer screen. For red, make all three light colors red versions of the green ones.
- The light **pulses** (the glow fades in and out, about 1.2-1.4s per pulse) when the robot is idle or moving, and can **flash bright** at a big moment.

---

## Robo

Walks on two legs. The first robot, and the one shown in the original math game sketches.

### Body
- A tall white shape with straight sides, a smooth rounded arch on top, and a flat bottom. The head and body are one shape.
- Roughly 130 wide by 150 tall in the reference SVGs. The arch takes up about the top half.
- The body stays rigid. In animations it moves as one piece, for example bobbing up and down a few pixels with each step.

### Face
- **Eyes:** two short vertical lines in the upper part of the body.
- **Mouth:** a single line under the eyes. It is the main way to show expression:
  - Flat line: neutral or concentrating
  - Gentle upward curve: happy or friendly
  - Filled black oval: talking, for example "Beep Boop" in a speech bubble
- **Eyebrows (optional):** short slanted lines above the eyes for a determined or "game face" look, like when kicking the ball.
- No nose, no ears.

### Arms and hands
- Thin single lines that come out of the sides of the body, around the middle.
- Each hand is a **solid black circle**.
- Arms are loose and expressive. A common pose is one arm raised with a bent elbow and the other arm hanging down.

### Legs and feet
- Two thin straight lines from the bottom of the body.
- Each foot is a **solid black oval**, pointed in the direction Robo is moving or facing.

### Moves
- **Walk:** legs swing back and forth (about 0.8s per step), arms swing opposite to the legs, and the body bobs.
- **Kick:** one leg swings back, then snaps forward fast. The arms fly outward for balance and the light flashes bright.

### Speech
- Robo talks in a simple speech bubble with a pointed tail toward its mouth. Its catchphrase is **"Beep Boop"**.

---

## Beep

Rolls on one wheel, and wears goggles.

### Head
- A large **square** head, a little wider than it is tall (about 176 by 140 in the reference SVG).
- **Goggles:** two rounded-square lenses side by side with a short bridge between them, across the upper part of the face.
- **Goggle strap:** two parallel horizontal lines that run across the whole head, behind the goggles.
- **Eyes:** a tall oval inside each lens, with a small black pupil.
- **Mouth:** a U-shaped smile under the goggles.

### Body
- A tall **rectangle**, narrower than the head, sitting right under it. Rigid, moves as one piece.

### Arms and claw hands
- **Thick tube arms** (outlined and filled white), not thin lines like Robo's.
- Each arm has two parts: an **upper arm** that comes straight out from the side of the body, and a **forearm** that points up. They meet at a round **elbow joint** (a small white circle with a black dot in the middle).
- At rest the elbows make a right angle, both arms come out at the same height, and the claws sit beside the head without touching it.
- Each hand is a **U-shaped claw**: a flat base with two prongs pointing up.

### Leg and wheel
- One short **thick leg** (tube, like the arms) under the middle of the body.
- The leg ends in a **unicycle wheel**: a circle with spokes and a solid black hub. Beep has no feet.

### Moves
- **Roll:** the wheel spins to match the distance traveled, so it never looks like it's sliding.
- **Lean:** Beep tilts its whole body from the wheel in the direction it's rolling, about 10-12 degrees. When it stops, it wobbles back past straight a little before settling.
- **Shoulders:** the whole arm swings up and down from the shoulder. The arms swing out for balance while rolling.
- **Elbows:** bend both ways, outward to reach, or inward so the claws come up in front of the face (like adjusting the goggles). When an elbow bends inward, draw the arm in front of the body so the claw stays visible.
- **Claw pinch:** the two prongs tip inward toward each other to grab, then open again. Use quick snaps (about 0.1s to close).

---

## Boom

Walks with a stomp, and has clamp hands.

### Head
- A **round** head (a circle), sitting on top of the body.
- The light mount follows the curve of the round head, with no gap.
- **Eyes:** two short vertical lines. **Mouth:** a U-shaped smile.

### Body
- A **triangle-like** shape (a tall trapezoid): narrow at the top where the head sits, wide at the bottom.

### Arms and clamp hands
- **Curved tube arms** (thick outline with a white center) that come from the upper sides of the body and curve up beside the head.
- Each hand is a **clamp** made of:
  - a **back block** where the arm attaches,
  - a small **ribbed piece** on top of the back block (a little box with two vertical lines),
  - a **top jaw** and a **bottom jaw** that stick out from the back block toward the outside, with a gap between them.
- The clamp **opens to the side**: the opening faces away from the body (left hand opens to the left, right hand opens to the right).
- To open, the top jaw tips up and the bottom jaw tips down, hinged where they meet the back block. To clamp, they snap back together.

### Legs and feet
- Two **thick tube legs** from the bottom of the body.
- Each foot is an **L-shaped boot** that points outward (left foot points left, right foot points right).

### Moves
- **Stomp walk:** legs swing from the hip (about 20 degrees), the body bobs with each step, and the arms swing a little.
- **Arm pump:** both arms swing down and back up from the shoulders, mirrored.
- **Clamp snap:** jaws open (about 30 degrees) and snap shut, often twice in a row.
- **Ta-da:** arms swing out and both clamps open wide and hold, then snap shut.

---

## Room

Glides along the ground, or flies using the spinners on its arms.

### Head
- A **square** head, about the same size as Beep's (about 156 by 150 in the reference SVG). The head is not tall and long.
- The light mount sits flat on top of the head, in the middle.
- **Eyes:** two short vertical lines near the top. **Mouth:** a U-shaped smile in the lower part of the head.

### Base
- A **wide base** under the head, shaped like a trapezoid: as wide as the head at the top and much wider at the bottom. Room has no legs or wheel. It glides on this base.

### Arms
Room has two pairs of arms:
- **Spinner arms (upper):** thick tube arms from the top corners of the head that go out and bend straight up. Each ends in a small rounded cap with a short shaft and a **three-blade spinner** (propeller) on top.
- **Lower arms:** thin single lines that come out of the base and curve up beside the head. Each ends in a **solid black oval** hand.

### Moves
- **Glide:** Room slides smoothly along the ground with a gentle hover bob. While gliding it leans forward a little, pivoting on the front corner of its base so the base never sinks into the ground.
- **Fly:** the spinners speed up (spin up over about 1s), then Room lifts off. In the air it tilts into the direction it's flying (about 10-12 degrees), and wobbles a little when it changes direction.
- **Land:** Room comes down gently, settles on its base, and the spinners slow to a stop.
- **Shadow:** a soft ellipse on the ground follows Room and gets smaller and fainter the higher it flies.

---

## In the math game

From the original sketches (drawn with Robo):
- The robot stands in a lower corner of the question screen, next to the number pad.
- After the player answers, it reacts. On a correct answer it is happy with a green light ("Pass"). On a wrong answer its light turns red and it shows a "Try again" button.
- It can point to buttons with a hand, claw, or clamp.

## Animation tips

- Keep motion bouncy and cartoony. Ease in before big moves, then move fast.
- Rigid bodies: heads and bodies don't stretch or bend. Only arms, legs, wheels, spinners, claws and clamps move relative to the body.
- Anything that rolls or spins (wheels, soccer balls) should turn the right amount for the distance it travels.
- Robots lean into the direction they're moving and wobble a little when they stop.
- Moving objects (like the soccer ball) can have speed lines that trail behind them, point back along their direction of travel, and get shorter as they slow down.
- In SVG/CSS, set `transform-box: view-box` and give each moving part a `transform-origin` at its joint (shoulder, elbow, hip, wheel hub, jaw hinge). The `*-moves.svg` files show how.
- Loop lengths in the reference animations: Robo kick about 3s, Robo walk about 0.8s per step, Beep and Boom about 8s, Room about 10s.
