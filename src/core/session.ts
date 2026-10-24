import { pickLevel, update, type LevelChange } from './adaptive';
import { generate } from './generator';
import { targetMs } from './levels';
import { opKey, type Progress } from './progress';
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

/** Pick an operation and level, and generate a problem not seen in `recent`. */
export function nextProblem(p: Progress, recent: Problem[], rng: Rng): Problem {
  const op: Op = rng() < 0.5 ? '+' : '-';
  const level = pickLevel(p[opKey(op)], rng);
  let problem = generate(op, level, rng);
  for (let i = 1; i < MAX_TRIES && recent.some(r => same(r, problem)); i++) {
    problem = generate(op, level, rng);
  }
  return problem;
}

/** Apply a finished problem to progress: streak, and adaptation if it was at the current level. */
export function recordResult(p: Progress, problem: Problem, a: AttemptInput): { progress: Progress; levelChange: LevelChange } {
  const clean = a.wrongSubmits === 0 && a.hintsUsed === 0 && !a.passed;
  const streak = clean ? p.streak + 1 : 0;
  const progress: Progress = { ...p, streak, bestStreak: Math.max(p.bestStreak, streak) };

  const key = opKey(problem.op);
  if (problem.level !== p[key].level) return { progress, levelChange: 0 };

  const { state, change } = update(p[key], score({ ...a, targetMs: targetMs(problem) }));
  progress[key] = state;
  return { progress, levelChange: change };
}
