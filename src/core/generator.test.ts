import { generate } from './generator';
import { matchesLevel } from './levels';
import { mulberry32 } from './rng';

for (const op of ['+', '-'] as const)
  for (let level = 1; level <= 9; level++)
    test(`${op} level ${level}: 1000 seeded problems all match`, () => {
      const rng = mulberry32(level * 100 + (op === '+' ? 1 : 2));
      for (let i = 0; i < 1000; i++) {
        const p = generate(op, level, rng);
        expect(p.level).toBe(level);
        expect(p.op).toBe(op);
        expect(matchesLevel(p)).toBe(true);
      }
    });

test('level 9 subtraction varies (not one fixed problem)', () => {
  const rng = mulberry32(9);
  const s = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = generate('-', 9, rng);
    s.add(`${p.a}-${p.b}`);
  }
  expect(s.size).toBeGreaterThan(50);
});
