import { digitsOf } from './arith';
import type { Problem } from './types';

export interface Ghost { column: number; digit: number } // column 0 = ones

export interface Step {
  column: number;                    // column to highlight
  text: string;                      // bubble copy
  scratch: Record<number, string>;   // scratch boxes this step sets (overwrites)
  ghosts: Ghost[];                   // ghost digits this step adds
}

export interface RevealState {
  column: number | null;
  text: string;
  scratch: Record<number, string>;
  ghosts: Record<number, number>;
}

const NAMES = ['ones', 'tens', 'hundreds', 'thousands'];
const UNITS = ['a ten', 'a hundred', 'a thousand'];
const MINUS = '−';

function step(column: number, text: string, scratch: Record<number, string> = {}, ghosts: Ghost[] = []): Step {
  return { column, text, scratch, ghosts };
}

function solveAddition(a: number, b: number): Step[] {
  const ad = digitsOf(a), bd = digitsOf(b);
  const cols = Math.max(ad.length, bd.length);
  const steps: Step[] = [];
  let carry = 0;
  for (let i = 0; i < cols; i++) {
    const terms = [...(carry ? [carry] : []), ...(i < ad.length ? [ad[i]] : []), ...(i < bd.length ? [bd[i]] : [])];
    const sum = terms.reduce((x, y) => x + y, 0);
    if (terms.length === 1) {
      steps.push(step(i, `Now the ${NAMES[i]}: nothing to add, so ${sum} comes straight down.`, {}, [{ column: i, digit: sum }]));
      carry = 0;
      continue;
    }
    const expr = terms.join(' + ');
    steps.push(step(i, i === 0 ? `Start with the ones: what's ${expr}?` : `Now the ${NAMES[i]}: ${expr} = ?`));
    if (sum >= 10) {
      const ghosts: Ghost[] = [{ column: i, digit: sum % 10 }];
      const scratch: Record<number, string> = {};
      if (i + 1 < cols) scratch[i + 1] = '1';
      else ghosts.push({ column: i + 1, digit: 1 });
      steps.push(step(i,
        `${expr} = ${sum}. That's more than 9, so ${sum % 10} goes in the answer and the 1 carries to the ${NAMES[i + 1]}.`,
        scratch, ghosts));
      carry = 1;
    } else {
      steps.push(step(i, `That's ${sum}!`, {}, [{ column: i, digit: sum }]));
      carry = 0;
    }
  }
  return steps;
}

function solveSubtraction(a: number, b: number): Step[] {
  const top = digitsOf(a), bd = digitsOf(b);
  const answerDigits = digitsOf(a - b).length;
  const isLeadingZero = (i: number, r: number) => r === 0 && i > 0 && i >= answerDigits;
  const ghostFor = (i: number, r: number): Ghost[] => (isLeadingZero(i, r) ? [] : [{ column: i, digit: r }]);
  const steps: Step[] = [];

  for (let i = 0; i < top.length; i++) {
    let t = top[i];
    const hasD = i < bd.length;
    const d = hasD ? bd[i] : 0;
    const prefix = i === 0 ? 'Ones first: ' : `Now the ${NAMES[i]}: `;

    if (t >= d) {
      if (!hasD) {
        if (isLeadingZero(i, t)) continue;
        steps.push(step(i, `Now the ${NAMES[i]}: nothing to take away, so ${t} comes straight down.`, {}, ghostFor(i, t)));
        continue;
      }
      steps.push(step(i, `${prefix}${t} ${MINUS} ${d} = ?`));
      steps.push(step(i, `${t} ${MINUS} ${d} = ${t - d}.`, {}, ghostFor(i, t - d)));
      continue;
    }

    steps.push(step(i, `${prefix}${t} ${MINUS} ${d}? ${t} is smaller than ${d}, so we need to borrow.`));
    const n = top[i + 1];
    if (n > 0) {
      top[i + 1] = n - 1;
      steps.push(step(i, `Borrow ${UNITS[i]}: ${n} becomes ${n - 1}, and ${t} becomes ${t + 10}.`,
        { [i + 1]: String(n - 1), [i]: String(t + 10) }));
    } else {
      const m = top[i + 2];
      top[i + 2] = m - 1;
      top[i + 1] = 9;
      steps.push(step(i,
        `The ${NAMES[i + 1]} has nothing to lend, so borrow from the ${NAMES[i + 2]} first: ${m} becomes ${m - 1} and 0 becomes 10. ` +
        `Now the ${NAMES[i + 1]} can lend: 10 becomes 9 and ${t} becomes ${t + 10}.`,
        { [i + 2]: String(m - 1), [i + 1]: '9', [i]: String(t + 10) }));
    }
    t += 10;
    top[i] = t;
    steps.push(step(i, `${t} ${MINUS} ${d} = ?`));
    steps.push(step(i, `${t} ${MINUS} ${d} = ${t - d}.`, {}, ghostFor(i, t - d)));
  }
  return steps;
}

/** Column-by-column worked solution used for hints and Pass (spec §8). */
export function solve(p: Problem): Step[] {
  return p.op === '+' ? solveAddition(p.a, p.b) : solveSubtraction(p.a, p.b);
}

/** Merge the first `count` steps into what should currently be on screen. */
export function revealState(steps: Step[], count: number): RevealState {
  const shown = steps.slice(0, Math.min(count, steps.length));
  const state: RevealState = { column: null, text: '', scratch: {}, ghosts: {} };
  for (const s of shown) {
    state.column = s.column;
    state.text = s.text;
    Object.assign(state.scratch, s.scratch);
    for (const g of s.ghosts) state.ghosts[g.column] = g.digit;
  }
  return state;
}
