import { answerColumns, carryCount, digitsOf } from '../arith';
import type { Problem } from '../types';
import type { Rng } from '../rng';
import { randInt } from '../rng';
import type { OpModule, Step } from './types';
import { MAX_ANSWER } from '../entry';

const oneDigit = (n: number) => n >= 1 && n <= 9;
const twoDigit = (n: number) => n >= 10 && n <= 99;
const threeDigit = (n: number) => n >= 100 && n <= 999;

function matchesAddition({ a, b, level }: Problem): boolean {
  const sum = a + b;
  const carries = carryCount(a, b);
  switch (level) {
    case 1: return oneDigit(a) && oneDigit(b) && sum <= 10;
    case 2: return oneDigit(a) && oneDigit(b) && sum >= 11 && sum <= 18;
    case 3: return twoDigit(a) && oneDigit(b) && carries === 0;
    case 4: return twoDigit(a) && twoDigit(b) && carries === 0;
    case 5: return twoDigit(a) && oneDigit(b) && carries === 1 && sum < 100;
    case 6: return twoDigit(a) && twoDigit(b) && (a % 10) + (b % 10) >= 10 && sum < 100;
    case 7: return twoDigit(a) && twoDigit(b) && sum >= 100;
    case 8: return threeDigit(a) && (twoDigit(b) || threeDigit(b)) && carries === 1 && sum < 1000;
    case 9: return threeDigit(a) && threeDigit(b) && carries >= 2;
    default: return false;
  }
}

type Range = [number, number];
type Need = 'yes' | 'no' | 'any';
interface Col { a: Range; b: Range; need: Need }

const D: Range = [0, 9];
const NZ: Range = [1, 9];
const Z: Range = [0, 0];

/**
 * Build operands column by column (ones first), choosing digits so each
 * column's carry/borrow requirement holds given the carry/borrow coming in.
 */
function build(cols: Col[], rng: Rng): { a: number; b: number } {
  let a = 0, b = 0, inFlag = 0;
  cols.forEach((col, i) => {
    for (let tries = 0; ; tries++) {
      const ad = randInt(rng, ...col.a);
      const bd = randInt(rng, ...col.b);
      const flag = ad + bd + inFlag >= 10;
      const ok = col.need === 'any' || (col.need === 'yes') === flag;
      if (ok || tries > 100) {
        a += ad * 10 ** i;
        b += bd * 10 ** i;
        inFlag = flag ? 1 : 0;
        return;
      }
    }
  });
  return { a, b };
}

function additionCols(level: number, rng: Rng): Col[] | { a: number; b: number } {
  switch (level) {
    case 1: { const a = randInt(rng, 1, 9); return { a, b: randInt(rng, 1, 10 - a) }; }
    case 2: { const a = randInt(rng, 2, 9); return { a, b: randInt(rng, 11 - a, 9) }; }
    case 3: return [{ a: D, b: NZ, need: 'no' }, { a: NZ, b: Z, need: 'no' }];
    case 4: return [{ a: D, b: D, need: 'no' }, { a: NZ, b: NZ, need: 'no' }];
    case 5: return [{ a: D, b: NZ, need: 'yes' }, { a: NZ, b: Z, need: 'no' }];
    case 6: return [{ a: D, b: D, need: 'yes' }, { a: NZ, b: NZ, need: 'no' }];
    case 7: return [{ a: D, b: D, need: 'any' }, { a: NZ, b: NZ, need: 'yes' }];
    case 8: {
      const carryCol = randInt(rng, 0, 1);
      const bThree = rng() < 0.5;
      return [
        { a: D, b: D, need: carryCol === 0 ? 'yes' : 'no' },
        { a: D, b: bThree ? D : NZ, need: carryCol === 1 ? 'yes' : 'no' },
        { a: NZ, b: bThree ? NZ : Z, need: 'no' },
      ];
    }
    default: {
      const skip = randInt(rng, 0, 2); // the one column that may or may not carry
      return [0, 1, 2].map(i => ({ a: i === 2 ? NZ : D, b: i === 2 ? NZ : D, need: i === skip ? 'any' : 'yes' }));
    }
  }
}

const NAMES = ['ones', 'tens', 'hundreds', 'thousands'];

function step(column: number | null, text: string, scratch: Record<number, string> = {}, ghosts: Array<{ column: number; digit: number }> = []): Step {
  return { column, text, scratch, ghosts };
}

function solveAddition(a: number, b: number): Step[] {
  const ad = digitsOf(a), bd = digitsOf(b);
  const cols = Math.max(ad.length, bd.length);
  const steps: Step[] = [];
  let carry = 0;
  for (let i = 0; i < cols; i++) {
    const terms = [...(carry ? [carry] : []), ...(i < ad.length ? [ad[i]] : []), ...(i < bd.length ? [bd[i]] : [])];
    const sum = terms.reduce((x, y) => x + y, 0);
    if (terms.length === 1) {
      steps.push(step(i, `Now the ${NAMES[i]}: nothing to add, so ${sum} comes straight down.`, {}, [{ column: i, digit: sum }]));
      carry = 0;
      continue;
    }
    const expr = terms.join(' + ');
    steps.push(step(i, i === 0 ? `Start with the ones: what's ${expr}?` : `Now the ${NAMES[i]}: ${expr} = ?`));
    if (sum >= 10) {
      const ghosts = [{ column: i, digit: sum % 10 }];
      const scratch: Record<number, string> = {};
      if (i + 1 < cols) scratch[i + 1] = '1';
      else ghosts.push({ column: i + 1, digit: 1 });
      steps.push(step(i,
        `${expr} = ${sum}. That's more than 9, so ${sum % 10} goes in the answer and the 1 carries to the ${NAMES[i + 1]}.`,
        scratch, ghosts));
      carry = 1;
    } else {
      steps.push(step(i, `That's ${sum}!`, {}, [{ column: i, digit: sum }]));
      carry = 0;
    }
  }
  return steps;
}

export const additionModule: OpModule = {
  matchesLevel(p: Problem): boolean {
    return matchesAddition(p);
  },
  generate(level: number, rng: Rng): Problem {
    for (let tries = 0; tries < 1000; tries++) {
      const shape = additionCols(level, rng);
      const { a, b } = Array.isArray(shape) ? build(shape, rng) : shape;
      const p: Problem = { op: '+', a, b, level };
      if (matchesAddition(p)) return p;
    }
    throw new Error(`Could not generate + level ${level}`);
  },
  targetMs(p: Problem): number {
    return 4000 + 4000 * answerColumns(p);
  },
  maxAnswerLen(): number {
    return MAX_ANSWER;
  },
  solve(p: Problem): Step[] {
    return solveAddition(p.a, p.b);
  },
};
