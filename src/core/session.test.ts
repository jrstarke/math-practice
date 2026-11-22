import { generate } from './generator';
import { matchesLevel } from './levels';
import { pickLevel } from './adaptive';
import { pickOp } from './path';
import { defaultProgress, opKey, type OpKey, type Progress } from './progress';
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
    expect(recent.some(r => r.op === n.op && r.a === n.a && r.b === n.b && r.shape === n.shape && r.c === n.c)).toBe(false);
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
    expect(p.day).toEqual({ date: TODAY, right: 10, days: 1, lastDone: TODAY, practised: 1 });
  });

  test('a right answer after hints and wrong tries counts toward the day', () => {
    const r = recordResult(defaultProgress(), sum, { ...clean, hintsUsed: 2, wrongSubmits: 1 }, TODAY);
    expect(r.progress.day.right).toBe(1);
  });

  test('a Pass never counts, even as the would-be 10th answer', () => {
    const p = { ...defaultProgress(), day: { date: TODAY, right: 9, days: 2, lastDone: '2026-11-10', practised: 2 } };
    const r = recordResult(p, sum, { ...clean, passed: true }, TODAY);
    expect(r.dayDone).toBeNull();
    expect(r.progress.day).toEqual(p.day);
  });
});

// ---- Shape problems (Task 4) ----
const atLevels = (add: number, sh = 1): Progress => ({
  ...defaultProgress(),
  unlocked: both,
  addition: calibrating(add),
  subtraction: calibrating(add),
  shapes: { addition: calibrating(sh), subtraction: calibrating(sh) },
});

test('share 1 on a default progress gives stage-1 missing-b that matches its level', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 30; i++) {
    const n = nextProblem(defaultProgress(), [], rng, 1);
    expect(n.shape).toBe('missing-b');
    expect(n.stage).toBe(1);
    expect(matchesLevel(n)).toBe(true);
  }
});

test('share 0 never gives a shape and leaves the rng sequence as before', () => {
  const a = mulberry32(9), b = mulberry32(9);
  const p = at4();
  for (let i = 0; i < 50; i++) {
    const n = nextProblem(p, [], a, 0);
    expect(n.shape).toBeUndefined();
    const op = pickOp(p, b);
    expect(n).toEqual(generate(op, pickLevel(p[opKey(op)], b), b));
  }
});

test('stage never exceeds 3 or the arithmetic level', () => {
  const rng = mulberry32(2);
  const hi = atLevels(6);
  const seen = new Set<number>();
  for (let i = 0; i < 100; i++) seen.add(nextProblem(hi, [], rng, 1).stage!);
  expect(Math.max(...seen)).toBeLessThanOrEqual(3);
  expect([...seen]).toEqual([1]);
  const lo = atLevels(2, 3);
  for (let i = 0; i < 100; i++) expect(nextProblem(lo, [], rng, 1).stage!).toBeLessThanOrEqual(2);
});

test('no shape during a welcome', () => {
  const rng = mulberry32(3);
  const p = { ...atLevels(4), welcome: { op: 'subtraction' as OpKey, left: 3 } };
  for (let i = 0; i < 100; i++) {
    const n = nextProblem(p, [], rng, 1);
    if (n.op === '-') expect(n.shape).toBeUndefined();
  }
});

test('a shape problem is not suppressed by the same plain problem in recent', () => {
  const rng = mulberry32(4);
  const recent: Problem[] = [{ op: '+', a: 6, b: 4, level: 1 }];
  const seen = new Set<string>();
  for (let i = 0; i < 300; i++) {
    const n = nextProblem(defaultProgress(), recent, rng, 1);
    seen.add(`${n.a}+${n.b}`);
  }
  expect(seen.has('6+4')).toBe(true);
});

test('shape answers adapt only the shape ladder', () => {
  const start = atLevels(4);
  const prob: Problem = { op: '+', a: 6, b: 4, level: 1, shape: 'missing-b', stage: 1 };
  const r = record(start, prob, clean);
  expect(r.progress.shapes.addition.window.length).toBe(1);
  expect(r.progress.addition).toEqual(start.addition);
  expect(r.levelChange).toBe(0);
  expect(r.unlocked).toEqual([]);
  expect(r.progress.streak).toBe(start.streak + 1);
  const miss = record(start, prob, { ...clean, passed: true });
  expect(miss.progress.addition.level).toBe(4);
  expect(miss.progress.shapes.addition.level).toBe(1);
  const other = record(start, { ...prob, stage: 2 }, clean);
  expect(other.progress.shapes).toEqual(start.shapes);
  expect(other.progress.total).toBe(start.total + 1);
});

test('two perfect shape answers raise the stage only when arithmetic allows', () => {
  const prob: Problem = { op: '+', a: 6, b: 4, level: 1, shape: 'missing-b', stage: 1 };
  const run = (p: Progress) => record(record(p, prob, clean).progress, prob, clean).progress.shapes.addition.level;
  expect(run(atLevels(2))).toBe(2);
  expect(run(atLevels(1))).toBe(1);
});

test('an identical shape problem in recent is held back by the repeat check at share 1', () => {
  const p = { ...defaultProgress(), unlocked: ['addition' as OpKey] };
  const first = nextProblem(p, [], mulberry32(1), 1);
  expect(first.shape).toBeDefined();
  let repeats = 0;
  for (let seed = 1; seed < 400; seed++) {
    if (same(nextProblem(p, [], mulberry32(seed), 1), first)) repeats++; // the generator does produce it unchecked
    expect(same(nextProblem(p, [first], mulberry32(seed), 1), first)).toBe(false);
  }
  expect(repeats).toBeGreaterThan(0);
});
const same = (x: Problem, y: Problem) => x.op === y.op && x.a === y.a && x.b === y.b && x.shape === y.shape && x.c === y.c;
