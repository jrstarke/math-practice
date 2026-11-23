import { answerColumns } from './arith';
import type { Problem } from './types';
import { OPS } from './operations/registry';
import { balanceCOk, numberLevelsFor, shapesFor } from './shapeTables';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 9;

/** True iff the problem satisfies the rules of its level for its operation (spec §3). */
export function matchesLevel(p: Problem): boolean {
  if (!OPS[p.op].matchesLevel(p)) return false;
  if (p.shape === undefined) return true;
  const stage = p.stage;
  if (stage === undefined || !Number.isInteger(stage) || stage < 1 || stage > 3) return false;
  if (!numberLevelsFor(stage).includes(p.level)) return false;
  if (!shapesFor(p.op, stage).includes(p.shape)) return false;
  return p.shape !== 'balance' || balanceCOk(p.a, p.b, p.c);
}

/** Time within which a first-try answer counts as "quick" (spec §4). */
export function targetMs(p: Problem): number {
  return OPS[p.op].targetMs(p);
}

/** A blank shape always draws at least this many answer boxes, so a 10 fits and the box count never gives away the digit count. */
export const BLANK_MIN_BOXES = 2;

/** Maximum length of the answer for this problem. */
export function maxAnswerLength(p: Problem): number {
  // A blank shape draws BLANK_MIN_BOXES boxes (more if the answer is longer), and that is all she may type.
  if (p.shape !== undefined) return Math.max(BLANK_MIN_BOXES, answerColumns(p));
  return OPS[p.op].maxAnswerLen(p);
}
