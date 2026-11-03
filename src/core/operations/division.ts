import { digitsOf } from '../arith';
import type { Problem } from '../types';
import type { Rng } from '../rng';
import { randInt } from '../rng';
import type { OpModule, PicturePart, PictureState, Place, Step } from './types';

type Range = [number, number];
const inRange = (n: number, [lo, hi]: Range) => n >= lo && n <= hi;

/** The multiplication fact a fact-level division undoes: the divisor and the quotient. */
function factPair(p: Problem): [number, number] | null {
  if (p.b < 1 || p.a % p.b !== 0) return null;
  return [p.b, p.a / p.b];
}

/** One of the pair equals `t` exactly and the other is in `other` (either way round). */
function oneIsExactly([x, y]: [number, number], t: number, other: Range): boolean {
  return (x === t && inRange(y, other)) || (y === t && inRange(x, other));
}

/** Multiplication's level-6 review set; the other factor is 0-9. */
const SIX_FIXED = [0, 1, 2, 3, 4, 5, 10];

/** The table each of levels 1-5 undoes (the same order as multiplication's ladder). */
const FACT_TABLE: Record<number, number> = { 1: 2, 2: 10, 3: 5, 4: 3, 5: 4 };

/** Quotient with a ones digit of 1-9, so breaking apart always has ones to share. */
const notTens = (q: number) => q % 10 !== 0;

export function matchesLevel(p: Problem): boolean {
  const pair = factPair(p);
  if (!pair) return false;
  const [, q] = pair;
  switch (p.level) {
    case 1: case 2: case 3: case 4: case 5:
      return oneIsExactly(pair, FACT_TABLE[p.level], [2, 9]);
    case 6:
      return SIX_FIXED.some(t => oneIsExactly(pair, t, [0, 9]));
    case 7: return inRange(p.a, [20, 99]) && inRange(p.b, [2, 5]) && inRange(q, [10, 49]) && notTens(q);
    case 8: return inRange(p.a, [100, 999]) && inRange(p.b, [2, 5]) && notTens(q);
    case 9: return inRange(p.b, [6, 9]) && inRange(q, [6, 9]);
    default: return false;
  }
}

/** Undo the fact x × y: either factor can be the divisor (both directions appear), never 0. */
function undo(x: number, y: number, level: number, rng: Rng): Problem {
  const choices = [x, y].filter(d => d !== 0);
  const b = choices[randInt(rng, 0, choices.length - 1)];
  return { op: '÷', a: x * y, b, level };
}

export function generate(level: number, rng: Rng): Problem {
  switch (level) {
    case 1: case 2: case 3: case 4: case 5:
      return undo(FACT_TABLE[level], randInt(rng, 2, 9), level, rng);
    case 6: {
      let fixed = 0;
      let other = 0;
      while (fixed === 0 && other === 0) { // (0, 0) would need ÷ 0
        fixed = SIX_FIXED[randInt(rng, 0, SIX_FIXED.length - 1)];
        other = randInt(rng, 0, 9);
      }
      return undo(fixed, other, level, rng);
    }
    case 7: {
      const b = randInt(rng, 2, 5);
      const maxQ = Math.floor(99 / b);
      let q = 0;
      while (!notTens(q)) q = randInt(rng, 10, Math.min(49, maxQ));
      return { op: '÷', a: q * b, b, level };
    }
    case 8: {
      const b = randInt(rng, 2, 5);
      let q = 0;
      while (!notTens(q)) q = randInt(rng, Math.ceil(100 / b), Math.floor(999 / b));
      return { op: '÷', a: q * b, b, level };
    }
    default: // level 9: the 6-9 facts
      return undo(randInt(rng, 6, 9), randInt(rng, 6, 9), level, rng);
  }
}

export function targetMs(p: Problem): number {
  if (p.level === 7) return 20000;
  if (p.level === 8) return 30000;
  return 8000;
}

/** Fixed per level from its largest quotient (10, 10, 49, 499), so the box count never hints at the answer. */
export function maxAnswerLen(p: Problem): number {
  if (p.level === 8) return 3;
  if (p.level === 2 || p.level === 6 || p.level === 7) return 2;
  return 1;
}

// ---- Sharing hints: the divisor is the number of groups; blocks move from the pile into the groups ----

const WORDS = ['nothing', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const NOUN: Record<Place, [string, string]> = { hundreds: ['hundred', 'hundreds'], tens: ['ten', 'tens'], ones: ['one', 'ones'] };
const noun = (place: Place, n: number) => NOUN[place][n === 1 ? 0 : 1];
const NEXT: Partial<Record<Place, Place>> = { hundreds: 'tens', tens: 'ones' };

type Counts = Partial<Record<Place, number>>;
/** Place-value blocks, biggest first, leaving out empty places. */
const blocks = (c: Counts): PicturePart[] => (['hundreds', 'tens', 'ones'] as Place[])
  .filter(place => (c[place] ?? 0) > 0)
  .map(place => ({ label: place, count: c[place]!, revealed: true }));
/** Plain unit squares (fact levels), or nothing. */
const squares = (label: string, n: number): PicturePart[] => (n > 0 ? [{ label, count: n, revealed: true }] : []);

function pic(groups: number, parts: PicturePart[], pile: PicturePart[], tally: string[]): PictureState {
  return { totalGroups: groups, groupSize: 0, groupsShown: groups, groupsOutlined: 0, parts, pile, tally };
}

function step(text: string, picture: PictureState): Step {
  return { column: null, text, scratch: {}, ghosts: [], picture };
}

const naming = (a: number, b: number) => `Share ${a} into ${b} equal groups. ${b} groups of what make ${a}?`;

type Strategy = { steps: Step[]; final: PictureState };

/** Levels 1-6: deal one to each group per round, counting by the divisor; the last round is hers. */
function dealSteps(a: number, b: number): Strategy {
  const q = a / b;
  if (a === 0) {
    const empty = pic(b, [], [], []);
    return { steps: [step(`Share nothing into ${WORDS[b]} group${b === 1 ? '' : 's'}. How many in each?`, empty)], final: empty };
  }
  if (b === 1) { // ÷ 1 before the answer-10 case, so 10 ÷ 1 also asks in words (its ten stays a rod)
    const pile = q === 10 ? blocks({ tens: 1 }) : squares('to share', a);
    const final = pic(1, q === 10 ? blocks({ tens: 1 }) : squares('each', q), [], []);
    return { steps: [step('Put them all in one group. How many are in it?', pic(1, [], pile, []))], final };
  }
  if (q === 10) { // 40 ÷ 4: one ten for each group
    const final = pic(b, blocks({ tens: 1 }), [], []);
    return { steps: [step(naming(a, b), pic(b, [], blocks({ tens: b }), []))], final };
  }
  const final = pic(b, squares('each', q), [], []);
  const steps = [step(naming(a, b), pic(b, [], squares('to share', a), []))];
  if (q >= 2) {
    const counts = Array.from({ length: q - 1 }, (_, i) => (i + 1) * b).join(', ');
    steps.push(step('Deal one to each group at a time. How many in each group when it\'s all shared?',
      pic(b, squares('each', q - 1), squares('to share', b), [counts])));
  }
  return { steps, final };
}

/** Level 9: give each group 5 first (the ×5 facts she knows), then share what's left. */
function fiveFirstSteps(a: number, b: number): Strategy {
  const q = a / b;
  const left = a - 5 * b;
  const fiveLine = `${b} groups of 5 = ${5 * b}`;
  const dealt = pic(b, squares('five', 5), squares('to share', left), [fiveLine]);
  return {
    steps: [
      step(naming(a, b), pic(b, [], squares('to share', a), [])),
      step(`Give each group 5: ${fiveLine}. ${left} left to share.`, dealt),
      step(`Share the ${left} into ${b} groups. How many in each group altogether?`,
        { ...dealt, tally: [fiveLine, `${left} left`] }),
    ],
    final: pic(b, [{ label: 'five', count: 5, revealed: true }, ...squares('rest', q - 5)], [], []),
  };
}

/** Levels 7-8: share each place from the biggest, trading what can't be shared for the next place down. */
function placeSteps(a: number, b: number): Strategy {
  const places: Place[] = a >= 100 ? ['hundreds', 'tens', 'ones'] : ['tens', 'ones'];
  const pile: Counts = { hundreds: Math.floor(a / 100) % 10, tens: Math.floor(a / 10) % 10, ones: a % 10 };
  const each: Counts = {};
  const tally: string[] = [];
  const snap = () => pic(b, blocks(each), blocks(pile), [...tally]);
  const steps = [step(naming(a, b), snap())];

  for (const place of places.slice(0, -1)) {
    const next = NEXT[place]!;
    const avail = pile[place] ?? 0;
    if (avail === 0) continue;
    if (avail >= b) {
      const share = Math.floor(avail / b);
      const left = avail % b;
      each[place] = share;
      pile[place] = left;
      tally.push(`${share} ${noun(place, share)} in each group`);
      steps.push(step(`Share the ${place}: ${share} ${noun(place, share)} in each group${left ? `, ${left} ${noun(place, left)} left over` : ''}.`, snap()));
      if (left > 0) {
        pile[place] = 0;
        pile[next] = (pile[next] ?? 0) + left * 10;
        const what = left === 1 ? NOUN[place][0] : `${left} ${NOUN[place][1]}`;
        steps.push(step(`Trade the leftover ${what} for ${left * 10} ${next}. Now there are ${pile[next]} ${next}.`, snap()));
      }
    } else {
      pile[place] = 0;
      pile[next] = (pile[next] ?? 0) + avail * 10;
      steps.push(step(`Can't share ${avail} ${noun(place, avail)} into ${b} groups. Trade ${avail === 1 ? 'it' : 'them'} for ${avail * 10} ${next}: ${pile[next]} ${next}.`, snap()));
    }
  }
  // Ones are always left in the pile for her (the quotient is never a multiple of 10).
  steps.push(step(`Share ${pile.ones} ones into ${b} groups. How many in each group altogether?`, snap()));
  each.ones = (pile.ones ?? 0) / b;
  pile.ones = 0;
  return { steps, final: pic(b, blocks(each), [], []) };
}

function strategyFor(p: Problem): Strategy {
  if (p.level === 7 || p.level === 8) return placeSteps(p.a, p.b);
  if (p.level === 9) return fiveFirstSteps(p.a, p.b);
  return dealSteps(p.a, p.b);
}

export function solve(p: Problem): Step[] {
  const q = p.a / p.b;
  const { steps, final } = strategyFor(p);
  const lastTally = steps.at(-1)?.picture?.tally ?? [];
  return [...steps, {
    column: null,
    text: `${p.a} ÷ ${p.b} = ${q}.`,
    scratch: {},
    ghosts: digitsOf(q).map((digit, column) => ({ column, digit })),
    picture: { ...final, tally: lastTally },
    passOnly: true,
  }];
}

export const divisionModule: OpModule = { matchesLevel, generate, targetMs, maxAnswerLen, solve };
