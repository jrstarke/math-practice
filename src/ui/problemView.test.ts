// @vitest-environment jsdom
import { initialEntry } from '../core/entry';
import type { Problem } from '../core/types';
import { renderColumnProblem, scratchColumns } from './problemView';

const p = (op: Problem['op']): Problem => ({ op, a: 24, b: 3, level: 8 });

test('scratch boxes: carries for +, borrows for −, none for ×', () => {
  expect(scratchColumns(p('+'))).toEqual([1]);
  expect(scratchColumns(p('-'))).toEqual([0, 1]);
  expect(scratchColumns(p('×'))).toEqual([]);
});

test.each([['+', '+'], ['-', '−'], ['×', '×']] as const)('op %s is written as %s', (op, symbol) => {
  const host = document.createElement('div');
  renderColumnProblem(host, { problem: p(op), entry: initialEntry(), ghosts: {}, highlight: null, phase: 'answering' });
  expect(host.querySelector('[data-role="op"]')!.textContent).toBe(symbol);
});
