import { BLANK_MIN_BOXES, matchesLevel, maxAnswerLength, targetMs } from './levels';
import { initialEntry, pressKey, type Key } from './entry';
import { OPS } from './operations/registry';
import type { Problem } from './types';

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

test('matchesLevel on shapes', () => {
  const ok = { op: '+', a: 6, b: 3, level: 1, shape: 'missing-b', stage: 1 } as const;
  expect(matchesLevel(ok)).toBe(true);
  expect(matchesLevel({ ...ok, shape: 'missing-a' })).toBe(false);
  expect(matchesLevel({ ...ok, stage: undefined })).toBe(false);
  expect(matchesLevel({ ...ok, stage: 4 })).toBe(false);
  expect(matchesLevel({ ...ok, stage: 2 })).toBe(false);
  expect(matchesLevel({ op: '×', a: 2, b: 3, level: 1, shape: 'missing-b', stage: 1 })).toBe(false);
  const bal = { op: '+', a: 8, b: 5, level: 2, shape: 'balance', stage: 2, c: 4 } as const;
  expect(matchesLevel(bal)).toBe(true);
  expect(matchesLevel({ ...bal, c: 13 })).toBe(false);
  expect(matchesLevel({ ...bal, c: 8 })).toBe(false);
  expect(matchesLevel({ ...bal, c: undefined })).toBe(false);
  expect(matchesLevel({ ...bal, op: '-', a: 13, b: 5 })).toBe(false);
});

test('maxAnswerLength: at least BLANK_MIN_BOXES for a blank shape, the usual limit otherwise', () => {
  expect(BLANK_MIN_BOXES).toBe(2);
  expect(maxAnswerLength({ op: '+', a: 6, b: 4, level: 1, shape: 'missing-b', stage: 1 })).toBe(2);
  expect(maxAnswerLength({ op: '+', a: 40, b: 25, level: 4, shape: 'missing-b', stage: 3 })).toBe(2);
  expect(maxAnswerLength({ op: '+', a: 400, b: 250, level: 6, shape: 'missing-b', stage: 3 })).toBe(3);
  const plain = { op: '+', a: 34, b: 25, level: 4 } as const;
  expect(maxAnswerLength(plain)).toBe(OPS['+'].maxAnswerLen(plain));
});

test('a one-digit blank holds two digits, so the sum shows (and is wrong); a third digit is held back', () => {
  const one = { op: '+', a: 6, b: 4, level: 1, shape: 'missing-b', stage: 1 } as const; // 6 + [] = 10
  const press = (p: Problem, keys: Key[]) => keys.reduce((s, k) => pressKey(s, k, maxAnswerLength(p)).state, initialEntry());
  expect(press(one, ['1', '0']).answer).toBe('10');
  expect(press(one, ['1', '0', '5']).answer).toBe('10');
  expect(press(one, ['4']).answer).toBe('4');
  const two = { op: '+', a: 40, b: 25, level: 4, shape: 'missing-b', stage: 3 } as const;
  expect(press(two, ['2', '5', '9']).answer).toBe('25');
});
