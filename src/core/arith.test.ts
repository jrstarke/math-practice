import { answerColumns, answerOf, resultOf, borrowCount, carryCount, digitsOf } from './arith';

test('digitsOf', () => {
  expect(digitsOf(302)).toEqual([2, 0, 3]);
  expect(digitsOf(0)).toEqual([0]);
});

test('carryCount', () => {
  expect(carryCount(34, 25)).toBe(0);
  expect(carryCount(47, 38)).toBe(1);
  expect(carryCount(68, 57)).toBe(2);
  expect(carryCount(478, 356)).toBe(2);
  expect(carryCount(999, 1)).toBe(3);
});

test('borrowCount', () => {
  expect(borrowCount(57, 23)).toBe(0);
  expect(borrowCount(62, 29)).toBe(1);
  expect(borrowCount(432, 178)).toBe(2);
  expect(borrowCount(302, 147)).toBe(2);
});

test('answerOf / answerColumns', () => {
  expect(answerOf({ op: '-', a: 5, b: 5, level: 1 })).toBe(0);
  expect(answerOf({ op: '+', a: 47, b: 38, level: 6 })).toBe(85);
  expect(answerColumns({ op: '-', a: 5, b: 5, level: 1 })).toBe(1);
  expect(answerColumns({ op: '+', a: 68, b: 57, level: 7 })).toBe(3);
  expect(answerOf({ op: '×', a: 6, b: 7, level: 1 })).toBe(42);
  expect(answerColumns({ op: '×', a: 24, b: 3, level: 7 })).toBe(2);
});

test('answerOf is the typed number for shaped problems', () => {
  expect(answerOf({ op: '+', a: 6, b: 4, level: 1, shape: 'missing-b' })).toBe(4);
  expect(answerOf({ op: '-', a: 12, b: 5, level: 2, shape: 'missing-a' })).toBe(12);
  expect(answerOf({ op: '+', a: 5, b: 7, level: 2, shape: 'flipped' })).toBe(7);
  expect(answerOf({ op: '+', a: 8, b: 3, c: 5, level: 2, shape: 'balance' })).toBe(6);
  expect(answerOf({ op: '+', a: 6, b: 4, level: 1 })).toBe(10);
  expect(answerOf({ op: '-', a: 9, b: 4, level: 1 })).toBe(5);
  expect(answerOf({ op: '×', a: 6, b: 7, level: 1 })).toBe(42);
  expect(answerOf({ op: '÷', a: 72, b: 3, level: 7 })).toBe(24);
});

test('resultOf is the arithmetic result', () => {
  expect(resultOf({ op: '+', a: 6, b: 4, level: 1, shape: 'missing-b' })).toBe(10);
  expect(resultOf({ op: '-', a: 12, b: 5, level: 2, shape: 'missing-a' })).toBe(7);
});

test('answerColumns follows the typed number', () => {
  expect(answerColumns({ op: '+', a: 8, b: 3, c: 5, level: 2, shape: 'balance' })).toBe(1);
  expect(answerColumns({ op: '+', a: 9, b: 8, c: 1, level: 2, shape: 'balance' })).toBe(2);
});
