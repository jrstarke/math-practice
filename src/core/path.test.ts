import { applyUnlocks, maxLevelFor, opWeight, pickOp, UNLOCK_RULES } from './path';
import { defaultProgress, type OpKey } from './progress';
import { mulberry32 } from './rng';

const at = (level: number) => ({ level, window: [], calibrationLeft: 0 });
const base = { ...defaultProgress(), addition: at(1) };
const both: OpKey[] = ['addition', 'subtraction'];
const all: OpKey[] = ['addition', 'subtraction', 'multiplication'];

test('subtraction unlocks when addition reaches level 2, starting at level 1 with calibration', () => {
  const r = applyUnlocks({ ...base, addition: at(2), subtraction: at(7) });
  expect(r.unlocked).toEqual(['subtraction']);
  expect(r.progress.unlocked).toEqual(both);
  expect(r.progress.subtraction).toEqual({ level: 1, window: [], calibrationLeft: 10 });
});

test('below the threshold nothing unlocks', () => {
  expect(applyUnlocks(base)).toEqual({ progress: base, unlocked: [] });
});

test('UNLOCK_RULES.multiplication requires addition 6 and subtraction 5', () => {
  expect(UNLOCK_RULES.multiplication).toEqual({ addition: 6, subtraction: 5 });
});

test('multiplication unlocks when addition reaches level 6 and subtraction level 5', () => {
  const p = { ...base, unlocked: both, addition: at(6), subtraction: at(5) };
  const r = applyUnlocks(p);
  expect(r.unlocked).toEqual(['multiplication']);
  expect(r.progress.unlocked).toEqual(all);
  expect(r.progress.multiplication).toEqual({ level: 1, window: [], calibrationLeft: 10 });
});

test('addition one level short of the multiplication threshold unlocks nothing', () => {
  const p = { ...base, unlocked: both, addition: at(5), subtraction: at(5) };
  expect(applyUnlocks(p)).toEqual({ progress: p, unlocked: [] });
});

test('unlock happens once; later threshold crossings change nothing', () => {
  const once = applyUnlocks({ ...base, addition: at(2) }).progress;
  const dropped = { ...once, addition: at(1), subtraction: at(4) };
  expect(applyUnlocks(dropped)).toEqual({ progress: dropped, unlocked: [] });
  const again = { ...dropped, addition: at(2) };
  expect(applyUnlocks(again)).toEqual({ progress: again, unlocked: [] });
});

test('only addition unlocked → every problem is addition', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 200; i++) expect(pickOp(base, rng)).toBe('+');
});

test('an operation at level 9 gets about a sixth of problems', () => {
  const p = { ...base, unlocked: both, addition: at(9), subtraction: at(5) };
  const rng = mulberry32(2);
  let plus = 0;
  for (let i = 0; i < 6000; i++) if (pickOp(p, rng) === '+') plus++;
  expect(plus / 6000).toBeGreaterThan(0.14);
  expect(plus / 6000).toBeLessThan(0.195);
});

test('both at level 9 still split evenly', () => {
  const p = { ...base, unlocked: both, addition: at(9), subtraction: at(9) };
  const rng = mulberry32(3);
  let plus = 0;
  for (let i = 0; i < 4000; i++) if (pickOp(p, rng) === '+') plus++;
  expect(plus / 4000).toBeGreaterThan(0.45);
  expect(plus / 4000).toBeLessThan(0.55);
});

test("division unlocks when multiplication reaches level 2, starting at level 1 with calibration", () => {
  const p = { ...base, unlocked: all, addition: at(6), subtraction: at(5), multiplication: at(2), division: at(6) };
  const r = applyUnlocks(p);
  expect(r.unlocked).toEqual(["division"]);
  expect(r.progress.unlocked).toEqual([...all, "division"]);
  expect(r.progress.division).toEqual({ level: 1, window: [], calibrationLeft: 10 });
});

test("multiplication at level 1 does not unlock division", () => {
  const p = { ...base, unlocked: all, addition: at(6), subtraction: at(5), multiplication: at(1) };
  expect(applyUnlocks(p).unlocked).toEqual([]);
});

// ---- Cap, weights and welcome (Task 3) ----

const four: OpKey[] = ['addition', 'subtraction', 'multiplication', 'division'];
const levels = (add: number, sub: number, mult: number, div: number) =>
  ({ ...base, unlocked: four, addition: at(add), subtraction: at(sub), multiplication: at(mult), division: at(div) });

test('unlocking starts a 3-problem welcome for the new operation', () => {
  expect(applyUnlocks({ ...base, addition: at(2) }).progress.welcome).toEqual({ op: 'subtraction', left: 3 });
  const p = { ...base, unlocked: all, addition: at(6), subtraction: at(5), multiplication: at(2) };
  expect(applyUnlocks(p).progress.welcome).toEqual({ op: 'division', left: 3 });
});

test.each([[2, 1], [5, 4], [8, 7], [9, 9], [1, 1]])('with multiplication at %i, division may reach %i', (mult, cap) =>
  expect(maxLevelFor(levels(9, 9, mult, 1), 'division')).toBe(cap));

test('operations without a cap rule may reach 9', () =>
  expect(maxLevelFor(levels(3, 2, 2, 1), 'addition')).toBe(9));

test('the spec example: behind gets more, a new operation gets a normal share', () => {
  const p = levels(8, 6, 4, 2);
  expect(four.map(k => opWeight(p, k))).toEqual([1, 1.5, 2, 1]);
});

test('weights: no boost below level 3, capped at double, review share at 9', () => {
  const p = { ...base, unlocked: all, addition: at(9), subtraction: at(8), multiplication: at(1) };
  expect(opWeight(p, 'multiplication')).toBe(1);
  expect(opWeight(p, 'addition')).toBe(0.2);
  expect(opWeight({ ...base, unlocked: both, addition: at(8), subtraction: at(3) }, 'subtraction')).toBe(2);
});

test('division waiting at its cap gets a normal share', () =>
  expect(opWeight(levels(8, 7, 5, 4), 'division')).toBe(1));

test('pickOp follows the weights: about 18 / 27 / 36 / 18% for the spec example', () => {
  const p = levels(8, 6, 4, 2);
  const rng = mulberry32(11);
  const n = 20000;
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const op = pickOp(p, rng); counts[op] = (counts[op] ?? 0) + 1; }
  const share = (op: string) => (counts[op] ?? 0) / n;
  expect(Math.abs(share('+') - 1 / 5.5)).toBeLessThan(0.02);
  expect(Math.abs(share('-') - 1.5 / 5.5)).toBeLessThan(0.02);
  expect(Math.abs(share('×') - 2 / 5.5)).toBeLessThan(0.02);
  expect(Math.abs(share('÷') - 1 / 5.5)).toBeLessThan(0.02);
});

test('during a welcome, pickOp always gives the new operation', () => {
  const p = { ...levels(8, 6, 4, 1), welcome: { op: 'division' as OpKey, left: 2 } };
  const rng = mulberry32(12);
  for (let i = 0; i < 200; i++) expect(pickOp(p, rng)).toBe('÷');
  expect(pickOp({ ...p, welcome: { op: 'division', left: 0 } }, () => 0)).toBe('+');
});
