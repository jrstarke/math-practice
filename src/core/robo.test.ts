import { describe, expect, it } from 'vitest';
import {
  CONGA_MAX, LEVEL_UPS, LEVEL_UP_WORDS, STAR_STYLES, congaSize, dayTier, dayWords, decideRobo, initialRoboMemory, pickStyle,
  welcomeWords, type RoboMemory, type RoboOutcome,
} from './robo';
import { mulberry32, type Rng } from './rng';

const clean: RoboOutcome = { totalBefore: 10, totalAfter: 11, levelChange: 0, unlocked: [], wrongSubmits: 0, hintsUsed: 0, passed: false, dayDone: null };
const never: Rng = () => 0.99;
const throws: Rng = () => { throw new Error('rng should not be called'); };

/** Runs answers in order from a fresh memory; returns each decision. */
function run(outcomes: Partial<RoboOutcome>[], rng: Rng = never, start: RoboMemory = initialRoboMemory()) {
  let m = start;
  return outcomes.map(o => {
    const r = decideRobo(m, { ...clean, ...o }, rng);
    m = r.memory;
    return r;
  });
}

describe('decideRobo', () => {
  it('a clean answer has no big moment, no line', () => {
    expect(decideRobo(initialRoboMemory(), clean, never).decision).toEqual({ big: null, line: null, surprise: false });
  });

  it('right after a wrong try says "You got it!"', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, totalAfter: 10, wrongSubmits: 1 }, never).decision;
    expect(d).toEqual({ big: null, line: 'You got it!', surprise: false });
  });

  it('right after hints says "You figured it out!", also when there were wrong tries too', () => {
    const hints = { ...clean, totalAfter: 10, hintsUsed: 2 };
    expect(decideRobo(initialRoboMemory(), hints, never).decision.line).toBe('You figured it out!');
    expect(decideRobo(initialRoboMemory(), { ...hints, wrongSubmits: 3 }, never).decision.line).toBe('You figured it out!');
  });

  it('Pass has no line and no surprise', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, totalAfter: 10, passed: true, hintsUsed: 3 }, () => 0).decision;
    expect(d).toEqual({ big: null, line: null, surprise: false });
  });

  it('reaching 40 stars plays a star celebration with the milestone words', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, totalBefore: 39, totalAfter: 40 }, never).decision;
    expect(d.big).toEqual({ kind: 'stars', style: 'cartwheel', words: "You've gotten 40 questions right! Keep going!" });
    expect(d.line).toBeNull();
    expect(decideRobo(initialRoboMemory(), { ...clean, totalBefore: 39, totalAfter: 40 }, () => 0).decision.big)
      .toMatchObject({ kind: 'stars', style: 'walk' });
  });

  it('a star celebration is remembered and never plays twice in a row', () => {
    const r = decideRobo(initialRoboMemory(), { ...clean, totalBefore: 39, totalAfter: 40 }, () => 0);
    expect(r.memory.lastStars).toBe('walk');
    const next = decideRobo({ ...r.memory, sinceBig: 10 }, { ...clean, totalBefore: 59, totalAfter: 60 }, () => 0);
    expect(next.decision.big).toMatchObject({ kind: 'stars', style: 'walk-friend' });
  });

  it('reaching 100 stars plays the conga with 2 robots', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, totalBefore: 99, totalAfter: 100 }, never).decision;
    expect(d.big).toEqual({ kind: 'conga', robots: 2, words: "You've gotten 100 questions right! Keep going!" });
  });

  it('the conga grows one robot per hundred, up to 10', () => {
    const conga = (n: number) => decideRobo(initialRoboMemory(), { ...clean, totalBefore: n - 1, totalAfter: n }, () => 0).decision.big;
    expect(conga(900)).toMatchObject({ kind: 'conga', robots: 10 });
    expect(conga(1000)).toMatchObject({ kind: 'conga', robots: 10 });
  });

  it('the 100s conga does not change which star celebration played last', () => {
    const r = decideRobo({ ...initialRoboMemory(), lastStars: 'hop' }, { ...clean, totalBefore: 99, totalAfter: 100 }, never);
    expect(r.memory.lastStars).toBe('hop');
  });

  it('a total that stays on a multiple of 20 does not walk again', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, totalBefore: 40, totalAfter: 40, wrongSubmits: 1 }, never).decision;
    expect(d.big).toBeNull();
  });

  it('a level-up plays a level-up celebration with its words', () => {
    const r = decideRobo(initialRoboMemory(), { ...clean, levelChange: 1 }, never);
    expect(r.decision.big).toEqual({ kind: 'levelUp', style: 'cartwheel', words: 'Wheee! Level up!' });
    expect(r.decision.line).toBeNull();
    expect(r.memory.lastLevelUp).toBe('cartwheel');
    expect(decideRobo(initialRoboMemory(), { ...clean, levelChange: 1 }, () => 0).decision.big)
      .toEqual({ kind: 'levelUp', style: 'high-five', words: 'High five!' });
  });

  it('two level-ups in a row (cooldown over) never repeat', () => {
    const r = run([{ levelChange: 1 }, {}, {}, {}, {}, { levelChange: 1 }]);
    expect(r[0].decision.big).toMatchObject({ style: 'cartwheel' });
    expect(r[5].decision.big).toMatchObject({ kind: 'levelUp', style: 'header' });
  });

  it('a level-down does nothing', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, levelChange: -1 }, never).decision;
    expect(d.big).toBeNull();
  });

  it('an unlock kicks with the unlock words', () => {
    expect(decideRobo(initialRoboMemory(), { ...clean, unlocked: ['division'] }, never).decision.big)
      .toEqual({ kind: 'kick', words: 'New: division!' });
    expect(decideRobo(initialRoboMemory(), { ...clean, unlocked: ['subtraction', 'multiplication'] }, never).decision.big)
      .toEqual({ kind: 'kick', words: 'New: subtraction and multiplication!' });
  });

  it("kick beats high five; the same answer's walk is held back and plays when allowed", () => {
    const r = run([
      { levelChange: 1, unlocked: ['division'], totalBefore: 39, totalAfter: 40 },
      { totalBefore: 40, totalAfter: 41 }, { totalBefore: 41, totalAfter: 42 },
      { totalBefore: 42, totalAfter: 43 }, { totalBefore: 43, totalAfter: 44 },
      { totalBefore: 44, totalAfter: 45 },
    ]);
    expect(r[0].decision.big?.kind).toBe('kick');
    expect(r[0].memory.pendingWalk).toBe(40);
    for (const i of [1, 2, 3, 4]) expect(r[i].decision.big).toBeNull();
    expect(r[5].decision.big).toEqual({ kind: 'stars', style: 'cartwheel', words: "You've gotten 45 questions right! Keep going!" });
    expect(r[5].memory.pendingWalk).toBeNull();
  });

  it('within 4 problems of a big moment, a level-up gets no high five and is not saved', () => {
    const r = run([{ levelChange: 1 }, { levelChange: 1 }, { levelChange: 1 }, { levelChange: 1 }, { levelChange: 1 }, {}, { levelChange: 1 }]);
    expect(r[0].decision.big?.kind).toBe('levelUp');
    for (const i of [1, 2, 3, 4, 5]) expect(r[i].decision.big).toBeNull();
    expect(r[6].decision.big?.kind).toBe('levelUp');
  });

  it('the kick always plays, even straight after another big moment', () => {
    const r = run([{ levelChange: 1 }, { unlocked: ['subtraction'] }]);
    expect(r[0].decision.big?.kind).toBe('levelUp');
    expect(r[1].decision.big?.kind).toBe('kick');
  });

  it('a Pass counts toward the cooldown', () => {
    const pass = { passed: true, totalAfter: 10 };
    const r = run([{ levelChange: 1 }, pass, pass, pass, pass, { levelChange: 1 }]);
    expect(r[5].decision.big?.kind).toBe('levelUp');
  });

  it('a Pass never plays a walk or high five; a pending walk stays pending', () => {
    const start: RoboMemory = { ...initialRoboMemory(), sinceBig: 10, pendingWalk: 40 };
    const r = run([{ passed: true, totalBefore: 45, totalAfter: 45, levelChange: 1 }, { totalBefore: 45, totalAfter: 46 }], never, start);
    expect(r[0].decision.big).toBeNull();
    expect(r[0].memory).toEqual({ ...start, sinceBig: 11 });
    expect(r[1].decision.big).toEqual({ kind: 'stars', style: 'cartwheel', words: "You've gotten 46 questions right! Keep going!" });
  });

  it('surprise: about 1 in 15 and never two in a row', () => {
    const r = run([{}, {}, {}], () => 0);
    expect(r.map(x => x.decision.surprise)).toEqual([true, false, true]);

    let m = initialRoboMemory();
    const rng = mulberry32(5);
    let count = 0, prev = false;
    for (let i = 0; i < 15000; i++) {
      const x = decideRobo(m, { ...clean, totalBefore: 1, totalAfter: 1 }, rng);
      m = x.memory;
      if (x.decision.surprise) { count++; expect(prev).toBe(false); }
      prev = x.decision.surprise;
    }
    expect(count / 15000).toBeGreaterThan(0.045);
    expect(count / 15000).toBeLessThan(0.075);
  });

  it('no surprise on an answer with a line or a big moment, and the rng is not called then', () => {
    expect(decideRobo(initialRoboMemory(), { ...clean, wrongSubmits: 1 }, throws).decision.surprise).toBe(false);
    expect(decideRobo(initialRoboMemory(), { ...clean, unlocked: ['division'] }, throws).decision.surprise).toBe(false);
    expect(decideRobo(initialRoboMemory(), { ...clean, passed: true }, throws).decision.surprise).toBe(false);
  });
});

describe('the day streak', () => {
  it('tiers: day 1 waves, 2-4 arms up, 5-9 jump, 10 and up fireworks', () => {
    expect([1, 2, 4, 5, 9, 10, 30].map(dayTier)).toEqual(['wave', 'arms', 'arms', 'jump', 'jump', 'fireworks', 'fireworks']);
  });

  it('words: day 1 looks forward to tomorrow; later days count the days in a row', () => {
    expect(dayWords(1)).toBe('Good job getting your math in today! Tomorrow can be day 2!');
    expect(dayWords(7)).toBe('You did your math 7 days in a row! Keep it up!');
  });

  it('welcome words: hello on a first visit, welcome back after that', () => {
    expect(welcomeWords(0)).toBe("Hi! Let's do some math!");
    expect(welcomeWords(3)).toBe("Welcome back, let's do some math!");
  });

  it('the answer that completes the day celebrates it', () => {
    const d = decideRobo(initialRoboMemory(), { ...clean, dayDone: 3 }, never).decision;
    expect(d.big).toEqual({ kind: 'day', days: 3, tier: 'arms', words: 'You did your math 3 days in a row! Keep it up!' });
    expect(d.line).toBeNull();
  });

  it('plays even straight after another big moment', () => {
    const r = run([{ levelChange: 1 }, { dayDone: 2 }]);
    expect(r[1].decision.big?.kind).toBe('day');
  });

  it('beats a high five on the same answer, and the high five is not replayed', () => {
    const r = run([{ levelChange: 1, dayDone: 5 }, {}, {}, {}, {}, {}, {}]);
    expect(r[0].decision.big).toMatchObject({ kind: 'day', days: 5, tier: 'jump' });
    for (const i of [1, 2, 3, 4, 5, 6]) expect(r[i].decision.big).toBeNull();
  });

  it("beats the same answer's walk; the walk plays once the cooldown allows", () => {
    const r = run([
      { dayDone: 12, totalBefore: 39, totalAfter: 40 },
      { totalBefore: 40, totalAfter: 41 }, { totalBefore: 41, totalAfter: 42 },
      { totalBefore: 42, totalAfter: 43 }, { totalBefore: 43, totalAfter: 44 },
      { totalBefore: 44, totalAfter: 45 },
    ]);
    expect(r[0].decision.big).toMatchObject({ kind: 'day', days: 12, tier: 'fireworks' });
    for (const i of [1, 2, 3, 4]) expect(r[i].decision.big).toBeNull();
    expect(r[5].decision.big).toEqual({ kind: 'stars', style: 'cartwheel', words: "You've gotten 45 questions right! Keep going!" });
  });

  it('an unlock kicks first; the day waits past a Pass and plays on her next right answer', () => {
    const r = run([{ unlocked: ['division'], dayDone: 4 }, { passed: true, totalAfter: 10 }, {}, {}]);
    expect(r[0].decision.big?.kind).toBe('kick');
    expect(r[0].memory.pendingDay).toBe(4);
    expect(r[1].decision.big).toBeNull();
    expect(r[2].decision.big).toEqual({ kind: 'day', days: 4, tier: 'arms', words: dayWords(4) });
    expect(r[2].memory.pendingDay).toBeNull();
    expect(r[3].decision.big).toBeNull();
  });

  it('a held-back 100 is still a conga sized from 100, and says the count when it plays', () => {
    const r = run([
      { levelChange: 1 }, { totalBefore: 99, totalAfter: 100 },
      { totalBefore: 100, totalAfter: 101 }, { totalBefore: 101, totalAfter: 102 },
      { totalBefore: 102, totalAfter: 103 }, { totalBefore: 103, totalAfter: 104 },
    ]);
    expect(r[1].decision.big).toBeNull();
    expect(r[5].decision.big).toEqual({ kind: 'conga', robots: 2, words: "You've gotten 104 questions right! Keep going!" });
  });
});

describe('celebration choice', () => {
  it('the groups are exactly these, in this order', () => {
    expect(LEVEL_UPS).toEqual(['high-five', 'jump-together', 'pass', 'dance', 'tower', 'keepy-uppy', 'light-show', 'header', 'cartwheel']);
    expect(LEVEL_UP_WORDS).toEqual({
      'high-five': 'High five!', 'jump-together': 'Level up!', pass: 'Nice pass!', dance: 'You leveled up!', tower: 'Level up!',
      'keepy-uppy': 'Level up!', 'light-show': 'Level up!', header: 'Goal! Level up!', cartwheel: 'Wheee! Level up!',
    });
    expect(STAR_STYLES).toEqual(['walk', 'walk-friend', 'dribble', 'hop', 'stop-wave', 'ball-ride', 'cartwheel']);
    expect(CONGA_MAX).toBe(10);
  });

  it('congaSize: one robot per hundred starting at 2, capped at 10', () => {
    expect([100, 200, 800, 900, 1000, 2300].map(congaSize)).toEqual([2, 3, 9, 10, 10, 10]);
  });

  it('pickStyle skips the last one', () => {
    expect(pickStyle(['a', 'b', 'c'], null, () => 0)).toBe('a');
    expect(pickStyle(['a', 'b', 'c'], 'a', () => 0)).toBe('b');
    expect(pickStyle(['a', 'b', 'c'], 'c', () => 0.99)).toBe('b');
  });

  it('pickStyle is uniform over the rest and never repeats', () => {
    const rng = mulberry32(3);
    const counts = new Map<string, number>();
    let last: (typeof LEVEL_UPS)[number] | null = null;
    for (let i = 0; i < 3000; i++) {
      const p: (typeof LEVEL_UPS)[number] = pickStyle(LEVEL_UPS, last, rng);
      expect(p).not.toBe(last);
      counts.set(p, (counts.get(p) ?? 0) + 1);
      last = p;
    }
    for (const style of LEVEL_UPS) {
      expect((counts.get(style) ?? 0) / 3000).toBeGreaterThan(0.09);
      expect((counts.get(style) ?? 0) / 3000).toBeLessThan(0.14);
    }
  });
});
