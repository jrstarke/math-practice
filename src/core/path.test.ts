import { applyUnlocks, pickOp, UNLOCK_RULES } from './path';
import { defaultProgress, type OpKey } from './progress';
import { mulberry32 } from './rng';

const at = (level: number) => ({ level, window: [], calibrationLeft: 0 });
const base = { ...defaultProgress(), addition: at(2) };
const both: OpKey[] = ['addition', 'subtraction'];
const all: OpKey[] = ['addition', 'subtraction', 'multiplication'];

test('subtraction unlocks when addition reaches level 3, starting at level 1 with calibration', () => {
  const r = applyUnlocks({ ...base, addition: at(3), subtraction: at(7) });
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
  const once = applyUnlocks({ ...base, addition: at(3) }).progress;
  const dropped = { ...once, addition: at(2), subtraction: at(4) };
  expect(applyUnlocks(dropped)).toEqual({ progress: dropped, unlocked: [] });
  const again = { ...dropped, addition: at(3) };
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
