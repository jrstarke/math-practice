import type { LevelChange } from './adaptive';
import type { OpKey } from './progress';
import type { Rng } from './rng';

/** Walks and high fives wait until more than this many problems have passed since the last big moment. */
export const COOLDOWN = 4;
export const SURPRISE_CHANCE = 1 / 15;

/** How big a day celebration is: day 1 waves, 2-4 arms up, 5-9 arms up and a jump, 10+ adds fireworks. */
export type DayTier = 'wave' | 'arms' | 'jump' | 'fireworks';

/** Level-up celebrations; one is picked at random, never the same twice in a row. Ids are also the scene names. */
export const LEVEL_UPS = ['high-five', 'jump-together', 'pass', 'dance', 'tower', 'keepy-uppy', 'light-show', 'header', 'cartwheel'] as const;
export type LevelUpStyle = (typeof LEVEL_UPS)[number];

export const LEVEL_UP_WORDS: Record<LevelUpStyle, string> = {
  'high-five': 'High five!',
  'jump-together': 'Level up!',
  pass: 'Nice pass!',
  dance: 'You leveled up!',
  tower: 'Level up!',
  'keepy-uppy': 'Level up!',
  'light-show': 'Level up!',
  header: 'Goal! Level up!',
  cartwheel: 'Wheee! Level up!',
};

/** Celebrations for every 20 stars (not the 100s, which are always the conga). */
export const STAR_STYLES = ['walk', 'walk-friend', 'dribble', 'hop', 'stop-wave', 'ball-ride', 'cartwheel'] as const;
export type StarStyle = (typeof STAR_STYLES)[number];

/** The longest conga line: more takes too long to cross and stops reading as separate friends. */
export const CONGA_MAX = 10;

/** Robots in the conga for a 100s milestone: 2 at 100, one more per hundred, up to CONGA_MAX. */
export function congaSize(milestone: number): number {
  return Math.min(CONGA_MAX, milestone / 100 + 1);
}

/** Picks uniformly from the list, skipping the one that played last. Calls the rng once. */
export function pickStyle<T>(list: readonly T[], last: T | null, rng: Rng): T {
  const choices = list.filter(x => x !== last);
  return choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
}

export type BigMoment =
  | { kind: 'kick'; words: string }
  | { kind: 'day'; days: number; tier: DayTier; words: string }
  | { kind: 'levelUp'; style: LevelUpStyle; words: string }
  | { kind: 'stars'; style: StarStyle; words: string }
  | { kind: 'conga'; robots: number; words: string };

/** What happened on one finished problem (a right answer or a Pass). */
export interface RoboOutcome {
  totalBefore: number;
  totalAfter: number;
  levelChange: LevelChange;
  unlocked: OpKey[];
  wrongSubmits: number;
  hintsUsed: number;
  passed: boolean;
  /** The new days-in-a-row count when this answer completed the day, else null. */
  dayDone: number | null;
}

/** In memory only: a reload starting afresh is fine. */
export interface RoboMemory {
  sinceBig: number;
  /** A star milestone that couldn't play yet; she never misses one. */
  pendingWalk: number | null;
  /** A completed day whose celebration couldn't play yet (an unlock's kick went first). */
  pendingDay: number | null;
  lastWasSurprise: boolean;
  /** The last celebration each group played, so neither plays the same one twice in a row. */
  lastLevelUp: LevelUpStyle | null;
  lastStars: StarStyle | null;
}

export interface RoboDecision {
  big: BigMoment | null;
  line: string | null;
  surprise: boolean;
}

export function initialRoboMemory(): RoboMemory {
  return { sinceBig: Infinity, pendingWalk: null, pendingDay: null, lastWasSurprise: false, lastLevelUp: null, lastStars: null };
}

export function walkWords(n: number): string {
  return `You've gotten ${n} questions right! Keep going!`;
}

export function dayTier(days: number): DayTier {
  return days >= 10 ? 'fireworks' : days >= 5 ? 'jump' : days >= 2 ? 'arms' : 'wave';
}

/** Never sounds like "you're done" or "you lost your streak": day 1 after a reset says the same as her first day. */
export function dayWords(days: number): string {
  return days === 1 ? 'Good job getting your math in today! Tomorrow can be day 2!' : `You did your math ${days} days in a row! Keep it up!`;
}

export function welcomeWords(total: number): string {
  return total === 0 ? "Hi! Let's do some math!" : "Welcome back, let's do some math!";
}

/** Which of Robo's moments plays after a finished problem. Only the biggest one plays. */
export function decideRobo(m: RoboMemory, o: RoboOutcome, rng: Rng): { memory: RoboMemory; decision: RoboDecision } {
  const s = m.sinceBig + 1;
  // On a Pass Robo is up walking through the steps, so walks and high fives wait for a later answer.
  const allowed = s > COOLDOWN && !o.passed;
  const milestone = o.totalAfter > o.totalBefore && o.totalAfter % 20 === 0 ? o.totalAfter : null;
  let pendingWalk = milestone ?? m.pendingWalk;
  let pendingDay = o.dayDone ?? m.pendingDay;

  let { lastLevelUp, lastStars } = m;
  let big: BigMoment | null = null;
  if (o.unlocked.length > 0) {
    big = { kind: 'kick', words: `New: ${o.unlocked.join(' and ')}!` };
  } else if (pendingDay !== null && !o.passed) {
    // Once a day, so it doesn't wait for the cooldown: it should land on the answer that completed the day.
    big = { kind: 'day', days: pendingDay, tier: dayTier(pendingDay), words: dayWords(pendingDay) };
    pendingDay = null;
  } else if (allowed && o.levelChange === 1) {
    lastLevelUp = pickStyle(LEVEL_UPS, lastLevelUp, rng);
    big = { kind: 'levelUp', style: lastLevelUp, words: LEVEL_UP_WORDS[lastLevelUp] };
  } else if (allowed && pendingWalk !== null) {
    // Sized from the milestone she earned; the words say her count now, which is later if it was held back.
    if (pendingWalk % 100 === 0) {
      big = { kind: 'conga', robots: congaSize(pendingWalk), words: walkWords(o.totalAfter) };
    } else {
      lastStars = pickStyle(STAR_STYLES, lastStars, rng);
      big = { kind: 'stars', style: lastStars, words: walkWords(o.totalAfter) };
    }
    pendingWalk = null;
  }

  let line: string | null = null;
  if (!big && !o.passed) {
    if (o.hintsUsed > 0) line = 'You figured it out!';
    else if (o.wrongSubmits > 0) line = 'You got it!';
  }

  const surprise = !big && !line && !o.passed && !m.lastWasSurprise && rng() < SURPRISE_CHANCE;

  return {
    memory: { sinceBig: big ? 0 : s, pendingWalk, pendingDay, lastWasSurprise: surprise, lastLevelUp, lastStars },
    decision: { big, line, surprise },
  };
}
