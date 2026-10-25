import type { Op, Problem } from './types';
import type { Rng } from './rng';
import { OPS } from './operations/registry';

/** Generate a problem that satisfies `matchesLevel` for the given operation and level. */
export function generate(op: Op, level: number, rng: Rng): Problem {
  return OPS[op].generate(level, rng);
}

