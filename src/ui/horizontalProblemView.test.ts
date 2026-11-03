// @vitest-environment jsdom
import { initialEntry } from '../core/entry';
import type { Problem } from '../core/types';
import { renderHorizontalProblem } from './horizontalProblemView';

test('renders a horizontal equation with an answer row capped at maxAnswerLength', () => {
  const problem: Problem = { op: '×', a: 24, b: 3, level: 7 };
  const container = document.createElement('div');
  renderHorizontalProblem(container, {
    problem,
    entry: { ...initialEntry(), answer: '7' },
    ghosts: {},
    highlight: null,
    phase: 'answering',
  });

  expect(container.querySelector('[data-role="top"]')!.textContent).toBe('24');
  expect(container.querySelector('[data-role="op"]')!.textContent).toBe('×');
  expect(container.querySelector('[data-role="bottom"]')!.textContent).toBe('3');
  // level 7 caps the answer at 3 digits, regardless of the typed/ghosted value being shorter.
  expect(container.querySelectorAll('[data-role="answer"] [data-col]').length).toBe(3);
});

test('division uses the same horizontal layout with a ÷ sign', () => {
  const container = document.createElement('div');
  renderHorizontalProblem(container, {
    problem: { op: '÷', a: 72, b: 3, level: 7 },
    entry: initialEntry(), ghosts: {}, highlight: null, phase: 'answering',
  });
  expect(container.querySelector('[data-role="top"]')!.textContent).toBe('72');
  expect(container.querySelector('[data-role="op"]')!.textContent).toBe('÷');
  expect(container.querySelector('[data-role="bottom"]')!.textContent).toBe('3');
  expect(container.querySelectorAll('[data-role="answer"] [data-col]').length).toBe(2);
});
