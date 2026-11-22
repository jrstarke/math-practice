import type { Op, Shape } from './types';

/**
 * The pure stage table for blank shapes (spec: "Goals"). Kept apart from
 * shapes.ts so levels.ts can use it without importing generator.ts (which
 * imports levels.ts); shapes.ts re-exports both functions.
 */
const TABLE: Record<'+' | '-', Record<number, Shape[]>> = {
  '+': {
    1: ['missing-b'],
    2: ['missing-a', 'flipped', 'balance'],
    3: ['missing-b', 'missing-a'],
  },
  '-': {
    1: ['missing-b'],
    2: ['missing-a', 'flipped'],
    3: ['missing-b', 'missing-a'],
  },
};

/** The shapes a stage may use for an operation; empty for other ops or stages. */
export function shapesFor(op: Op, stage: number): Shape[] {
  if (op !== '+' && op !== '-') return [];
  return [...(TABLE[op][stage] ?? [])];
}

/** The arithmetic levels a stage's numbers come from. */
export function numberLevelsFor(stage: number): number[] {
  switch (stage) {
    case 1: return [1];
    case 2: return [2];
    case 3: return [3, 4];
    default: return [];
  }
}

/** Bounds for a balance problem `a + b = □ + c`: c in 1..9, below a + b, and not a or b. */
export function balanceCOk(a: number, b: number, c: unknown): boolean {
  return typeof c === 'number' && Number.isInteger(c) && c >= 1 && c <= 9 && c < a + b && c !== a && c !== b;
}
