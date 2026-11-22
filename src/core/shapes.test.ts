import { makeShapeProblem, numberLevelsFor, shapesFor, SHAPE_SHARE, stageCap } from './shapes';
import { matchesLevel } from './levels';
import { answerOf } from './arith';
import { mulberry32 } from './rng';
import { defaultProgress } from './progress';

test('SHAPE_SHARE is 1/3', () => expect(SHAPE_SHARE).toBe(1 / 3));

test('shapesFor is the table', () => {
  expect(shapesFor('+', 1)).toEqual(['missing-b']);
  expect(shapesFor('+', 2)).toEqual(['missing-a', 'flipped', 'balance']);
  expect(shapesFor('+', 3)).toEqual(['missing-b', 'missing-a']);
  expect(shapesFor('-', 1)).toEqual(['missing-b']);
  expect(shapesFor('-', 2)).toEqual(['missing-a', 'flipped']);
  expect(shapesFor('-', 3)).toEqual(['missing-b', 'missing-a']);
});

test.each([['+', 4], ['+', 0], ['-', 4], ['-', 0], ['×', 1], ['÷', 2]] as const)(
  'shapesFor %s %i is empty', (op, stage) => expect(shapesFor(op, stage)).toEqual([]));

test('numberLevelsFor', () => {
  expect(numberLevelsFor(1)).toEqual([1]);
  expect(numberLevelsFor(2)).toEqual([2]);
  expect(numberLevelsFor(3)).toEqual([3, 4]);
});

test('stageCap is the arithmetic level capped at 3', () => {
  const p = defaultProgress();
  p.shapes.addition.level = 1;
  p.addition.level = 2;
  expect(stageCap(p, 'addition')).toBe(2);
  p.addition.level = 8;
  expect(stageCap(p, 'addition')).toBe(3);
});

test.each([['+', 1], ['+', 2], ['+', 3], ['-', 1], ['-', 2], ['-', 3]] as const)(
  'makeShapeProblem %s stage %i is valid, with a blank of at least 1', (op, stage) => {
    const rng = mulberry32(stage * 7 + (op === '+' ? 1 : 2));
    for (let i = 0; i < 1000; i++) {
      const p = makeShapeProblem(op, stage, 9, rng);
      expect(matchesLevel(p)).toBe(true);
      expect(p.stage).toBe(stage);
      expect(p.op).toBe(op);
      expect(answerOf(p)).toBeGreaterThanOrEqual(1);
      if (p.shape === 'balance') {
        expect(op === '+' && stage === 2).toBe(true);
        expect(p.c).toBeGreaterThanOrEqual(1);
        expect(p.c).toBeLessThanOrEqual(9);
        expect(p.c).toBeLessThan(p.a + p.b);
        expect(p.c).not.toBe(p.a);
        expect(p.c).not.toBe(p.b);
      } else expect(p.c).toBeUndefined();
    }
  });

test('stage 3 follows the arithmetic level', () => {
  const rng = mulberry32(5);
  const low = new Set<number>(), high = new Set<number>();
  for (let i = 0; i < 300; i++) {
    low.add(makeShapeProblem('+', 3, 3, rng).level);
    high.add(makeShapeProblem('-', 3, 9, rng).level);
  }
  expect([...low]).toEqual([3]);
  expect([...high].sort()).toEqual([3, 4]);
});

test('throws when the arithmetic level is below the stage', () => {
  expect(() => makeShapeProblem('+', 2, 1, mulberry32(1))).toThrow();
});

test('the same seed gives the same problem', () => {
  expect(makeShapeProblem('+', 2, 9, mulberry32(9))).toEqual(makeShapeProblem('+', 2, 9, mulberry32(9)));
});

test('modules load in either import order', async () => {
  for (const order of [['./levels', './shapes'], ['./shapes', './levels']]) {
    const { vi } = await import('vitest');
    vi.resetModules();
    for (const m of order) await import(/* @vite-ignore */ m);
    const levels = await import('./levels');
    const shapes = await import('./shapes');
    expect(levels.matchesLevel(shapes.makeShapeProblem('+', 1, 9, mulberry32(3)))).toBe(true);
  }
});
