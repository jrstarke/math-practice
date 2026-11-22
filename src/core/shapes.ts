import { generate } from './generator';
import { SHAPE_MAX_STAGE } from './adaptive';
import { balanceCOk, numberLevelsFor, shapesFor } from './shapeTables';
import type { Progress, ShapeKey } from './progress';
import type { Rng } from './rng';
import type { Problem } from './types';

export { numberLevelsFor, shapesFor };

/** About 1 in 3 add/sub problems uses a blank shape. */
export const SHAPE_SHARE = 1 / 3;

/** A shape stage never exceeds the arithmetic level for that operation, nor SHAPE_MAX_STAGE. */
export function stageCap(p: Progress, key: ShapeKey): number {
  return Math.min(SHAPE_MAX_STAGE, p[key].level);
}

/**
 * Build a blank-shape problem. The rng is drawn in this fixed order:
 * 1. the numbers level, from numberLevelsFor(stage) that are <= arithLevel (always one draw);
 * 2. the base problem, via generate(op, level, rng) (a variable number of draws);
 * 3. the shape, from shapesFor(op, stage) (always one draw);
 * 4. for balance only, c (one draw, from the valid values).
 */
export function makeShapeProblem(op: '+' | '-', stage: number, arithLevel: number, rng: Rng): Problem {
  const levels = numberLevelsFor(stage).filter(l => l <= arithLevel);
  const shapes = shapesFor(op, stage);
  if (levels.length === 0 || shapes.length === 0) {
    throw new Error(`No shape problem for ${op} stage ${stage} at arithmetic level ${arithLevel}`);
  }
  const level = levels[Math.floor(rng() * levels.length)];
  const base = generate(op, level, rng);
  const shape = shapes[Math.floor(rng() * shapes.length)];
  const p: Problem = { ...base, shape, stage };
  if (shape === 'balance') {
    const options: number[] = [];
    for (let c = 1; c <= 9; c++) if (balanceCOk(base.a, base.b, c)) options.push(c);
    if (options.length === 0) throw new Error(`No balance c for ${base.a} + ${base.b}`);
    p.c = options[Math.floor(rng() * options.length)];
  }
  return p;
}
