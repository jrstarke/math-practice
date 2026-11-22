export type Op = '+' | '-' | '×' | '÷';

/** Where the blank sits. With r = resultOf(p): missing-b `a op □ = r`; missing-a `□ op b = r`; flipped `r = a op □`; balance (op +) `a + b = □ + c`. */
export type Shape = 'missing-b' | 'missing-a' | 'flipped' | 'balance';

/**
 * A single practice problem. `a` is the top operand in the column layout.
 * For a shape problem, `level` is the arithmetic level its numbers come from
 * and `stage` is its shape stage.
 */
export interface Problem {
  op: Op;
  a: number;
  b: number;
  level: number;
  shape?: Shape;
  stage?: number;
  c?: number;
}
