import type { Problem } from './types';

/** Decimal digits, ones first. digitsOf(0) is [0]. */
export function digitsOf(n: number): number[] {
  const out: number[] = [];
  do {
    out.push(n % 10);
    n = Math.floor(n / 10);
  } while (n > 0);
  return out;
}

export function answerOf(p: Problem): number {
  return p.op === '×' ? p.a * p.b : p.op === '+' ? p.a + p.b : p.a - p.b;
}

/** Number of digits in the answer (at least 1). */
export function answerColumns(p: Problem): number {
  return digitsOf(answerOf(p)).length;
}

/** Number of carries when adding a + b in columns. */
export function carryCount(a: number, b: number): number {
  let carries = 0;
  let carry = 0;
  while (a > 0 || b > 0) {
    const sum = (a % 10) + (b % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    carries += carry;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return carries;
}

/** Number of borrows when subtracting a − b in columns (requires a ≥ b). */
export function borrowCount(a: number, b: number): number {
  let borrows = 0;
  let borrow = 0;
  while (a > 0 || b > 0) {
    const borrowed = a % 10 - borrow < b % 10;
    borrow = borrowed ? 1 : 0;
    borrows += borrow;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return borrows;
}
