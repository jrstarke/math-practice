export interface Attempt {
  wrongSubmits: number;
  hintsUsed: number;
  passed: boolean;
  firstSubmitMs: number;
  targetMs: number;
}

/** Quality of a completed problem in [0, 1] (spec §4). */
export function score(a: Attempt): number {
  if (a.passed) return 0;
  if (a.hintsUsed > 0) return 0.2;
  if (a.wrongSubmits > 0) return 0.3;
  return a.firstSubmitMs <= a.targetMs ? 1 : 0.6;
}
