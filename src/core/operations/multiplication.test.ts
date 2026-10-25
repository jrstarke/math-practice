import { generate } from '../generator';
import { mulberry32 } from '../rng';
import { revealState, solve } from '../solver';
import {
  groupAssignment,
  matchesLevel,
  maxAnswerLen,
  multiplicationModule,
  targetMs,
} from './multiplication';

for (let level = 1; level <= 9; level++)
  test(`× level ${level}: 1000 seeded problems all match`, () => {
    const rng = mulberry32(level * 100 + 3);
    for (let i = 0; i < 1000; i++) {
      const p = generate('×', level, rng);
      expect(p.level).toBe(level);
      expect(p.op).toBe('×');
      expect(matchesLevel(p)).toBe(true);
    }
  });

test.each([
  [2, 7, 1], [7, 2, 1], [2, 2, 1], [2, 9, 1],
  [10, 4, 2], [4, 10, 2], [10, 2, 2], [10, 9, 2],
  [5, 3, 3], [3, 5, 3], [5, 2, 3], [5, 9, 3],
  [3, 4, 4], [4, 3, 4], [3, 2, 4], [3, 9, 4],
  [4, 6, 5], [6, 4, 5], [4, 2, 5], [4, 9, 5],
  [0, 7, 6], [1, 8, 6], [10, 0, 6], [5, 0, 6], [3, 9, 6], [10, 9, 6],
  [6, 7, 7], [9, 9, 7], [6, 6, 7],
  [24, 3, 8], [11, 2, 8], [99, 9, 8],
  [305, 3, 9], [101, 2, 9], [999, 5, 9],
] as const)('%i × %i is level %i', (a, b, level) =>
  expect(matchesLevel({ op: '×', a, b, level })).toBe(true));

test.each([
  [1, 7, 1], [2, 1, 1], [2, 10, 1], [3, 7, 1],
  [10, 1, 2], [10, 10, 2], [2, 7, 2],
  [5, 1, 3], [5, 10, 3],
  [3, 1, 4], [3, 10, 4],
  [4, 1, 5], [4, 10, 5],
  [11, 9, 6], [7, 8, 6],
  [5, 9, 7], [10, 6, 7],
  [10, 2, 8], [100, 2, 8], [24, 10, 8], [24, 1, 8],
  [100, 2, 9], [1000, 2, 9], [305, 1, 9], [305, 10, 9], [305, 6, 9],
] as const)('%i × %i is NOT level %i', (a, b, level) =>
  expect(matchesLevel({ op: '×', a, b, level })).toBe(false));

test.each([
  [1, 8000], [2, 8000], [3, 8000], [4, 8000], [5, 8000], [6, 8000], [7, 8000],
  [8, 20000], [9, 30000],
] as const)('targetMs for level %i is %i', (level, ms) => {
  const a = level === 8 ? 24 : level === 9 ? 305 : 7;
  const b = level === 8 ? 3 : level === 9 ? 3 : 2;
  expect(targetMs({ op: '×', a, b, level })).toBe(ms);
});

test.each([
  [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 3], [9, 4],
] as const)('maxAnswerLen for level %i is %i', (level, len) => {
  const a = level === 8 ? 24 : level === 9 ? 305 : 7;
  const b = level === 8 ? 3 : level === 9 ? 3 : 2;
  expect(maxAnswerLen({ op: '×', a, b, level })).toBe(len);
});

test.each([
  [10, 4, 10, 4], [4, 10, 10, 4], [2, 10, 10, 2], [5, 3, 3, 5],
  [1, 10, 10, 1], [1, 0, 0, 1], [0, 0, 0, 0], [1, 1, 1, 1],
])('groupAssignment(%i, %i) → size %i, groups %i', (a, b, size, groups) => {
  const r = groupAssignment(a, b, 6);
  expect(r.groupSize).toBe(size);
  expect(r.totalGroups).toBe(groups);
});

test('groupAssignment for levels 8-9 always uses a as groupSize, b as totalGroups', () => {
  expect(groupAssignment(24, 3, 8)).toEqual({ groupSize: 24, totalGroups: 3, needsTurnAround: false });
  expect(groupAssignment(305, 4, 9)).toEqual({ groupSize: 305, totalGroups: 4, needsTurnAround: false });
});

test('no hint step states or pictures the answer; the trailing step always does, at every level', () => {
  for (let level = 1; level <= 9; level++) {
    const rng = mulberry32(level + 500);
    for (let i = 0; i < 300; i++) {
      const p = generate('×', level, rng);
      const steps = solve(p);
      const answer = p.a * p.b;
      const last = steps.at(-1)!;
      expect(last.passOnly).toBe(true);
      expect(revealState(steps, Infinity).ghosts).toEqual(
        Object.fromEntries(
          String(answer)
            .split('')
            .reverse()
            .map((d, i) => [i, Number(d)]),
        ),
      );
      for (const s of steps.slice(0, -1)) {
        expect(s.passOnly).toBeFalsy();
        expect(s.text).not.toContain(String(answer));
        expect(s.ghosts).toEqual([]);
        if (s.picture) {
          expect(s.picture.tally.some(line => line.includes(`= ${answer}`))).toBe(false);
        }
      }
    }
  }
});

test('picture groupSize × totalGroups always equals the answer, at every level and step', () => {
  for (let level = 1; level <= 9; level++) {
    const rng = mulberry32(level + 900);
    for (let i = 0; i < 300; i++) {
      const p = generate('×', level, rng);
      const answer = p.a * p.b;
      for (const s of solve(p)) {
        if (!s.picture) continue;
        expect(s.picture.groupSize * s.picture.totalGroups).toBe(answer);
      }
    }
  }
});

test('turn-around follows written order (needsTurnAround true only when a is the groupSize)', () => {
  // Levels 1-5 and 7 each have their own fixed, spec-pinned group-size
  // convention (see the level table) rather than routing through the
  // generic value-based tie-break — groupAssignment's documented purpose
  // is level 6 (plus the level 8-9 rule 5 override).
  expect(groupAssignment(3, 7, 6)).toEqual({ groupSize: 3, totalGroups: 7, needsTurnAround: true });
  expect(groupAssignment(7, 3, 6)).toEqual({ groupSize: 3, totalGroups: 7, needsTurnAround: false });
});

test('level-6 zero/one hints pose a question in words, never stating the answer', () => {
  expect(solve({ op: '×', a: 8, b: 0, level: 6 })[0].text).toBe('How many are in eight groups of nothing?');
  expect(solve({ op: '×', a: 1, b: 7, level: 6 })[0].text).toBe('How many are in one group of seven?');
});

test('picture.parts always reconstructs groupSize (no empty-circle groups for a renderer)', () => {
  const placeValue = (label: string) => (label === 'hundreds' ? 100 : label === 'tens' ? 10 : 1);
  for (let level = 1; level <= 9; level++) {
    const rng = mulberry32(level + 1700);
    for (let i = 0; i < 300; i++) {
      const p = generate('×', level, rng);
      for (const s of solve(p)) {
        if (!s.picture) continue;
        const reconstructed = s.picture.parts.reduce((sum, part) => sum + part.count * placeValue(part.label), 0);
        expect(reconstructed).toBe(s.picture.groupSize);
      }
    }
  }
});

test('groupsOutlined is always 0 on levels 1-7, and groupsShown is 0 or 1 on levels 8-9', () => {
  for (let level = 1; level <= 9; level++) {
    const rng = mulberry32(level + 1300);
    for (let i = 0; i < 300; i++) {
      const p = generate('×', level, rng);
      for (const s of solve(p)) {
        if (!s.picture) continue;
        if (level <= 7) {
          expect(s.picture.groupsOutlined).toBe(0);
        } else {
          expect([0, 1]).toContain(s.picture.groupsShown);
        }
      }
    }
  }
});

test('level-9 zero-tens case: no "0 tens" or bare "+ 0", and tens part omitted', () => {
  const steps = solve({ op: '×', a: 305, b: 3, level: 9 });
  for (const s of steps) {
    expect(s.text).not.toContain('0 tens');
    expect(s.text).not.toMatch(/\+\s*0(\D|$)/);
    if (s.picture) {
      expect(s.picture.parts.some(p => p.label === 'tens')).toBe(false);
    }
  }
});

test('multiplicationModule implements the full OpModule interface', () => {
  const rng = mulberry32(42);
  const p = multiplicationModule.generate(5, rng);
  expect(multiplicationModule.matchesLevel(p)).toBe(true);
  expect(multiplicationModule.targetMs(p)).toBe(8000);
  expect(multiplicationModule.maxAnswerLen(p)).toBe(2);
  expect(multiplicationModule.solve(p).length).toBeGreaterThan(0);
});
