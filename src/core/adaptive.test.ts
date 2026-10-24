import { initialOpState, pickLevel, update, type LevelChange, type OpState } from './adaptive';
import { mulberry32 } from './rng';

const run = (s: OpState, scores: number[]) =>
  scores.reduce((acc, sc) => update(acc.state, sc), { state: s, change: 0 as LevelChange });
const normal = (level: number): OpState => ({ level, window: [], calibrationLeft: 0 });

test('initial state', () => expect(initialOpState()).toEqual({ level: 4, window: [], calibrationLeft: 10 }));

test('normal: up after 5 with mean ≥ 0.8, window resets', () => {
  const r = run(normal(5), [1, 1, 0.6, 1, 0.6]); // mean 0.84
  expect(r.change).toBe(1);
  expect(r.state).toEqual({ level: 6, window: [], calibrationLeft: 0 });
});
test('normal: 4 strong is not enough', () => expect(run(normal(5), [1, 1, 1, 1]).state.level).toBe(5));
test('normal: mean 0.76 does not move', () => expect(run(normal(5), [1, 1, 0.6, 0.6, 0.6]).state.level).toBe(5));
test('normal: down after two ≤ 0.3 in a row', () => {
  expect(run(normal(5), [0.3, 0.2]).state.level).toBe(4);
  expect(run(normal(5), [0.3, 1, 0.2]).state.level).toBe(5);
});
test('window keeps only the last 5', () => expect(run(normal(5), [0, 0.6, 1, 1, 1, 1]).state).toEqual({ level: 6, window: [], calibrationLeft: 0 }));

test('calibration: two 1.0s go up, one miss goes down', () => {
  expect(run(initialOpState(), [1, 1]).state.level).toBe(5);
  expect(run(initialOpState(), [1, 0.6]).state.level).toBe(4);
  expect(run(initialOpState(), [0]).state.level).toBe(3);
});
test('calibration lasts exactly 10 current-level problems', () => {
  const r = run(initialOpState(), Array(9).fill(0.6));
  expect(r.state.calibrationLeft).toBe(1);
  expect(update(r.state, 0).state.level).toBe(3); // 10th still calibration
  expect(run(r.state, [0.6, 0.2]).state.calibrationLeft).toBe(0);
  expect(run(r.state, [0.6, 0.2]).state.level).toBe(4); // 11th uses normal rules
});
test('clamps at 1 and 9', () => {
  expect(run(normal(1), [0, 0]).change).toBe(0);
  expect(run(normal(1), [0, 0]).state.level).toBe(1);
  expect(run(normal(9), [1, 1, 1, 1, 1]).state.level).toBe(9);
});

test('pickLevel distribution ~70/20/10', () => {
  const rng = mulberry32(3);
  const c: Record<number, number> = {};
  for (let i = 0; i < 10000; i++) { const l = pickLevel(normal(5), rng); c[l] = (c[l] ?? 0) + 1; }
  expect(c[5] / 10000).toBeCloseTo(0.7, 1);
  expect(c[4] / 10000).toBeCloseTo(0.2, 1);
  expect(c[6] / 10000).toBeCloseTo(0.1, 1);
});
test('pickLevel edges and calibration', () => {
  const rng = mulberry32(4);
  for (let i = 0; i < 500; i++) {
    expect(pickLevel(normal(1), rng)).toBeGreaterThanOrEqual(1);
    expect(pickLevel(normal(9), rng)).toBeLessThanOrEqual(9);
    expect(pickLevel(initialOpState(), rng)).toBe(4);
  }
});
