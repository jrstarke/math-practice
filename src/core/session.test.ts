import { defaultProgress, type OpKey } from './progress';
import { mulberry32 } from './rng';
import { nextProblem, recordResult, RECENT_LIMIT } from './session';
import type { Problem } from './types';

const both: OpKey[] = ['addition', 'subtraction'];
const calibrating = (level: number) => ({ level, window: [], calibrationLeft: 10 });
/** Both operations unlocked at level 4 — the starting point these tests were written against. */
const at4 = () => ({ ...defaultProgress(), unlocked: both, addition: calibrating(4), subtraction: calibrating(4) });

const clean = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 1000 };

test('nextProblem avoids the last 10 problems', () => {
  const rng = mulberry32(5);
  const recent: Problem[] = [];
  const p = {
    ...defaultProgress(),
    unlocked: both,
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

test('a new player only gets addition', () => {
  const rng = mulberry32(6);
  for (let i = 0; i < 50; i++) expect(nextProblem(defaultProgress(), [], rng).op).toBe('+');
});

test('nextProblem mixes unlocked operations', () => {
  const rng = mulberry32(6);
  const ops = new Set<string>();
  for (let i = 0; i < 50; i++) ops.add(nextProblem(at4(), [], rng).op);
  expect(ops).toEqual(new Set(['+', '-']));
});

test('recordResult: clean answer extends streak and best', () => {
  const r = recordResult({ ...at4(), streak: 4, bestStreak: 4, total: 10 }, { op: '+', a: 34, b: 25, level: 4 }, clean);
  expect(r.progress.streak).toBe(5);
  expect(r.progress.bestStreak).toBe(5);
  expect(r.progress.total).toBe(11);
});

test.each([{ wrongSubmits: 1 }, { hintsUsed: 1 }, { passed: true }])('recordResult %o resets streak, keeps best', over => {
  const r = recordResult({ ...at4(), streak: 4, bestStreak: 9, total: 10 }, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, ...over });
  expect(r.progress.streak).toBe(0);
  expect(r.progress.bestStreak).toBe(9);
  expect(r.progress.total).toBe(10);
});

test('clean off-level answer still counts toward the total', () => {
  const start = { ...at4(), total: 7 }; // current addition level is 4
  const r = recordResult(start, { op: '+', a: 23, b: 4, level: 3 }, clean);
  expect(r.progress.total).toBe(8);
  expect(r.progress.addition).toEqual(start.addition);
});

test('recordResult only adapts on current-level problems', () => {
  const start = at4();
  const off = recordResult(start, { op: '+', a: 23, b: 4, level: 3 }, { ...clean, passed: true });
  expect(off.progress.addition).toEqual(start.addition);
  expect(off.levelChange).toBe(0);
  const on = recordResult(start, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, passed: true });
  expect(on.progress.addition.level).toBe(3);
  expect(on.levelChange).toBe(-1);
  expect(start.addition.level).toBe(4); // input not mutated
});

test('recordResult updates the matching operation only', () => {
  const r = recordResult(at4(), { op: '-', a: 57, b: 23, level: 4 }, { ...clean, passed: true });
  expect(r.progress.subtraction.level).toBe(3);
  expect(r.progress.addition.level).toBe(4);
});

test('a level-up to addition 3 reports the unlock on that answer', () => {
  const start = { ...defaultProgress(), addition: calibrating(2) };
  const once = recordResult(start, { op: '+', a: 7, b: 8, level: 2 }, clean);
  const r = recordResult(once.progress, { op: '+', a: 6, b: 9, level: 2 }, clean); // second clean in calibration → level 3
  expect(r.levelChange).toBe(1);
  expect(r.unlocked).toEqual(['subtraction']);
  expect(r.progress.unlocked).toEqual(['addition', 'subtraction']);
});

test('no unlock is reported when subtraction is already unlocked', () => {
  const p = { ...defaultProgress(), unlocked: both, addition: { level: 5, window: [], calibrationLeft: 0 } };
  expect(recordResult(p, { op: '+', a: 34, b: 25, level: 5 }, clean).unlocked).toEqual([]);
});
