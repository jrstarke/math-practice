import { answerColumns, borrowCount, digitsOf } from '../arith';
import type { Problem } from '../types';
import type { Rng } from '../rng';
import { randInt } from '../rng';
import type { OpModule, Step } from './types';
import { MAX_ANSWER } from '../entry';

const oneDigit = (n: number) => n >= 1 && n <= 9;
const twoDigit = (n: number) => n >= 10 && n <= 99;
const threeDigit = (n: number) => n >= 100 && n <= 999;
const tensDigit = (n: number) => digitsOf(n)[1] ?? 0;

function matchesSubtraction({ a, b, level }: Problem): boolean {
  if (a < b) return false;
  const borrows = borrowCount(a, b);
  switch (level) {
    case 1: return a <= 10 && oneDigit(b);
    case 2: return a >= 11 && a <= 18 && oneDigit(b) && a - b <= 9;
    case 3: return twoDigit(a) && oneDigit(b) && borrows === 0 && a > b;
    case 4: return twoDigit(a) && twoDigit(b) && borrows === 0 && a > b;
    case 5: return twoDigit(a) && oneDigit(b) && borrows === 1;
    case 6: return twoDigit(a) && twoDigit(b) && borrows === 1 && a > b;
    case 7: return threeDigit(a) && (twoDigit(b) || threeDigit(b)) && borrows === 1 && tensDigit(a) !== 0 && a > b;
    case 8: return threeDigit(a) && threeDigit(b) && borrows === 2 && tensDigit(a) !== 0 && a > b;
    case 9: return threeDigit(a) && threeDigit(b) && tensDigit(a) === 0 && a % 10 < b % 10 && a > b;
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
      const flag = ad - inFlag < bd;
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

function subtractionCols(level: number, rng: Rng): Col[] | { a: number; b: number } {
  switch (level) {
    case 1: { const a = randInt(rng, 1, 10); return { a, b: randInt(rng, 1, Math.min(9, a)) }; }
    case 2: { const a = randInt(rng, 11, 18); return { a, b: randInt(rng, a - 9, 9) }; }
    case 3: return [{ a: D, b: NZ, need: 'no' }, { a: NZ, b: Z, need: 'no' }];
    case 4: return [{ a: D, b: D, need: 'no' }, { a: NZ, b: NZ, need: 'no' }];
    case 5: return [{ a: D, b: NZ, need: 'yes' }, { a: NZ, b: Z, need: 'no' }];
    case 6: return [{ a: D, b: D, need: 'yes' }, { a: NZ, b: NZ, need: 'no' }];
    case 7: {
      const borrowCol = randInt(rng, 0, 1);
      const bThree = rng() < 0.5;
      return [
        { a: D, b: D, need: borrowCol === 0 ? 'yes' : 'no' },
        { a: NZ, b: bThree ? D : NZ, need: borrowCol === 1 ? 'yes' : 'no' },
        { a: NZ, b: bThree ? NZ : Z, need: 'no' },
      ];
    }
    case 8: return [{ a: D, b: D, need: 'yes' }, { a: NZ, b: D, need: 'yes' }, { a: [2, 9], b: NZ, need: 'no' }];
    default: return [{ a: D, b: D, need: 'yes' }, { a: Z, b: D, need: 'yes' }, { a: [2, 9], b: NZ, need: 'no' }];
  }
}

const NAMES = ['ones', 'tens', 'hundreds', 'thousands'];
const UNITS = ['a ten', 'a hundred', 'a thousand'];
const MINUS = '−';

function step(column: number | null, text: string, scratch: Record<number, string> = {}, ghosts: Array<{ column: number; digit: number }> = []): Step {
  return { column, text, scratch, ghosts };
}

function solveSubtraction(a: number, b: number): Step[] {
  const top = digitsOf(a), bd = digitsOf(b);
  const answerDigits = digitsOf(a - b).length;
  const isLeadingZero = (i: number, r: number) => r === 0 && i > 0 && i >= answerDigits;
  const ghostFor = (i: number, r: number): Array<{ column: number; digit: number }> => (isLeadingZero(i, r) ? [] : [{ column: i, digit: r }]);
  const steps: Step[] = [];

  for (let i = 0; i < top.length; i++) {
    let t = top[i];
    const hasD = i < bd.length;
    const d = hasD ? bd[i] : 0;
    const prefix = i === 0 ? 'Ones first: ' : `Now the ${NAMES[i]}: `;

    if (t >= d) {
      if (!hasD) {
        if (isLeadingZero(i, t)) continue;
        steps.push(step(i, `Now the ${NAMES[i]}: nothing to take away, so ${t} comes straight down.`, {}, ghostFor(i, t)));
        continue;
      }
      steps.push(step(i, `${prefix}${t} ${MINUS} ${d} = ?`));
      steps.push(step(i, `${t} ${MINUS} ${d} = ${t - d}.`, {}, ghostFor(i, t - d)));
      continue;
    }

    steps.push(step(i, `${prefix}${t} ${MINUS} ${d}? ${t} is smaller than ${d}, so we need to borrow.`));
    const n = top[i + 1];
    if (n > 0) {
      top[i + 1] = n - 1;
      steps.push(step(i, `Borrow ${UNITS[i]}: ${n} becomes ${n - 1}, and ${t} becomes ${t + 10}.`,
        { [i + 1]: String(n - 1), [i]: String(t + 10) }));
    } else {
      const m = top[i + 2];
      top[i + 2] = m - 1;
      top[i + 1] = 9;
      steps.push(step(i + 1,
        `The ${NAMES[i + 1]} has nothing to lend, so borrow from the ${NAMES[i + 2]} first: ${m} becomes ${m - 1} and 0 becomes 10.`,
        { [i + 2]: String(m - 1), [i + 1]: '10' }));
      steps.push(step(i, `Now the ${NAMES[i + 1]} can lend: 10 becomes 9 and ${t} becomes ${t + 10}.`,
        { [i + 1]: '9', [i]: String(t + 10) }));
    }
    t += 10;
    top[i] = t;
    steps.push(step(i, `${t} ${MINUS} ${d} = ?`));
    steps.push(step(i, `${t} ${MINUS} ${d} = ${t - d}.`, {}, ghostFor(i, t - d)));
  }
  return steps;
}

export const subtractionModule: OpModule = {
  matchesLevel(p: Problem): boolean {
    return matchesSubtraction(p);
  },
  generate(level: number, rng: Rng): Problem {
    for (let tries = 0; tries < 1000; tries++) {
      const shape = subtractionCols(level, rng);
      const { a, b } = Array.isArray(shape) ? build(shape, rng) : shape;
      const p: Problem = { op: '-', a, b, level };
      if (matchesSubtraction(p)) return p;
    }
    throw new Error(`Could not generate - level ${level}`);
  },
  targetMs(p: Problem): number {
    return 4000 + 4000 * answerColumns(p);
  },
  maxAnswerLen(): number {
    return MAX_ANSWER;
  },
  solve(p: Problem): Step[] {
    return solveSubtraction(p.a, p.b);
  },
};
