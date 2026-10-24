import { matchesLevel } from './levels';
import { randInt, type Rng } from './rng';
import type { Op, Problem } from './types';

type Range = [number, number];
/** 'yes' = this column must carry (add) / borrow (sub); 'no' = must not; 'any' = either. */
type Need = 'yes' | 'no' | 'any';
interface Col { a: Range; b: Range; need: Need }

const D: Range = [0, 9];
const NZ: Range = [1, 9];
const Z: Range = [0, 0];

/**
 * Build operands column by column (ones first), choosing digits so each
 * column's carry/borrow requirement holds given the carry/borrow coming in.
 */
function build(op: Op, cols: Col[], rng: Rng): { a: number; b: number } {
  let a = 0, b = 0, inFlag = 0;
  cols.forEach((col, i) => {
    for (let tries = 0; ; tries++) {
      const ad = randInt(rng, ...col.a);
      const bd = randInt(rng, ...col.b);
      const flag = op === '+' ? (ad + bd + inFlag >= 10) : (ad - inFlag < bd);
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

/** Generate a problem that satisfies `matchesLevel` for the given operation and level. */
export function generate(op: Op, level: number, rng: Rng): Problem {
  for (let tries = 0; tries < 1000; tries++) {
    const shape = op === '+' ? additionCols(level, rng) : subtractionCols(level, rng);
    const { a, b } = Array.isArray(shape) ? build(op, shape, rng) : shape;
    const p: Problem = { op, a, b, level };
    if (matchesLevel(p)) return p;
  }
  throw new Error(`Could not generate ${op} level ${level}`);
}

