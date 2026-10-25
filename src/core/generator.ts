import type { Op, Problem } from './types';
import type { Rng } from './rng';
import { OPS } from './operations/registry';

/** Generate a problem that satisfies `matchesLevel` for the given operation and level. */
export function generate(op: Op, level: number, rng: Rng): Problem {
  for (let tries = 0; tries < 1000; tries++) {
    const p = OPS[op].generate(level, rng);
    if (OPS[op].matchesLevel(p)) return p;
  }
  throw new Error(`Could not generate ${op} level ${level}`);
}

