import { answerOf } from '../arith';
import { generate } from '../generator';
import { mulberry32 } from '../rng';
import { matchesLevel, maxAnswerLen, solve, targetMs } from './division';
import { solve as solveAny } from '../solver';
import type { PicturePart } from './types';
import type { Problem } from '../types';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const sampleOf = (level: number, seed = level * 100 + 7): Problem[] => {
  const rng = mulberry32(seed);
  return Array.from({ length: 1000 }, () => generate('÷', level, rng));
};
const pairOf = (p: Problem) => [p.b, p.a / p.b];
const inRange = (n: number, lo: number, hi: number) => n >= lo && n <= hi;

for (const level of LEVELS)
  test(`÷ level ${level}: 1000 seeded problems match, divide evenly and fit the answer boxes`, () => {
    for (const p of sampleOf(level)) {
      expect(p).toMatchObject({ op: '÷', level });
      expect(matchesLevel(p)).toBe(true);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.a % p.b).toBe(0);
      expect(String(p.a / p.b).length).toBeLessThanOrEqual(maxAnswerLen(p));
    }
  });

test.each([[1, 2], [2, 10], [3, 5], [4, 3], [5, 4]])('÷ level %i problems undo a × %i fact', (level, t) => {
  for (const p of sampleOf(level)) {
    const [x, y] = pairOf(p);
    expect((x === t && inRange(y, 2, 9)) || (y === t && inRange(x, 2, 9))).toBe(true);
  }
});

test('÷ level 6 undoes a mixed-review fact and never divides by zero', () => {
  const fixed = [0, 1, 2, 3, 4, 5, 10];
  for (const p of sampleOf(6)) {
    const [x, y] = pairOf(p);
    expect(p.b).not.toBe(0);
    expect((fixed.includes(x) && inRange(y, 0, 9)) || (fixed.includes(y) && inRange(x, 0, 9))).toBe(true);
  }
});

test('÷ level 7 is a 2-digit dividend ÷ 2–5 with a 2-digit quotient that is not a multiple of 10', () => {
  for (const p of sampleOf(7)) {
    const q = p.a / p.b;
    expect(inRange(p.a, 20, 99) && inRange(p.b, 2, 5) && inRange(q, 10, 49) && q % 10 !== 0).toBe(true);
  }
});

test('÷ level 8 is a 3-digit dividend ÷ 2–5 with a quotient that is not a multiple of 10', () => {
  const ps = sampleOf(8);
  for (const p of ps) expect(inRange(p.a, 100, 999) && inRange(p.b, 2, 5) && (p.a / p.b) % 10 !== 0).toBe(true);
  // Includes problems where every hundred has to be traded (345 ÷ 5).
  expect(ps.some(p => Math.floor(p.a / 100) < p.b)).toBe(true);
});

test('÷ level 9 undoes a 6–9 fact', () => {
  for (const p of sampleOf(9)) {
    const [x, y] = pairOf(p);
    expect(inRange(x, 6, 9) && inRange(y, 6, 9)).toBe(true);
  }
});

test('both directions of a fact appear (12 ÷ 2 and 12 ÷ 6)', () => {
  const ps = sampleOf(1);
  expect(ps.some(p => p.b === 2 && p.a / p.b !== 2)).toBe(true);
  expect(ps.some(p => p.a / p.b === 2 && p.b !== 2)).toBe(true);
});

test.each([
  [72, 3, 7], [22, 2, 7], [95, 5, 7],
  [345, 5, 8], [412, 4, 8], [105, 5, 8],
  [12, 2, 1], [12, 6, 1], [40, 10, 2], [40, 4, 2], [0, 4, 6], [9, 1, 6], [90, 9, 6], [42, 6, 9],
] as const)('%i ÷ %i is level %i', (a, b, level) =>
  expect(matchesLevel({ op: '÷', a, b, level })).toBe(true));

test.each([
  [73, 3, 7], [60, 3, 7], [18, 2, 7], [72, 6, 7],
  [100, 5, 8], [96, 4, 8], [345, 6, 8],
  [13, 2, 1], [12, 3, 1], [4, 0, 6], [0, 0, 6], [42, 6, 1], [30, 6, 9], [40, 5, 9],
] as const)('%i ÷ %i is NOT level %i', (a, b, level) =>
  expect(matchesLevel({ op: '÷', a, b, level })).toBe(false));

const sample = (level: number): Problem => ({ op: '÷', a: 72, b: 3, level });

test.each([[1, 1], [2, 2], [3, 1], [4, 1], [5, 1], [6, 2], [7, 2], [8, 3], [9, 1]] as const)(
  'maxAnswerLen for ÷ level %i is %i', (level, len) => expect(maxAnswerLen(sample(level))).toBe(len));

test.each([[1, 8000], [2, 8000], [3, 8000], [4, 8000], [5, 8000], [6, 8000], [7, 20000], [8, 30000], [9, 8000]] as const)(
  'targetMs for ÷ level %i is %i', (level, ms) => expect(targetMs(sample(level))).toBe(ms));

test('answerOf divides', () => expect(answerOf({ op: '÷', a: 72, b: 3, level: 7 })).toBe(24));

// ---- Sharing hints (Task 2) ----

const PLACE: Record<string, number> = { hundreds: 100, tens: 10, ones: 1 };
const value = (parts: PicturePart[] = []) => parts.reduce((sum, x) => sum + x.count * (PLACE[x.label] ?? 1), 0);
const div = (a: number, b: number, level: number): Problem => ({ op: '÷', a, b, level });
const hints = (p: Problem) => solve(p).filter(s => !s.passOnly);

for (const level of LEVELS)
  test(`÷ level ${level}: no hint gives the answer away; Pass does`, () => {
    for (const p of sampleOf(level, level * 31 + 1)) {
      const q = p.a / p.b;
      const steps = solve(p);
      const last = steps.at(-1)!;
      expect(last.passOnly).toBe(true);
      expect(value(last.picture!.parts)).toBe(q);
      expect(value(last.picture!.pile)).toBe(0);
      const leak = new RegExp(`(=|is) ${q}\\b`);
      for (const s of steps.slice(0, -1)) {
        expect(s.passOnly).toBeFalsy();
        expect(s.text).not.toMatch(leak);
        for (const line of s.picture!.tally) expect(line).not.toMatch(leak);
        if (p.a === 0) continue; // nothing to deal: the empty pile is the question
        expect(value(s.picture!.pile)).toBeGreaterThan(0);
        expect(value(s.picture!.parts)).toBeLessThan(q);
      }
      for (const s of steps) {
        expect(s.picture!.groupsShown).toBe(p.b);
        expect(s.picture!.totalGroups).toBe(p.b);
        expect(s.picture!.groupsOutlined).toBe(0);
        // Every block is somewhere: in the pile or dealt into the groups.
        expect(value(s.picture!.pile) + p.b * value(s.picture!.parts)).toBe(p.a);
      }
    }
  });

test('72 ÷ 3: name it, share the tens, trade, then leave the ones to her', () => {
  const s = hints(div(72, 3, 7));
  expect(s.map(x => x.text)).toEqual([
    'Share 72 into 3 equal groups. 3 groups of what make 72?',
    'Share the tens: 2 tens in each group, 1 ten left over.',
    'Trade the leftover ten for 10 ones. Now there are 12 ones.',
    'Share 12 ones into 3 groups. How many in each group altogether?',
  ]);
  expect(s[0].picture!.pile).toEqual([{ label: 'tens', count: 7, revealed: true }, { label: 'ones', count: 2, revealed: true }]);
  expect(value(s[1].picture!.parts)).toBe(20);
  expect(s[3].picture!.pile).toEqual([{ label: 'ones', count: 12, revealed: true }]);
});

test('69 ÷ 3 has no trade step (the tens share exactly)', () => {
  const s = hints(div(69, 3, 7));
  expect(s).toHaveLength(3);
  expect(s[1].text).toBe('Share the tens: 2 tens in each group.');
});

test('345 ÷ 5 trades every hundred before sharing', () =>
  expect(hints(div(345, 5, 8))[1].text).toBe("Can't share 3 hundreds into 5 groups. Trade them for 30 tens: 34 tens."));

test('412 ÷ 4 trades the single ten it cannot share', () =>
  expect(hints(div(412, 4, 8)).map(x => x.text)).toContain("Can't share 1 ten into 4 groups. Trade it for 10 ones: 12 ones."));

test('12 ÷ 6 deals one round, counting by 6s, and leaves the last round to her', () => {
  const s = hints(div(12, 6, 1));
  expect(s).toHaveLength(2);
  expect(s[1].picture!.tally).toEqual(['6']);
  expect(value(s[1].picture!.pile)).toBe(6);
});

test('40 ÷ 4 is one ten per group: a single hint with the tens in the pile', () => {
  const s = hints(div(40, 4, 2));
  expect(s).toHaveLength(1);
  expect(s[0].picture!.pile).toEqual([{ label: 'tens', count: 4, revealed: true }]);
});

test('42 ÷ 6 gives each group 5 first, then asks about the 12 left', () => {
  const s = hints(div(42, 6, 9));
  expect(s.map(x => x.text)).toEqual([
    'Share 42 into 6 equal groups. 6 groups of what make 42?',
    'Give each group 5: 6 groups of 5 = 30. 12 left to share.',
    'Share the 12 into 6 groups. How many in each group altogether?',
  ]);
  expect(value(s[1].picture!.pile)).toBe(12);
});

test.each([[0, 4], [9, 1]])('%i ÷ %i is a single question in words, with no digits', (a, b) => {
  const s = hints(div(a, b, 6));
  expect(s).toHaveLength(1);
  expect(s[0].text).not.toMatch(/\d/);
});

test('multiplication pictures never have a pile', () => {
  for (const s of solveAny({ op: '×', a: 24, b: 3, level: 7 })) expect(s.picture?.pile).toBeUndefined();
});

// ---- Final-review fixes ----

/** Every level-6 problem: each fact pair from the review set, both directions, never ÷ 0. */
const level6 = (): Problem[] => {
  const out: Problem[] = [];
  for (const t of [0, 1, 2, 3, 4, 5, 10]) for (let k = 0; k <= 9; k++)
    for (const b of [t, k]) if (b !== 0) out.push(div(t * k, b, 6));
  return out;
};

test('every level-6 zero and one problem asks its question in words, with no digits and no gaps', () => {
  for (const p of level6()) {
    const text = hints(p)[0].text;
    expect(text).not.toMatch(/undefined/);
    if (p.a === 0) expect(text).toMatch(/^Share nothing into [a-z]+ groups?\. How many in each\?$/);
    if (p.b === 1 && p.a !== 0) expect(text).toBe('Put them all in one group. How many are in it?');
    if (p.a === 0 || p.b === 1) expect(text).not.toMatch(/\d/);
  }
});

test('0 ÷ 10 and 0 ÷ 1 read naturally', () => {
  expect(hints(div(0, 10, 6))[0].text).toBe('Share nothing into ten groups. How many in each?');
  expect(hints(div(0, 1, 6))[0].text).toBe('Share nothing into one group. How many in each?');
});

test('10 ÷ 1 uses the one-group question, with the ten in the pile', () => {
  const s = hints(div(10, 1, 6));
  expect(s).toHaveLength(1);
  expect(s[0].text).toBe('Put them all in one group. How many are in it?');
  expect(s[0].picture!.pile).toEqual([{ label: 'tens', count: 1, revealed: true }]);
});
