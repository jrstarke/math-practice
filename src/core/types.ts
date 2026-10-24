export type Op = '+' | '-';

/** A single practice problem. `a` is the top operand in the column layout. */
export interface Problem {
  op: Op;
  a: number;
  b: number;
  level: number;
}
