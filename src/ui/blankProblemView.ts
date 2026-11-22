import { answerOf, resultOf } from '../core/arith';
import { el } from './dom';
import type { ProblemViewModel } from './problemView';

/**
 * Re-render a blank-shape problem: the whole sum on one line, with the blank as the answer boxes in place
 * (`6 + [ ] = 10`, `[ ] + 5 = 12`, `12 = 5 + [ ]`, `8 + 3 = [ ] + 5`). The boxes are the same `.cell`s, `data-role="answer"`
 * row and faded/correct/focused classes the other views use, so typing, shake and the ghost overlay work unchanged.
 * The box count is the digit count of the number she types (answerOf), and digits fill from the right.
 */
export function renderBlankProblem(container: HTMLElement, vm: ProblemViewModel): void {
  const { problem: p, entry, ghosts, highlight, phase } = vm;
  const shape = p.shape ?? 'missing-b';
  const cols = Math.max(1, String(answerOf(p)).length);
  const sign = p.op === '-' ? '−' : '+';

  // A row of `cols` cells, highest column on the left (the ones digit is column 0).
  const boxRow = (attrs: Record<string, string>, cell: (c: number) => HTMLElement) => {
    const r = el('div', { ...attrs, class: `blank-boxes ${attrs.class ?? ''}`.trim(), style: `--cols: ${cols}` });
    for (let c = cols - 1; c >= 0; c--) {
      const node = cell(c);
      node.classList.add('cell');
      node.dataset.col = String(c);
      if (highlight === c) node.classList.add('highlight');
      r.append(node);
    }
    return r;
  };

  const ghostRow = boxRow({ 'data-role': 'ghosts', class: 'ghost-row' },
    c => (c in ghosts ? el('span', { class: 'ghost', 'data-ghost': c }, String(ghosts[c])) : el('span')));

  const typed = entry.answer;
  const answerClasses = ['answer-row'];
  if (entry.faded) answerClasses.push('faded');
  if (phase === 'correct') answerClasses.push('correct');
  if (entry.focus.kind === 'answer' && phase === 'answering') answerClasses.push('focused');
  const answer = boxRow({ 'data-role': 'answer', class: answerClasses.join(' ') },
    c => el('span', {}, c < typed.length ? typed[typed.length - 1 - c] : ''));

  const blank = el('div', { class: 'answer-wrap blank-wrap' }, ghostRow, answer);
  const num = (n: number) => el('span', { class: 'term' }, String(n));
  const op = () => el('span', { class: 'op', 'data-role': 'op' }, sign);
  const eq = () => el('span', { class: 'eq' }, '=');
  const r = resultOf(p);

  let parts: HTMLElement[];
  let chars: number; // digits and boxes on the line, for sizing
  switch (shape) {
    case 'missing-a':
      parts = [blank, op(), num(p.b), eq(), num(r)];
      chars = cols + String(p.b).length + String(r).length;
      break;
    case 'flipped':
      parts = [num(r), eq(), num(p.a), op(), blank];
      chars = cols + String(p.a).length + String(r).length;
      break;
    case 'balance': {
      const c = p.c ?? 0;
      parts = [num(p.a), op(), num(p.b), eq(), blank, el('span', { class: 'op' }, '+'), num(c)];
      chars = cols + String(p.a).length + String(p.b).length + String(c).length;
      break;
    }
    default: // missing-b
      parts = [num(p.a), op(), blank, eq(), num(r)];
      chars = cols + String(p.a).length + String(r).length;
  }
  // Roughly how many "em" of width the line needs: a digit or box about 0.85em, the signs 3 of them at ~1.5em with gaps.
  const units = (chars * 0.85 + (shape === 'balance' ? 3 : 2) * 1.5).toFixed(2);

  const attrs: Record<string, string> = {
    class: 'problem blank-problem', style: `--units: ${units}`,
    'data-shape': shape, 'data-a': String(p.a), 'data-b': String(p.b),
  };
  if (p.c !== undefined) attrs['data-c'] = String(p.c);
  container.replaceChildren(el('div', attrs, el('div', { class: 'blank-line' }, ...parts)));
}
