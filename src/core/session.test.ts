import { defaultProgress } from './progress';
import { mulberry32 } from './rng';
import { nextProblem, recordResult, RECENT_LIMIT } from './session';
import type { Problem } from './types';

const clean = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 1000 };

test('nextProblem avoids the last 10 problems', () => {
  const rng = mulberry32(5);
  const recent: Problem[] = [];
  const p = {
    ...defaultProgress(),
    addition: { level: 1, window: [], calibrationLeft: 10 },
    subtraction: { level: 1, window: [], calibrationLeft: 10 },
  };
  for (let i = 0; i < 200; i++) {
    const n = nextProblem(p, recent, rng);
    expect(recent.some(r => r.op === n.op && r.a === n.a && r.b === n.b)).toBe(false);
    recent.push(n);
    if (recent.length > RECENT_LIMIT) recent.shift();
  }
});

test('nextProblem mixes operations', () => {
  const rng = mulberry32(6);
  const ops = new Set<string>();
  for (let i = 0; i < 50; i++) ops.add(nextProblem(defaultProgress(), [], rng).op);
  expect(ops).toEqual(new Set(['+', '-']));
});

test('recordResult: clean answer extends streak and best', () => {
  const r = recordResult({ ...defaultProgress(), streak: 4, bestStreak: 4 }, { op: '+', a: 34, b: 25, level: 4 }, clean);
  expect(r.progress.streak).toBe(5);
  expect(r.progress.bestStreak).toBe(5);
});

test.each([{ wrongSubmits: 1 }, { hintsUsed: 1 }, { passed: true }])('recordResult %o resets streak, keeps best', over => {
  const r = recordResult({ ...defaultProgress(), streak: 4, bestStreak: 9 }, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, ...over });
  expect(r.progress.streak).toBe(0);
  expect(r.progress.bestStreak).toBe(9);
});

test('recordResult only adapts on current-level problems', () => {
  const start = defaultProgress();
  const off = recordResult(start, { op: '+', a: 23, b: 4, level: 3 }, { ...clean, passed: true });
  expect(off.progress.addition).toEqual(start.addition);
  expect(off.levelChange).toBe(0);
  const on = recordResult(start, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, passed: true });
  expect(on.progress.addition.level).toBe(3);
  expect(on.levelChange).toBe(-1);
  expect(start.addition.level).toBe(4); // input not mutated
});

test('recordResult updates the matching operation only', () => {
  const r = recordResult(defaultProgress(), { op: '-', a: 57, b: 23, level: 4 }, { ...clean, passed: true });
  expect(r.progress.subtraction.level).toBe(3);
  expect(r.progress.addition.level).toBe(4);
});
