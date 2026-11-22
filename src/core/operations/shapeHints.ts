import type { Problem } from '../types';
import type { Step } from './types';
import { answerOf, digitsOf, resultOf } from '../arith';

function hintTexts(p: Problem): [string, string] {
  const { a, b } = p;
  const r = resultOf(p);
  const plus = p.op === '+';
  switch (p.shape) {
    case 'missing-a':
      return plus
        ? [`Something plus ${b} makes ${r}. What is ${r} take away ${b}?`, `Count back ${b} from ${r}.`]
        : [`Take away ${b} and ${r} is left. What did you start with?`, `Start at ${r} and count up ${b}.`];
    case 'balance': {
      const s = a + b;
      return [`Both sides must be the same amount. What is ${a} + ${b}?`,
        `The left side is ${s}. So ${p.c} + something must also be ${s}.`];
    }
    default: // missing-b, flipped
      return plus
        ? [`You start at ${a} and want ${r}. How many more is that?`, `Count up from ${a} until you reach ${r}.`]
        : [`You start with ${a} and end with ${r}. How many went away?`, `Count up from ${r} to ${a}. How many steps?`];
  }
}

function solvedText(p: Problem): string {
  const ans = answerOf(p);
  if (p.shape === 'balance') {
    const s = p.a + p.b;
    return `${p.a} + ${p.b} = ${s}, and ${p.c} + ${ans} = ${s}, so the missing number is ${ans}.`;
  }
  return `${p.a} ${p.op} ${p.b} = ${resultOf(p)}, so the missing number is ${ans}.`;
}

/** Two short hints, then the solved sentence with the typed number ghosted in (Pass only). */
export function solveShape(p: Problem): Step[] {
  const hints = hintTexts(p).map((text): Step => ({ column: null, text, scratch: {}, ghosts: [] }));
  const ghosts = digitsOf(answerOf(p)).map((digit, column) => ({ column, digit }));
  return [...hints, { column: null, text: solvedText(p), scratch: {}, ghosts, passOnly: true }];
}
