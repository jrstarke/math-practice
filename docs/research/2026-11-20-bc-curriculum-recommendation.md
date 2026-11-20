# What to add next, and in what order (2026-11-20)

Follows `2026-11-19-bc-curriculum-gaps.md`. Checked against the BC Grade 2 and 3 pages
(https://curriculum.gov.bc.ca/curriculum/mathematics/{2,3}/core). The child is in Grade 2.
Not checked: her current levels (stored on her iPad), so confirm the order against where she is.

## Headline
Add breadth, not more depth. The app already runs ahead of Grade 2 arithmetic (add/sub reaches Grade 3,
multiplication reaches Grade 4). What it lacks is the Grade 2 ideas around the arithmetic.

## Recommended order
1. **Missing-number and equal-sign problems** (6 + □ = 10, 10 = □ + 4, 8 + 3 = □ + 5).
   - Evidence: Grade 2 understanding of the equal sign predicted later algebra reasoning better than IQ plus attention
     combined (https://boldscience.org/understanding-of-the-equal-sign-in-grade-2-predicts-later-algebra-skills/).
     Children who read "=" as "write the answer" get these wrong; regular practice with operations on both sides
     helps (Knuth et al. 2006, https://labweb.education.wisc.edu/knuth/taar/papers_rep_pub/JRME2006.pdf).
   - BC: Grade 2 (6 + n = 10); Grade 3 one-step equations with the unknown at the start, middle or end.
   - Cheapest to build: same number pad and the existing add/sub levels, with the blank in a different place.
     `horizontalProblemView` may already cover the layout.
2. **Skip-counting by 2, 5, 10 from any start, forwards and backwards; then tens and ones and place value**
   ("what is the 4 in 342 worth?"). BC's Grade 2 number-sense core; supports her ×2, ×5, ×10 facts. Typed answers.
3. **Mental-strategy hints** (making 10, doubles, bridging). BC Grade 2 competency "develop mental math strategies";
   the current hints teach column carry/borrow. A rework of the hints, not new content (backlog item 5).
4. **Coins to 100¢**, then coins and bills to $100 (Grade 3). Fits BC financial literacy. Needs coin pictures
   (Canadian coins; cash rounds to 5¢), typed answer.
5. **Even/odd and comparing numbers to 100.** Needs a new tap-to-choose input; do it once, alongside anything else
   that needs one.

## Hold off
- Fractions, shapes, time, measurement, data: mostly hands-on or tap-a-picture, a poor fit. Time is Grade 4.
- Add/sub to 10 000 and division remainders: depth, not breadth. Build only when she runs out of levels.

## Build notes
- `Problem` is `{op, a, b, level}` and `Op` is a closed list of four operations. Anything beyond item 1 needs a
  topic/kind concept and a progress migration.
- Build item 1 as a variant of add/sub (no new ladder) to avoid that for now.

## Caveats
- The equal-sign evidence is solid. The evidence that number sense predicts later maths was thin in what was found.
- Not confirmed: division with remainders in Grade 5 (carried over from the gaps doc).
