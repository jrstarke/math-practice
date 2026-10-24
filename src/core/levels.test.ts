import { matchesLevel, targetMs } from './levels';

test.each([
  ['+', 3, 5, 1], ['+', 7, 8, 2], ['+', 23, 4, 3], ['+', 34, 25, 4], ['+', 27, 8, 5],
  ['+', 47, 38, 6], ['+', 68, 57, 7], ['+', 256, 137, 8], ['+', 478, 356, 9],
  ['-', 9, 4, 1], ['-', 15, 7, 2], ['-', 28, 5, 3], ['-', 57, 23, 4], ['-', 42, 7, 5],
  ['-', 62, 29, 6], ['-', 345, 128, 7], ['-', 432, 178, 8], ['-', 302, 147, 9],
] as const)('%s %i %i is level %i', (op, a, b, level) =>
  expect(matchesLevel({ op, a, b, level })).toBe(true));

test.each([
  ['+', 47, 38, 4], ['+', 34, 25, 6], ['+', 68, 57, 6], ['+', 478, 356, 8],
  ['-', 62, 29, 4], ['-', 302, 147, 8], ['-', 432, 178, 9], ['-', 3, 7, 1],
] as const)('%s %i %i is NOT level %i', (op, a, b, level) =>
  expect(matchesLevel({ op, a, b, level })).toBe(false));

test('targetMs', () => expect(targetMs({ op: '+', a: 47, b: 38, level: 6 })).toBe(12000));
