import { digitsOf } from '../arith';
import type { Problem } from '../types';
import type { Rng } from '../rng';
import { randInt } from '../rng';
import type { OpModule, Step } from './types';

type Range = [number, number];
const inRange = (n: number, [lo, hi]: Range) => n >= lo && n <= hi;

/** The multiplication fact a fact-level division undoes: the divisor and the quotient. */
function factPair(p: Problem): [number, number] | null {
  if (p.b < 1 || p.a % p.b !== 0) return null;
  return [p.b, p.a / p.b];
}

/** One of the pair equals `t` exactly and the other is in `other` (either way round). */
function oneIsExactly([x, y]: [number, number], t: number, other: Range): boolean {
  return (x === t && inRange(y, other)) || (y === t && inRange(x, other));
}

/** Multiplication's level-6 review set; the other factor is 0-9. */
const SIX_FIXED = [0, 1, 2, 3, 4, 5, 10];

/** The table each of levels 1-5 undoes (the same order as multiplication's ladder). */
const FACT_TABLE: Record<number, number> = { 1: 2, 2: 10, 3: 5, 4: 3, 5: 4 };

/** Quotient with a ones digit of 1-9, so breaking apart always has ones to share. */
const notTens = (q: number) => q % 10 !== 0;

export function matchesLevel(p: Problem): boolean {
  const pair = factPair(p);
  if (!pair) return false;
  const [, q] = pair;
  switch (p.level) {
    case 1: case 2: case 3: case 4: case 5:
      return oneIsExactly(pair, FACT_TABLE[p.level], [2, 9]);
    case 6:
      return SIX_FIXED.some(t => oneIsExactly(pair, t, [0, 9]));
    case 7: return inRange(p.a, [20, 99]) && inRange(p.b, [2, 5]) && inRange(q, [10, 49]) && notTens(q);
    case 8: return inRange(p.a, [100, 999]) && inRange(p.b, [2, 5]) && notTens(q);
    case 9: return inRange(p.b, [6, 9]) && inRange(q, [6, 9]);
    default: return false;
  }
}

/** Undo the fact x × y: either factor can be the divisor (both directions appear), never 0. */
function undo(x: number, y: number, level: number, rng: Rng): Problem {
  const choices = [x, y].filter(d => d !== 0);
  const b = choices[randInt(rng, 0, choices.length - 1)];
  return { op: '÷', a: x * y, b, level };
}

export function generate(level: number, rng: Rng): Problem {
  switch (level) {
    case 1: case 2: case 3: case 4: case 5:
      return undo(FACT_TABLE[level], randInt(rng, 2, 9), level, rng);
    case 6: {
      let fixed = 0;
      let other = 0;
      while (fixed === 0 && other === 0) { // (0, 0) would need ÷ 0
        fixed = SIX_FIXED[randInt(rng, 0, SIX_FIXED.length - 1)];
        other = randInt(rng, 0, 9);
      }
      return undo(fixed, other, level, rng);
    }
    case 7: {
      const b = randInt(rng, 2, 5);
      const maxQ = Math.floor(99 / b);
      let q = 0;
      while (!notTens(q)) q = randInt(rng, 10, Math.min(49, maxQ));
      return { op: '÷', a: q * b, b, level };
    }
    case 8: {
      const b = randInt(rng, 2, 5);
      let q = 0;
      while (!notTens(q)) q = randInt(rng, Math.ceil(100 / b), Math.floor(999 / b));
      return { op: '÷', a: q * b, b, level };
    }
    default: // level 9: the 6-9 facts
      return undo(randInt(rng, 6, 9), randInt(rng, 6, 9), level, rng);
  }
}

export function targetMs(p: Problem): number {
  if (p.level === 7) return 20000;
  if (p.level === 8) return 30000;
  return 8000;
}

/** Fixed per level from its largest quotient (10, 10, 49, 499), so the box count never hints at the answer. */
export function maxAnswerLen(p: Problem): number {
  if (p.level === 8) return 3;
  if (p.level === 2 || p.level === 6 || p.level === 7) return 2;
  return 1;
}

export function solve(p: Problem): Step[] {
  const q = p.a / p.b;
  return [{
    column: null,
    text: `${p.a} ÷ ${p.b} = ${q}.`,
    scratch: {},
    ghosts: digitsOf(q).map((digit, column) => ({ column, digit })),
    passOnly: true,
  }];
}

export const divisionModule: OpModule = { matchesLevel, generate, targetMs, maxAnswerLen, solve };
