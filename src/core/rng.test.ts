import { mulberry32, randInt } from './rng';

test('mulberry32 is deterministic', () => {
  const a = mulberry32(42), b = mulberry32(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});

test('mulberry32 returns values in [0, 1)', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 1000; i++) {
    const x = r();
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(1);
  }
});

test('randInt stays within inclusive bounds and hits both ends', () => {
  const r = mulberry32(1);
  const seen = new Set<number>();
  for (let i = 0; i < 1000; i++) seen.add(randInt(r, 3, 5));
  expect([...seen].sort()).toEqual([3, 4, 5]);
});
