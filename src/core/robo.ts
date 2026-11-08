import type { LevelChange } from './adaptive';
import type { OpKey } from './progress';
import type { Rng } from './rng';

/** Walks and high fives wait until more than this many problems have passed since the last big moment. */
export const COOLDOWN = 4;
export const SURPRISE_CHANCE = 1 / 15;

export type BigMoment =
  | { kind: 'kick'; words: string }
  | { kind: 'highFive'; words: string }
  | { kind: 'walk'; withFriend: boolean; words: string };

/** What happened on one finished problem (a right answer or a Pass). */
export interface RoboOutcome {
  totalBefore: number;
  totalAfter: number;
  levelChange: LevelChange;
  unlocked: OpKey[];
  wrongSubmits: number;
  hintsUsed: number;
  passed: boolean;
}

/** In memory only: a reload starting afresh is fine. */
export interface RoboMemory {
  sinceBig: number;
  /** A star milestone that couldn't play yet; she never misses one. */
  pendingWalk: number | null;
  lastWasSurprise: boolean;
}

export interface RoboDecision {
  big: BigMoment | null;
  line: string | null;
  surprise: boolean;
}

export function initialRoboMemory(): RoboMemory {
  return { sinceBig: Infinity, pendingWalk: null, lastWasSurprise: false };
}

export function walkWords(n: number): string {
  return `You've gotten ${n} questions right! Keep going!`;
}

function walk(n: number): BigMoment {
  return { kind: 'walk', withFriend: n % 100 === 0, words: walkWords(n) };
}

/** Which of Robo's moments plays after a finished problem. Only the biggest one plays. */
export function decideRobo(m: RoboMemory, o: RoboOutcome, rng: Rng): { memory: RoboMemory; decision: RoboDecision } {
  const s = m.sinceBig + 1;
  // On a Pass Robo is up walking through the steps, so walks and high fives wait for a later answer.
  const allowed = s > COOLDOWN && !o.passed;
  const milestone = o.totalAfter > o.totalBefore && o.totalAfter % 20 === 0 ? o.totalAfter : null;
  let pendingWalk = milestone ?? m.pendingWalk;

  let big: BigMoment | null = null;
  if (o.unlocked.length > 0) {
    big = { kind: 'kick', words: `New: ${o.unlocked.join(' and ')}!` };
  } else if (allowed && o.levelChange === 1) {
    big = { kind: 'highFive', words: 'High five!' };
  } else if (allowed && pendingWalk !== null) {
    big = walk(pendingWalk);
    pendingWalk = null;
  }

  let line: string | null = null;
  if (!big && !o.passed) {
    if (o.hintsUsed > 0) line = 'You figured it out!';
    else if (o.wrongSubmits > 0) line = 'You got it!';
  }

  const surprise = !big && !line && !o.passed && !m.lastWasSurprise && rng() < SURPRISE_CHANCE;

  return {
    memory: { sinceBig: big ? 0 : s, pendingWalk, lastWasSurprise: surprise },
    decision: { big, line, surprise },
  };
}
