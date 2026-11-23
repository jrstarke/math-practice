// @vitest-environment jsdom
import { initialEntry, type EntryState } from '../core/entry';
import type { Problem } from '../core/types';
import { renderBlankProblem } from './blankProblemView';
import type { Phase } from './problemView';

const render = (problem: Problem, entry: EntryState = initialEntry(), over: { ghosts?: Record<number, number>; phase?: Phase } = {}) => {
  const container = document.createElement('div');
  renderBlankProblem(container, { problem, entry, ghosts: over.ghosts ?? {}, highlight: null, phase: over.phase ?? 'answering' });
  return container;
};
const flat = (c: HTMLElement) => c.textContent!.replace(/\s/g, '');
const boxes = (c: HTMLElement) => c.querySelectorAll('[data-role="answer"] .cell');

const missingB: Problem = { op: '+', a: 6, b: 4, level: 1, shape: 'missing-b', stage: 1 };
const missingA: Problem = { op: '-', a: 12, b: 5, level: 2, shape: 'missing-a', stage: 2 };
const flipped: Problem = { op: '+', a: 5, b: 7, level: 2, shape: 'flipped', stage: 2 };
const balance: Problem = { op: '+', a: 8, b: 3, c: 5, level: 2, shape: 'balance', stage: 2 };

test('missing-b reads a + [] = r', () => {
  const c = render(missingB);
  expect(flat(c)).toBe('6+=10');
  expect(boxes(c).length).toBe(2);
  expect(c.querySelector('.problem')!.getAttribute('data-shape')).toBe('missing-b');
});

test('missing-a reads [] - b = r, with a two-digit blank', () => {
  const c = render(missingA);
  expect(flat(c)).toBe('−5=7');
  expect(boxes(c).length).toBe(2);
  expect(c.querySelector('.blank-line')!.firstElementChild).toBe(c.querySelector('.blank-wrap'));
});

test('flipped reads r = a + []', () => {
  const c = render(flipped);
  expect(flat(c)).toBe('12=5+');
  expect(c.querySelector('.blank-line')!.lastElementChild).toBe(c.querySelector('.blank-wrap'));
});

test('balance reads a + b = [] + c, with the data attributes', () => {
  const c = render(balance);
  expect(flat(c)).toBe('8+3=+5');
  expect(boxes(c).length).toBe(2);
  const p = c.querySelector<HTMLElement>('.problem')!;
  expect([p.dataset.shape, p.dataset.a, p.dataset.b, p.dataset.c]).toEqual(['balance', '8', '3', '5']);
});

test('subtraction uses the minus sign', () => {
  const c = render({ op: '-', a: 10, b: 6, level: 1, shape: 'missing-b', stage: 1 });
  expect(flat(c)).toBe('10−=4');
});

test('every blank has at least two boxes; more only when the answer has more digits', () => {
  expect(boxes(render({ op: '+', a: 23, b: 12, level: 3, shape: 'missing-b', stage: 3 })).length).toBe(2);
  expect(boxes(render({ op: '+', a: 23, b: 4, level: 3, shape: 'missing-b', stage: 3 })).length).toBe(2);
  expect(boxes(render({ op: '+', a: 400, b: 250, level: 6, shape: 'missing-b', stage: 3 })).length).toBe(3);
});

test('a one-digit answer: the right digit lands in the ones box, the tens box stays empty', () => {
  const cells = [...boxes(render(missingB, { ...initialEntry(), answer: '4' }))];
  expect(cells.map(x => x.textContent)).toEqual(['', '4']);
});

test('typing 10 into 9 + [] shows 10 in both boxes', () => {
  const nine: Problem = { op: '+', a: 9, b: 1, level: 1, shape: 'missing-b', stage: 1 };
  const c = render(nine, { ...initialEntry(), answer: '10' });
  expect([...boxes(c)].map(x => x.textContent)).toEqual(['1', '0']);
  expect(flat(c)).toBe('9+10=10');
});

test('the answer 10 typed into 6 + [] = 10 shows 10 (the line reads 6 + 10 = 10)', () => {
  expect(flat(render(missingB, { ...initialEntry(), answer: '10' }))).toBe('6+10=10');
});

test('ghost digits of a one-digit answer land in the ones box, the tens box empty', () => {
  const c = render(missingB, initialEntry(), { ghosts: { 0: 4 } });
  expect([...c.querySelectorAll('[data-role="ghosts"] .cell')].map(x => x.textContent)).toEqual(['', '4']);
});

test('the width estimate counts the real number of boxes', () => {
  const units = (p: Problem) => Number(render(p).querySelector<HTMLElement>('.problem')!.style.getPropertyValue('--units'));
  // 6 + [][] = 10: 2 boxes + 1 + 2 chars = 5, two signs
  expect(units(missingB)).toBeCloseTo(5 * 0.85 + 3, 2);
});

test('typed digits fill the boxes from the right', () => {
  const c = render(missingA, { ...initialEntry(), answer: '7' });
  const cells = [...boxes(c)];
  expect(cells.map(x => x.textContent)).toEqual(['', '7']);
  expect(cells.map(x => (x as HTMLElement).dataset.col)).toEqual(['1', '0']);
});

test('faded, correct and focused follow the entry and phase', () => {
  const answer = (c: HTMLElement) => c.querySelector('[data-role="answer"]')!;
  expect(answer(render(missingB)).classList.contains('focused')).toBe(true);
  expect(answer(render(missingB, { ...initialEntry(), faded: true })).classList.contains('faded')).toBe(true);
  const done = answer(render(missingB, initialEntry(), { phase: 'correct' }));
  expect(done.classList.contains('correct')).toBe(true);
  expect(done.classList.contains('focused')).toBe(false);
  expect(answer(render(missingB)).classList.contains('answer-row')).toBe(true);
});

test('ghosts render as [data-ghost] in their columns', () => {
  const c = render(missingA, initialEntry(), { ghosts: { 0: 7 } });
  const g = c.querySelectorAll('[data-ghost]');
  expect(g.length).toBe(1);
  expect(g[0].textContent).toBe('7');
  expect(render(missingA).querySelectorAll('[data-ghost]').length).toBe(0);
});
