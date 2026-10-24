import { answerOf } from './arith';
import { generate } from './generator';
import { mulberry32 } from './rng';
import { revealState, solve } from './solver';

test('47 + 38 steps match spec copy', () => {
  const s = solve({ op: '+', a: 47, b: 38, level: 6 });
  expect(s.map(x => x.text)).toEqual([
    "Start with the ones: what's 7 + 8?",
    "7 + 8 = 15. That's more than 9, so 5 goes in the answer and the 1 carries to the tens.",
    'Now the tens: 1 + 4 + 3 = ?',
    "That's 8!",
  ]);
  expect(s[1].scratch).toEqual({ 1: '1' });
  expect(s[1].ghosts).toEqual([{ column: 0, digit: 5 }]);
});

test('62 − 29 borrow steps', () => {
  const s = solve({ op: '-', a: 62, b: 29, level: 6 });
  expect(s.map(x => x.text)).toEqual([
    'Ones first: 2 − 9? 2 is smaller than 9, so we need to borrow.',
    'Borrow a ten: 6 becomes 5, and 2 becomes 12.',
    '12 − 9 = ?',
    '12 − 9 = 3.',
    'Now the tens: 5 − 2 = ?',
    '5 − 2 = 3.',
  ]);
  expect(s[1].scratch).toEqual({ 1: '5', 0: '12' });
});

test('302 − 147 borrows across zero', () => {
  const s = solve({ op: '-', a: 302, b: 147, level: 9 });
  expect(s[1].text).toBe('The tens has nothing to lend, so borrow from the hundreds first: 3 becomes 2 and 0 becomes 10. Now the tens can lend: 10 becomes 9 and 2 becomes 12.');
  expect(s[1].scratch).toEqual({ 2: '2', 1: '9', 0: '12' });
});

test('carry out of top column ghosts a new leading digit (68 + 57, 7 + 8)', () => {
  expect(revealState(solve({ op: '+', a: 68, b: 57, level: 7 }), 99).ghosts).toEqual({ 0: 5, 1: 2, 2: 1 });
  const r = revealState(solve({ op: '+', a: 7, b: 8, level: 2 }), 99);
  expect(r.ghosts).toEqual({ 0: 5, 1: 1 });
  expect(r.scratch).toEqual({});
});

test('no leading-zero ghost: 345 − 328', () => {
  expect(revealState(solve({ op: '-', a: 345, b: 328, level: 7 }), 99).ghosts).toEqual({ 0: 7, 1: 1 });
});

test('single-term columns get one "comes straight down" step', () => {
  expect(solve({ op: '+', a: 23, b: 4, level: 3 }).at(-1)!.text).toBe('Now the tens: nothing to add, so 2 comes straight down.');
  expect(solve({ op: '-', a: 42, b: 7, level: 5 }).at(-1)!.text).toBe('Now the tens: nothing to take away, so 3 comes straight down.');
});

test('12 − 7 has no step for the zero tens after the borrow', () => {
  const s = solve({ op: '-', a: 12, b: 7, level: 5 });
  expect(s.at(-1)!.text).toBe('12 − 7 = 5.');
  expect(s.filter(x => x.column === 1 && x.ghosts.length > 0)).toEqual([]);
});

test('revealState merges only the first N steps', () => {
  const s = solve({ op: '-', a: 432, b: 178, level: 8 });
  expect(revealState(s, 0)).toEqual({ column: null, text: '', scratch: {}, ghosts: {} });
  expect(revealState(s, 1).column).toBe(0);
  expect(revealState(s, 1).text).toBe(s[0].text);
});

test('later scratch values overwrite earlier ones (432 − 178 tens)', () => {
  const r = revealState(solve({ op: '-', a: 432, b: 178, level: 8 }), Infinity);
  expect(r.scratch).toEqual({ 0: '12', 1: '12', 2: '3' });
});

test('full reveal ghosts equal the answer at every level (property)', () => {
  for (const op of ['+', '-'] as const) for (let level = 1; level <= 9; level++) {
    const rng = mulberry32(level);
    for (let i = 0; i < 300; i++) {
      const p = generate(op, level, rng);
      const g = revealState(solve(p), Infinity).ghosts;
      const n = Object.entries(g).reduce((acc, [c, d]) => acc + d * 10 ** Number(c), 0);
      expect(n).toBe(answerOf(p));
    }
  }
});
