import { solveShape } from './shapeHints';
import { solve, hintLimit, revealState } from '../solver';
import { makeShapeProblem, shapesFor, numberLevelsFor } from '../shapes';
import { answerOf } from '../arith';
import { mulberry32 } from '../rng';
import { generate } from '../generator';
import { OPS } from './registry';

const cases = (['+', '-'] as const).flatMap(op => [1, 2, 3].filter(s => shapesFor(op, s).length > 0).map(s => [op, s] as const));

test.each(cases)('solveShape %s stage %i', (op, stage) => {
  const rng = mulberry32(stage * 11 + (op === '+' ? 3 : 5));
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = makeShapeProblem(op, stage, 9, rng);
    seen.add(p.shape!);
    const steps = solveShape(p);
    expect(steps).toHaveLength(3);
    for (const s of steps.slice(0, 2)) {
      expect(s.passOnly).toBeFalsy();
      expect(s.ghosts).toEqual([]);
      expect(s.scratch).toEqual({});
      expect(s.column).toBeNull();
      expect(s.text).not.toContain(steps[2].text);
    }
    expect(steps[2].passOnly).toBe(true);
    const g = steps[2].ghosts;
    expect(g.map(x => x.column)).toEqual(g.map((_, k) => k));
    expect(Number(g.map(x => x.digit).reverse().join(''))).toBe(answerOf(p));
    expect(solve(p)).toEqual(steps);
    expect(hintLimit(solve(p))).toBe(2);
    const st = revealState(solve(p), 3);
    expect(Number(Object.keys(st.ghosts).sort().map(k => st.ghosts[+k]).reverse().join(''))).toBe(answerOf(p));
  }
  expect(seen).toEqual(new Set(shapesFor(op, stage)));
});

test('solve for a problem without a shape is unchanged', () => {
  const p = generate('+', 3, mulberry32(1));
  expect(p.shape).toBeUndefined();
  expect(solve(p)).toEqual(OPS[p.op].solve(p));
  expect(numberLevelsFor(1)).toEqual([1]);
});

test('sentence example', () => {
  const p = { op: '+' as const, a: 6, b: 4, level: 1, shape: 'missing-b' as const, stage: 1 };
  expect(solveShape(p)[2].text).toBe('6 + 4 = 10, so the missing number is 4.');
});

test('the Pass sentence uses the minus sign the line shows', () => {
  const p = { op: '-' as const, a: 12, b: 5, level: 2, shape: 'missing-b' as const, stage: 1 };
  expect(solveShape(p)[2].text).toBe('12 − 5 = 7, so the missing number is 5.');
});

test('the balance sentence follows the order on the line', () => {
  const p = { op: '+' as const, a: 8, b: 6, c: 4, level: 2, shape: 'balance' as const, stage: 2 };
  expect(solveShape(p)[2].text).toBe('8 + 6 = 14, and 10 + 4 = 14, so the missing number is 10.');
});
