import { digitsOf } from '../arith';
import type { Problem } from '../types';
import type { Rng } from '../rng';
import { randInt } from '../rng';
import type { OpModule, PicturePart, PictureState, Place, Step } from './types';

type Range = [number, number];
const inRange = (n: number, [lo, hi]: Range) => n >= lo && n <= hi;

/** True iff one of a,b equals `v` exactly and the other falls in `otherRange`. */
function oneIsExactly(a: number, b: number, v: number, otherRange: Range): boolean {
  return (a === v && inRange(b, otherRange)) || (b === v && inRange(a, otherRange));
}

const SIX_SET = new Set([0, 1, 2, 3, 4, 5, 10]);

export function matchesLevel(p: Problem): boolean {
  const { a, b, level } = p;
  switch (level) {
    case 1: return oneIsExactly(a, b, 2, [2, 9]);
    case 2: return oneIsExactly(a, b, 10, [2, 9]);
    case 3: return oneIsExactly(a, b, 5, [2, 9]);
    case 4: return oneIsExactly(a, b, 3, [2, 9]);
    case 5: return oneIsExactly(a, b, 4, [2, 9]);
    case 6: return (SIX_SET.has(a) && inRange(b, [0, 9])) || (SIX_SET.has(b) && inRange(a, [0, 9]));
    case 7: return inRange(a, [6, 9]) && inRange(b, [6, 9]);
    case 8: return inRange(a, [11, 99]) && a % 10 !== 0 && inRange(b, [2, 9]);
    case 9: return inRange(a, [101, 999]) && a % 10 !== 0 && inRange(b, [2, 5]);
    default: return false;
  }
}

/** Randomly put x,y into {a,b} in either written order. */
function orderedPair(rng: Rng, x: number, y: number): { a: number; b: number } {
  return rng() < 0.5 ? { a: x, b: y } : { a: y, b: x };
}

const SIX_FIXED = [0, 1, 2, 3, 4, 5, 10];

export function generate(level: number, rng: Rng): Problem {
  switch (level) {
    case 1: { const other = randInt(rng, 2, 9); const { a, b } = orderedPair(rng, 2, other); return { op: '×', a, b, level }; }
    case 2: { const other = randInt(rng, 2, 9); const { a, b } = orderedPair(rng, 10, other); return { op: '×', a, b, level }; }
    case 3: { const other = randInt(rng, 2, 9); const { a, b } = orderedPair(rng, 5, other); return { op: '×', a, b, level }; }
    case 4: { const other = randInt(rng, 2, 9); const { a, b } = orderedPair(rng, 3, other); return { op: '×', a, b, level }; }
    case 5: { const other = randInt(rng, 2, 9); const { a, b } = orderedPair(rng, 4, other); return { op: '×', a, b, level }; }
    case 6: {
      const fixed = SIX_FIXED[randInt(rng, 0, SIX_FIXED.length - 1)];
      const other = randInt(rng, 0, 9);
      const { a, b } = orderedPair(rng, fixed, other);
      return { op: '×', a, b, level };
    }
    case 7: {
      const a = randInt(rng, 6, 9);
      const b = randInt(rng, 6, 9);
      return { op: '×', a, b, level };
    }
    case 8: {
      // a: 2-digit, never a multiple of 10 (ones digit 1-9); b: 2-9.
      const a = 10 * randInt(rng, 1, 9) + randInt(rng, 1, 9);
      const b = randInt(rng, 2, 9);
      return { op: '×', a, b, level };
    }
    default: {
      // level 9: a: 3-digit, never a multiple of 10 (ones digit 1-9), tens digit may be 0; b: 2-5.
      const a = 100 * randInt(rng, 1, 9) + 10 * randInt(rng, 0, 9) + randInt(rng, 1, 9);
      const b = randInt(rng, 2, 5);
      return { op: '×', a, b, level };
    }
  }
}

export function targetMs(p: Problem): number {
  if (p.level === 8) return 20000;
  if (p.level === 9) return 30000;
  return 8000;
}

export function maxAnswerLen(p: Problem): number {
  if (p.level === 9) return 4;
  if (p.level === 8) return 3;
  return 2;
}

/**
 * The "N groups of G" reading for a fact pair, deterministic and bounded
 * (totalGroups ≤ 9 always). Rules apply in priority order; first match wins.
 * Levels 8-9 always read the multi-digit factor (`a`) as the group size.
 */
export function groupAssignment(a: number, b: number, level: number): { groupSize: number; totalGroups: number; needsTurnAround: boolean } {
  if (level === 8 || level === 9) {
    return { groupSize: a, totalGroups: b, needsTurnAround: false };
  }
  let groupSize: number;
  let totalGroups: number;
  if (a === 0 || b === 0) {
    groupSize = 0;
    totalGroups = a === 0 ? b : a;
  } else if (a === 1 || b === 1) {
    totalGroups = 1;
    groupSize = a === 1 ? b : a;
  } else if (a === 10 || b === 10) {
    groupSize = 10;
    totalGroups = a === 10 ? b : a;
  } else {
    groupSize = Math.min(a, b);
    totalGroups = Math.max(a, b);
  }
  return { groupSize, totalGroups, needsTurnAround: level === 6 && a === groupSize && a !== b };
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function step(text: string, picture?: PictureState): Step {
  return { column: null, text, scratch: {}, ghosts: [], picture };
}

function pic(totalGroups: number, groupSize: number, groupsShown: number, groupsOutlined: number, parts: PicturePart[], tally: string[]): PictureState {
  return { totalGroups, groupSize, groupsShown, groupsOutlined, parts, tally };
}

/**
 * A single, fully-revealed part describing an undivided group (levels 1-3,
 * level 6's skip-counted/turn-around/×1 steps): one ten-rod for groupSize
 * 10 (matching levels 8-9's "tens" label convention), otherwise one part
 * sized to the whole group. Without this, a renderer building each group
 * from `parts` would draw an empty circle.
 */
function singlePart(groupSize: number): PicturePart[] {
  return groupSize === 10
    ? [{ label: 'tens', count: 1, revealed: true }]
    : [{ label: String(groupSize), count: groupSize, revealed: true }];
}

function finalStep(p: Problem, picture: PictureState): Step {
  const answer = p.a * p.b;
  return {
    column: null,
    text: `${p.a} × ${p.b} = ${answer}.`,
    scratch: {},
    ghosts: digitsOf(answer).map((digit, column) => ({ column, digit })),
    picture,
    passOnly: true,
  };
}

/**
 * "N groups of G. " — the opening words of every strategy's first step, or
 * nothing when a level-6 turn-around step has just said exactly that.
 */
function naming(totalGroups: number, groupSize: number, alreadyNamed: boolean): string {
  return alreadyNamed ? '' : `${totalGroups} groups of ${groupSize}. `;
}

type Strategy = { steps: Step[]; finalPicture: PictureState };

/**
 * Two-step skip-counting hint (levels 1-3, and level 6's 2/5/10 cases):
 * all groups are already drawn (every group is shown in full on levels
 * 1-7), so the picture doesn't grow step to step — only the tally does,
 * and it always stops one count short of the total. The counting step
 * highlights the n − 1 groups it counts; she adds the last one.
 */
function skipCountSteps(groupSize: number, totalGroups: number, alreadyNamed = false): Strategy {
  const counts = Array.from({ length: totalGroups - 1 }, (_, i) => (i + 1) * groupSize);
  const parts = singlePart(groupSize);
  const steps = [
    step(
      `${naming(totalGroups, groupSize, alreadyNamed)}Count by ${groupSize}s.`,
      pic(totalGroups, groupSize, totalGroups, 0, parts, []),
    ),
    step(
      `${counts.join(', ')}… what comes next?`,
      { ...pic(totalGroups, groupSize, totalGroups, 0, parts, [counts.join(', ')]), highlightGroups: totalGroups - 1 },
    ),
  ];
  return { steps, finalPicture: pic(totalGroups, groupSize, totalGroups, 0, parts, []) };
}

/** Double, plus one more (level 4, and level 6's ×3 case): n groups of 3, each drawn 2 + 1. */
function doublePlusOneSteps(n: number, alreadyNamed = false): Strategy {
  const groupSize = 3;
  const totalGroups = n;
  const double = n * 2;
  const parts: PicturePart[] = [{ label: 'pair', count: 2, revealed: false }, { label: 'one', count: 1, revealed: false }];
  const steps = [
    step(`${naming(totalGroups, groupSize, alreadyNamed)}Each ${groupSize} is a 2 and a 1.`,
      pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x })), [])),
    step(`${totalGroups} groups of 2 is double ${totalGroups}: ${double}. How many in the ${totalGroups} ones?`,
      pic(totalGroups, groupSize, totalGroups, 0, [{ ...parts[0], revealed: true }, { ...parts[1] }], [`${double}`])),
    step(`${totalGroups} ones is ${totalGroups}. Now add ${double} + ${totalGroups}.`,
      pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x, revealed: true })), [`${double}`, `${totalGroups}`])),
  ];
  return { steps, finalPicture: pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x, revealed: true })), []) };
}

/** Double, then double again (level 5, and level 6's ×4 case): n groups of 4, each drawn 2 + 2. */
function doubleDoubleSteps(n: number, alreadyNamed = false): Strategy {
  const groupSize = 4;
  const totalGroups = n;
  const double = n * 2;
  const parts: PicturePart[] = [{ label: 'first two', count: 2, revealed: false }, { label: 'second two', count: 2, revealed: false }];
  const steps = [
    step(`${naming(totalGroups, groupSize, alreadyNamed)}Each ${groupSize} is two 2s.`,
      pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x })), [])),
    step(`${totalGroups} groups of 2 is double ${totalGroups}: ${double}. The other 2s make ${double} too.`,
      pic(totalGroups, groupSize, totalGroups, 0, [{ ...parts[0], revealed: true }, { ...parts[1] }], [`${double}`])),
    step(`Now double ${double}: ${double} + ${double}.`,
      pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x, revealed: true })), [`${double}`, `${double}`])),
  ];
  return { steps, finalPicture: pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x, revealed: true })), []) };
}

/** Levels 8-9: mark the place a step works on (that part of the drawn group, that digit of each outline label). */
function withPlace(place: Place, picture: PictureState): PictureState {
  return { ...picture, highlightPlace: place };
}

function hintSteps(p: Problem): Strategy {
  const { a, b, level } = p;

  switch (level) {
    case 1:
    case 2:
    case 3: {
      // Each of these levels has its own fixed group size regardless of
      // the other operand's magnitude (spec table): 2, 10, 5.
      const groupSize = level === 1 ? 2 : level === 2 ? 10 : 5;
      const totalGroups = a === groupSize ? b : a;
      return skipCountSteps(groupSize, totalGroups);
    }
    // Fixed group size 3 (level 4) / 4 (level 5); totalGroups is always the
    // other operand, which is also the number doubled.
    case 4: return doublePlusOneSteps(a === 3 ? b : a);
    case 5: return doubleDoubleSteps(a === 4 ? b : a);
    case 6: {
      if (a === 0 || b === 0) {
        const { groupSize, totalGroups } = groupAssignment(a, b, 6);
        // Spelled as words, not digits: "0" would otherwise literally equal
        // String(answer) here (the answer is always 0), which the no-leak
        // check would catch even though this is only posing a question.
        const text = `How many are in ${WORDS[totalGroups]} group${totalGroups === 1 ? '' : 's'} of nothing?`;
        const steps = [step(text, pic(totalGroups, groupSize, totalGroups, 0, [], []))];
        return { steps, finalPicture: pic(totalGroups, groupSize, totalGroups, 0, [], []) };
      }
      if (a === 1 || b === 1) {
        const { groupSize, totalGroups } = groupAssignment(a, b, 6);
        const text = `How many are in one group of ${WORDS[groupSize]}?`;
        const parts = singlePart(groupSize);
        const steps = [step(text, pic(totalGroups, groupSize, totalGroups, 0, parts, []))];
        return { steps, finalPicture: pic(totalGroups, groupSize, totalGroups, 0, parts, []) };
      }
      // Mixed review (spec): turn it around if needed, then that table's own
      // strategy — skip counting for 2/5/10, level 4's double-plus-one for 3,
      // level 5's double-then-double for 4. The turn-around step already
      // names the groups, so the strategy's first step then doesn't repeat it.
      const { groupSize, totalGroups, needsTurnAround } = groupAssignment(a, b, 6);
      const strategy = groupSize === 3 ? doublePlusOneSteps(totalGroups, needsTurnAround)
        : groupSize === 4 ? doubleDoubleSteps(totalGroups, needsTurnAround)
        : skipCountSteps(groupSize, totalGroups, needsTurnAround);
      if (!needsTurnAround) return strategy;
      const turnAround = step(
        `${a} × ${b} is the same as ${b} × ${a}: ${totalGroups} groups of ${groupSize}.`,
        strategy.steps[0].picture,
      );
      return { steps: [turnAround, ...strategy.steps], finalPicture: strategy.finalPicture };
    }
    case 7: {
      // Group size is the *bigger* factor, split into 5 + the rest;
      // totalGroups is the smaller factor (spec: "7 × 8 → 7 groups of 8 (5 + 3)").
      const groupSize = Math.max(a, b);
      const totalGroups = Math.min(a, b);
      const rest = groupSize - 5;
      const fivePart = totalGroups * 5;
      const restPart = totalGroups * rest;
      const parts: PicturePart[] = [{ label: 'five', count: 5, revealed: false }, { label: 'rest', count: rest, revealed: false }];
      const steps = [
        step(`${totalGroups} groups of ${groupSize}. Split each ${groupSize} into 5 and ${rest}.`,
          pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x })), [])),
        step(`${totalGroups} groups of 5 = ${fivePart}. How many in ${totalGroups} groups of ${rest}?`,
          pic(totalGroups, groupSize, totalGroups, 0, [{ ...parts[0], revealed: true }, { ...parts[1] }], [`${fivePart}`])),
        step(`${totalGroups} groups of ${rest} = ${restPart}. Now add ${fivePart} + ${restPart}.`,
          pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x, revealed: true })), [`${fivePart}`, `${restPart}`])),
      ];
      return { steps, finalPicture: pic(totalGroups, groupSize, totalGroups, 0, parts.map(x => ({ ...x, revealed: true })), []) };
    }
    case 8: {
      const { groupSize, totalGroups } = groupAssignment(a, b, 8);
      const tens = Math.floor(groupSize / 10);
      const ones = groupSize % 10;
      const tensValue = tens * 10;
      const tensCount = tens * totalGroups;
      const tensProduct = tensValue * totalGroups;
      const onesProduct = ones * totalGroups;
      const parts: PicturePart[] = [
        { label: 'tens', count: tens, revealed: false },
        { label: 'ones', count: ones, revealed: false },
      ];
      const outlined = totalGroups - 1;
      const steps = [
        step(`${totalGroups} groups of ${groupSize}. Break ${groupSize} into ${tensValue} and ${ones}.`,
          pic(totalGroups, groupSize, 1, outlined, parts.map(x => ({ ...x })), [])),
        // tens is 1 for 11-19 ("1 ten"); tensCount = tens × totalGroups is always ≥ 2.
        step(`The tens: ${totalGroups} groups of ${tens} ${tens === 1 ? 'ten' : 'tens'} is ${tensCount} tens = ${tensProduct}. How many ones?`,
          withPlace('tens', pic(totalGroups, groupSize, 1, outlined, [{ ...parts[0], revealed: true }, { ...parts[1] }],
            [`${tensCount} tens = ${tensProduct}`]))),
        step(`${totalGroups} groups of ${ones} = ${onesProduct}. Now add ${tensProduct} + ${onesProduct}.`,
          withPlace('ones', pic(totalGroups, groupSize, 1, outlined, parts.map(x => ({ ...x, revealed: true })),
            [`${tensCount} tens = ${tensProduct}`, `${onesProduct}`]))),
      ];
      return { steps, finalPicture: pic(totalGroups, groupSize, 1, outlined, parts.map(x => ({ ...x, revealed: true })), []) };
    }
    default: {
      // level 9
      const { groupSize, totalGroups } = groupAssignment(a, b, 9);
      const h = Math.floor(groupSize / 100);
      const t = Math.floor(groupSize / 10) % 10;
      const o = groupSize % 10;
      const contributions: { name: Place; value: number; digit: number }[] = [
        { name: 'hundreds', value: h * 100, digit: h },
        ...(t !== 0 ? [{ name: 'tens' as const, value: t * 10, digit: t }] : []),
        { name: 'ones', value: o, digit: o },
      ];
      const parts: PicturePart[] = contributions.map(c => ({ label: c.name, count: c.digit, revealed: false }));
      const outlined = totalGroups - 1;
      const steps: Step[] = [];
      const tallySoFar: string[] = [];
      contributions.forEach((c, i) => {
        const product = c.value * totalGroups;
        const lead = i === 0 ? 'Start with the' : 'Now the';
        tallySoFar.push(`${c.digit * totalGroups} ${c.name} = ${product}`);
        steps.push(step(
          `${lead} ${c.name}: ${totalGroups} groups of ${c.value} = ${product}.`,
          withPlace(c.name, pic(totalGroups, groupSize, 1, outlined, parts.map((part, j) => ({ ...part, revealed: j <= i })), [...tallySoFar])),
        ));
      });
      // Stop-short add: list every nonzero place's product, unsummed
      // (spec: "Now add 1000 + 50 + 20." — never states the actual total).
      const terms = contributions.map(c => `${c.value * totalGroups}`).join(' + ');
      steps.push(step(`Now add ${terms}.`,
        pic(totalGroups, groupSize, 1, outlined, parts.map(part => ({ ...part, revealed: true })), [terms])));
      return { steps, finalPicture: pic(totalGroups, groupSize, 1, outlined, parts.map(part => ({ ...part, revealed: true })), []) };
    }
  }
}

export function solve(p: Problem): Step[] {
  const { steps, finalPicture } = hintSteps(p);
  // Carry the last hint's tally lines into the Pass picture so they don't
  // vanish on the final step (the answer itself is still only ever stated
  // via this step's text/ghosts, never added to the tally here).
  const lastTally = steps.at(-1)?.picture?.tally ?? [];
  const picture: PictureState = { ...finalPicture, tally: lastTally };
  return [...steps, finalStep(p, picture)];
}

export const multiplicationModule: OpModule = {
  matchesLevel,
  generate,
  targetMs,
  maxAnswerLen,
  solve,
};
