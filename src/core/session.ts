import { pickLevel, update, type LevelChange } from './adaptive';
import { generate } from './generator';
import { targetMs } from './levels';
import { applyUnlocks, pickOp } from './path';
import { opKey, type OpKey, type Progress } from './progress';
import type { Rng } from './rng';
import { score } from './scoring';
import type { Op, Problem } from './types';

export const RECENT_LIMIT = 10;
const MAX_TRIES = 50;

export interface AttemptInput {
  wrongSubmits: number;
  hintsUsed: number;
  passed: boolean;
  firstSubmitMs: number;
}

const same = (x: Problem, y: Problem) => x.op === y.op && x.a === y.a && x.b === y.b;

/** Pick an unlocked operation and a level, and generate a problem not seen in `recent`. */
export function nextProblem(p: Progress, recent: Problem[], rng: Rng): Problem {
  const op: Op = pickOp(p, rng);
  const level = pickLevel(p[opKey(op)], rng);
  let problem = generate(op, level, rng);
  for (let i = 1; i < MAX_TRIES && recent.some(r => same(r, problem)); i++) {
    problem = generate(op, level, rng);
  }
  return problem;
}

/** Apply a finished problem to progress: streak and total, adaptation if it was at the current level, then unlocks. */
export function recordResult(p: Progress, problem: Problem, a: AttemptInput): { progress: Progress; levelChange: LevelChange; unlocked: OpKey[] } {
  const clean = a.wrongSubmits === 0 && a.hintsUsed === 0 && !a.passed;
  const streak = clean ? p.streak + 1 : 0;
  const progress: Progress = { ...p, streak, bestStreak: Math.max(p.bestStreak, streak), total: p.total + (clean ? 1 : 0) };

  const key = opKey(problem.op);
  if (problem.level !== p[key].level) return { progress, levelChange: 0, unlocked: [] };

  const { state, change } = update(p[key], score({ ...a, targetMs: targetMs(problem) }));
  progress[key] = state;
  return { ...applyUnlocks(progress), levelChange: change };
}
