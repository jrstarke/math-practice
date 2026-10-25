import { initialOpState } from './adaptive';
import { MAX_LEVEL } from './levels';
import { opOf, type OpKey, type Progress } from './progress';
import type { Rng } from './rng';
import type { Op } from './types';

/** What each operation needs before it joins the mix: the minimum current level of other operations. */
export const UNLOCK_RULES: Record<OpKey, Partial<Record<OpKey, number>>> = {
  addition: {},
  subtraction: { addition: 3 },
};

/** Share of problems for an operation she has topped out on, relative to one she's still learning. */
export const REVIEW_SHARE = 0.2;

/** Unlock every operation whose rules are now met. Unlocks are permanent; a new one starts at level 1. */
export function applyUnlocks(p: Progress): { progress: Progress; unlocked: OpKey[] } {
  const unlocked = (Object.keys(UNLOCK_RULES) as OpKey[]).filter(key =>
    !p.unlocked.includes(key)
    && (Object.entries(UNLOCK_RULES[key]) as [OpKey, number][]).every(([other, level]) => p[other].level >= level));
  if (unlocked.length === 0) return { progress: p, unlocked };
  const progress: Progress = { ...p, unlocked: [...p.unlocked, ...unlocked] };
  for (const key of unlocked) progress[key] = initialOpState();
  return { progress, unlocked };
}

/** Choose the next problem's operation: unlocked ones share equally, topped-out ones get REVIEW_SHARE. */
export function pickOp(p: Progress, rng: Rng): Op {
  const weights = p.unlocked.map(key => (p[key].level === MAX_LEVEL ? REVIEW_SHARE : 1));
  let r = rng() * weights.reduce((x, y) => x + y, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return opOf(p.unlocked[i]);
  }
  return opOf(p.unlocked[p.unlocked.length - 1]);
}
