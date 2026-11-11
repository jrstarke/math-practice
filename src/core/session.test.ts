import { defaultProgress, type OpKey, type Progress } from './progress';
import { mulberry32 } from './rng';
import { nextProblem, recordResult, RECENT_LIMIT } from './session';
import type { Problem } from './types';

const both: OpKey[] = ['addition', 'subtraction'];
const calibrating = (level: number) => ({ level, window: [], calibrationLeft: 10 });
/** Both operations unlocked at level 4 — the starting point these tests were written against. */
const at4 = () => ({ ...defaultProgress(), unlocked: both, addition: calibrating(4), subtraction: calibrating(4) });

const clean = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 1000 };
const TODAY = '2026-11-11';
const record = (p: Progress, problem: Problem, a: typeof clean) => recordResult(p, problem, a, TODAY);

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
  const r = record({ ...at4(), streak: 4, bestStreak: 4, total: 10 }, { op: '+', a: 34, b: 25, level: 4 }, clean);
  expect(r.progress.streak).toBe(5);
  expect(r.progress.bestStreak).toBe(5);
  expect(r.progress.total).toBe(11);
});

test.each([{ wrongSubmits: 1 }, { hintsUsed: 1 }, { passed: true }])('recordResult %o resets streak, keeps best', over => {
  const r = record({ ...at4(), streak: 4, bestStreak: 9, total: 10 }, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, ...over });
  expect(r.progress.streak).toBe(0);
  expect(r.progress.bestStreak).toBe(9);
  expect(r.progress.total).toBe(10);
});

test('clean off-level answer still counts toward the total', () => {
  const start = { ...at4(), total: 7 }; // current addition level is 4
  const r = record(start, { op: '+', a: 23, b: 4, level: 3 }, clean);
  expect(r.progress.total).toBe(8);
  expect(r.progress.addition).toEqual(start.addition);
});

test('recordResult only adapts on current-level problems', () => {
  const start = at4();
  const off = record(start, { op: '+', a: 23, b: 4, level: 3 }, { ...clean, passed: true });
  expect(off.progress.addition).toEqual(start.addition);
  expect(off.levelChange).toBe(0);
  const on = record(start, { op: '+', a: 34, b: 25, level: 4 }, { ...clean, passed: true });
  expect(on.progress.addition.level).toBe(3);
  expect(on.levelChange).toBe(-1);
  expect(start.addition.level).toBe(4); // input not mutated
});

test('recordResult updates the matching operation only', () => {
  const r = record(at4(), { op: '-', a: 57, b: 23, level: 4 }, { ...clean, passed: true });
  expect(r.progress.subtraction.level).toBe(3);
  expect(r.progress.addition.level).toBe(4);
});

test('a level-up to addition 2 reports the unlock on that answer', () => {
  const start = { ...defaultProgress(), addition: calibrating(1) };
  const once = record(start, { op: '+', a: 3, b: 4, level: 1 }, clean);
  const r = record(once.progress, { op: '+', a: 2, b: 5, level: 1 }, clean); // second clean in calibration → level 2
  expect(r.levelChange).toBe(1);
  expect(r.unlocked).toEqual(['subtraction']);
  expect(r.progress.unlocked).toEqual(['addition', 'subtraction']);
});

test('no unlock is reported when subtraction is already unlocked', () => {
  const p = { ...defaultProgress(), unlocked: both, addition: { level: 5, window: [], calibrationLeft: 0 } };
  expect(record(p, { op: '+', a: 34, b: 25, level: 5 }, clean).unlocked).toEqual([]);
});

// ---- Cap and welcome (Task 3) ----

const fourOps: OpKey[] = ['addition', 'subtraction', 'multiplication', 'division'];
const settled = (level: number, window: number[] = []) => ({ level, window, calibrationLeft: 0 });
const withDivision = (mult: number, div: number) => ({
  ...defaultProgress(), unlocked: fourOps,
  addition: settled(8), subtraction: settled(7), multiplication: settled(mult), division: settled(div, [1, 1, 1, 1]),
});

test('the three problems after an unlock are the new operation, then the mix resumes', () => {
  const nearDivision = {
    ...defaultProgress(), unlocked: ['addition', 'subtraction', 'multiplication'] as OpKey[],
    addition: settled(8), subtraction: settled(7), multiplication: calibrating(1),
  };
  // Two clean calibrating answers take multiplication to 2, which unlocks division.
  let p = record(nearDivision, { op: '×', a: 2, b: 3, level: 1 }, clean).progress;
  const r = record(p, { op: '×', a: 2, b: 4, level: 1 }, clean);
  expect(r.unlocked).toEqual(['division']);
  p = r.progress;
  const rng = mulberry32(14);
  for (let i = 0; i < 3; i++) {
    const n = nextProblem(p, [], rng);
    expect(n.op).toBe('÷');
    p = record(p, n, i === 1 ? { ...clean, passed: true } : clean).progress; // Pass still counts down
  }
  expect(p.welcome).toBeNull();
  const ops = new Set(Array.from({ length: 100 }, () => nextProblem(p, [], rng).op));
  expect(ops.size).toBeGreaterThan(1);
});

test('a welcome reloaded with 2 left gives exactly 2 more', () => {
  let p: Progress = { ...withDivision(5, 1), division: calibrating(1), welcome: { op: 'division', left: 2 } };
  const rng = mulberry32(15);
  for (let i = 0; i < 2; i++) {
    const n = nextProblem(p, [], rng);
    expect(n.op).toBe('÷');
    p = record(p, n, clean).progress;
  }
  expect(p.welcome).toBeNull();
});

test('an off-level welcome problem still counts down', () => {
  const p = { ...withDivision(5, 3), welcome: { op: 'division' as OpKey, left: 3 } };
  expect(record(p, { op: '÷', a: 12, b: 2, level: 1 }, clean).progress.welcome).toEqual({ op: 'division', left: 2 });
});

// ---- No cap (user decision 2026-11-02): division climbs on its own once unlocked ----

test('division climbs past multiplication when she finds it easier', () => {
  const r = record(withDivision(3, 4), { op: '÷', a: 21, b: 3, level: 4 }, clean);
  expect(r.progress.division.level).toBe(5);
  expect(r.levelChange).toBe(1);
});

test('nextProblem serves division above multiplication\'s level', () => {
  const p = { ...withDivision(3, 4), division: settled(4) };
  const rng = mulberry32(16);
  const levels = new Set<number>();
  for (let i = 0; i < 3000; i++) { const n = nextProblem(p, [], rng); if (n.op === '÷') levels.add(n.level); }
  expect(levels.has(5)).toBe(true);
});

describe('the day streak', () => {
  const sum: Problem = { op: '+', a: 2, b: 3, level: 1 };

  test('the 10th right answer of the day completes day 1', () => {
    let p = defaultProgress();
    const done: (number | null)[] = [];
    for (let i = 0; i < 10; i++) {
      const r = recordResult(p, sum, clean, TODAY);
      p = r.progress;
      done.push(r.dayDone);
    }
    expect(done).toEqual([null, null, null, null, null, null, null, null, null, 1]);
    expect(p.day).toEqual({ date: TODAY, right: 10, days: 1, lastDone: TODAY });
  });

  test('a right answer after hints and wrong tries counts toward the day', () => {
    const r = recordResult(defaultProgress(), sum, { ...clean, hintsUsed: 2, wrongSubmits: 1 }, TODAY);
    expect(r.progress.day.right).toBe(1);
  });

  test('a Pass never counts, even as the would-be 10th answer', () => {
    const p = { ...defaultProgress(), day: { date: TODAY, right: 9, days: 2, lastDone: '2026-11-10' } };
    const r = recordResult(p, sum, { ...clean, passed: true }, TODAY);
    expect(r.dayDone).toBeNull();
    expect(r.progress.day).toEqual(p.day);
  });
});
