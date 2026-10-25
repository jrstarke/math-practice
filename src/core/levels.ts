import { answerColumns } from './arith';
import type { Problem } from './types';
import { OPS } from './operations/registry';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 9;

/** True iff the problem satisfies the rules of its level for its operation (spec §3). */
export function matchesLevel(p: Problem): boolean {
  return OPS[p.op].matchesLevel(p);
}

/** Time within which a first-try answer counts as "quick" (spec §4). */
export function targetMs(p: Problem): number {
  return OPS[p.op].targetMs(p);
}

/** Maximum length of the answer for this problem. */
export function maxAnswerLength(p: Problem): number {
  return OPS[p.op].maxAnswerLen(p);
}
