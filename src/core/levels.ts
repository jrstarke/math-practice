import { answerColumns, borrowCount, carryCount, digitsOf } from './arith';
import type { Problem } from './types';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 9;

const oneDigit = (n: number) => n >= 1 && n <= 9;
const twoDigit = (n: number) => n >= 10 && n <= 99;
const threeDigit = (n: number) => n >= 100 && n <= 999;
const tensDigit = (n: number) => digitsOf(n)[1] ?? 0;

function matchesAddition({ a, b, level }: Problem): boolean {
  const sum = a + b;
  const carries = carryCount(a, b);
  switch (level) {
    case 1: return oneDigit(a) && oneDigit(b) && sum <= 10;
    case 2: return oneDigit(a) && oneDigit(b) && sum >= 11 && sum <= 18;
    case 3: return twoDigit(a) && oneDigit(b) && carries === 0;
    case 4: return twoDigit(a) && twoDigit(b) && carries === 0;
    case 5: return twoDigit(a) && oneDigit(b) && carries === 1 && sum < 100;
    case 6: return twoDigit(a) && twoDigit(b) && (a % 10) + (b % 10) >= 10 && sum < 100;
    case 7: return twoDigit(a) && twoDigit(b) && sum >= 100;
    case 8: return threeDigit(a) && (twoDigit(b) || threeDigit(b)) && carries === 1 && sum < 1000;
    case 9: return threeDigit(a) && threeDigit(b) && carries >= 2;
    default: return false;
  }
}

function matchesSubtraction({ a, b, level }: Problem): boolean {
  if (a < b) return false;
  const borrows = borrowCount(a, b);
  switch (level) {
    case 1: return a <= 10 && oneDigit(b);
    case 2: return a >= 11 && a <= 18 && oneDigit(b) && a - b <= 9;
    case 3: return twoDigit(a) && oneDigit(b) && borrows === 0 && a > b;
    case 4: return twoDigit(a) && twoDigit(b) && borrows === 0 && a > b;
    case 5: return twoDigit(a) && oneDigit(b) && borrows === 1;
    case 6: return twoDigit(a) && twoDigit(b) && borrows === 1 && a > b;
    case 7: return threeDigit(a) && (twoDigit(b) || threeDigit(b)) && borrows === 1 && tensDigit(a) !== 0 && a > b;
    case 8: return threeDigit(a) && threeDigit(b) && borrows === 2 && tensDigit(a) !== 0 && a > b;
    case 9: return threeDigit(a) && threeDigit(b) && tensDigit(a) === 0 && a % 10 < b % 10 && a > b;
    default: return false;
  }
}

/** True iff the problem satisfies the rules of its level for its operation (spec §3). */
export function matchesLevel(p: Problem): boolean {
  return p.op === '+' ? matchesAddition(p) : matchesSubtraction(p);
}

/** Time within which a first-try answer counts as "quick" (spec §4). */
export function targetMs(p: Problem): number {
  return 4000 + 4000 * answerColumns(p);
}
