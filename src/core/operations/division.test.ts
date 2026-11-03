import { answerOf } from '../arith';
import { generate } from '../generator';
import { mulberry32 } from '../rng';
import { matchesLevel, maxAnswerLen, targetMs } from './division';
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
