import { initialOpState } from './adaptive';
import { MAX_LEVEL, MIN_LEVEL } from './levels';
import { opOf, type OpKey, type Progress } from './progress';
import type { Rng } from './rng';
import type { Op } from './types';

/** What each operation needs before it joins the mix: the minimum current level of other operations. */
export const UNLOCK_RULES: Record<OpKey, Partial<Record<OpKey, number>>> = {
  addition: {},
  subtraction: { addition: 2 },
  multiplication: { addition: 6, subtraction: 5 },
  division: { multiplication: 2 },
};

/** An operation that may only be at, or climb to, levels another operation is already past. */
export const CAP_RULES: Partial<Record<OpKey, { by: OpKey; behind: number }>> = {
  division: { by: 'multiplication', behind: 1 },
};

/** The highest level this operation may climb to or be served at; once the leader tops out, so may it. */
export function maxLevelFor(p: Progress, key: OpKey): number {
  const rule = CAP_RULES[key];
  if (!rule) return MAX_LEVEL;
  const lead = p[rule.by].level;
  return lead === MAX_LEVEL ? MAX_LEVEL : Math.max(MIN_LEVEL, lead - rule.behind);
}

/** Share of problems for an operation she has topped out on, relative to one she's still learning. */
export const REVIEW_SHARE = 0.2;
/** Extra weight per level an operation trails her strongest one still being learned, up to MAX_WEIGHT. */
export const BEHIND_STEP = 0.25;
export const MAX_WEIGHT = 2;
/** New operations get a plain share until this level, so an unlock eases in instead of taking over. */
export const BOOST_FROM_LEVEL = 3;
/** Problems in a row of a newly unlocked operation. */
export const WELCOME_PROBLEMS = 3;

/** How likely this operation is to come up next: more the further behind it is (never zero). */
export function opWeight(p: Progress, key: OpKey): number {
  const { level } = p[key];
  if (level === MAX_LEVEL) return REVIEW_SHARE;
  if (level < BOOST_FROM_LEVEL) return 1;
  const learning = p.unlocked.map(k => p[k].level).filter(l => l < MAX_LEVEL);
  const strongest = learning.length > 0 ? Math.max(...learning) : 0;
  const ref = CAP_RULES[key] ? Math.min(strongest, maxLevelFor(p, key)) : strongest;
  return Math.min(MAX_WEIGHT, 1 + BEHIND_STEP * Math.max(0, ref - level));
}

/** Unlock every operation whose rules are now met. Unlocks are permanent; a new one starts at level 1 with a welcome. */
export function applyUnlocks(p: Progress): { progress: Progress; unlocked: OpKey[] } {
  const unlocked = (Object.keys(UNLOCK_RULES) as OpKey[]).filter(key =>
    !p.unlocked.includes(key)
    && (Object.entries(UNLOCK_RULES[key]) as [OpKey, number][]).every(([other, level]) => p[other].level >= level));
  if (unlocked.length === 0) return { progress: p, unlocked };
  const progress: Progress = { ...p, unlocked: [...p.unlocked, ...unlocked], welcome: { op: unlocked[unlocked.length - 1], left: WELCOME_PROBLEMS } };
  for (const key of unlocked) progress[key] = initialOpState();
  return { progress, unlocked };
}

/** Choose the next problem's operation: the welcome op while one is running, otherwise by opWeight. */
export function pickOp(p: Progress, rng: Rng): Op {
  if (p.welcome && p.welcome.left > 0 && p.unlocked.includes(p.welcome.op)) return opOf(p.welcome.op);
  const weights = p.unlocked.map(key => opWeight(p, key));
  let r = rng() * weights.reduce((x, y) => x + y, 0);
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return opOf(p.unlocked[i]);
  }
  return opOf(p.unlocked[p.unlocked.length - 1]);
}
