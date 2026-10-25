import { maxAnswerLength } from '../core/levels';
import { el } from './dom';
import type { ProblemViewModel } from './problemView';

/**
 * Re-render the horizontal equation (multiplication): a plain "a × b =" line,
 * then an answer row built with the same cell-grid pattern the column view
 * uses (a leading blank `op` cell plus `cols` digit cells, where `cols` is
 * `maxAnswerLength(p)` rather than the operands' own digit count) so the
 * ghost overlay, `shake(...)`, and the faded/correct/focused classes all
 * apply exactly as they do there. No scratch row and no rule line: the
 * factors need no column alignment, and the equation's own "=" replaces it.
 */
export function renderHorizontalProblem(container: HTMLElement, vm: ProblemViewModel): void {
  const { problem: p, entry, ghosts, highlight, phase } = vm;
  const cols = maxAnswerLength(p);

  // One row = a leading blank op cell (kept only so the existing answer-row/
  // ghost-row CSS applies unchanged) + `cols` digit cells, highest column on the left.
  const row = (attrs: Record<string, string>, cell: (c: number) => HTMLElement) => {
    const r = el('div', { ...attrs, class: `row ${attrs.class ?? ''}`.trim() }, el('span', { class: 'cell op' }));
    for (let c = cols - 1; c >= 0; c--) {
      const node = cell(c);
      node.classList.add('cell');
      node.dataset.col = String(c);
      if (highlight === c) node.classList.add('highlight');
      r.append(node);
    }
    return r;
  };

  const ghostRow = row({ 'data-role': 'ghosts', class: 'ghost-row' },
    c => (c in ghosts ? el('span', { class: 'ghost', 'data-ghost': c }, String(ghosts[c])) : el('span')));

  const typed = entry.answer;
  const answerClasses = ['answer-row'];
  if (entry.faded) answerClasses.push('faded');
  if (phase === 'correct') answerClasses.push('correct');
  if (entry.focus.kind === 'answer' && phase === 'answering') answerClasses.push('focused');
  const answer = row({ 'data-role': 'answer', class: answerClasses.join(' ') },
    c => el('span', {}, c < typed.length ? typed[typed.length - 1 - c] : ''));

  const equation = el('div', { class: 'equation' },
    el('span', { 'data-role': 'top' }, String(p.a)),
    el('span', { 'data-role': 'op', class: 'op' }, '×'),
    el('span', { 'data-role': 'bottom' }, String(p.b)),
    el('span', { class: 'eq' }, '='));

  container.replaceChildren(
    el('div', { class: 'problem horizontal', style: `--cols: ${cols + 1}` },
      equation,
      el('div', { class: 'answer-wrap' }, ghostRow, answer)),
  );
}
