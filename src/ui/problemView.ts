import { digitsOf } from '../core/arith';
import type { EntryState } from '../core/entry';
import type { Op, Problem } from '../core/types';
import { el } from './dom';

export type Phase = 'answering' | 'correct' | 'passing' | 'passed';

export interface ProblemViewModel {
  problem: Problem;
  entry: EntryState;
  ghosts: Record<number, number>;
  highlight: number | null;
  phase: Phase;
}

/** How each operation is written in the operator cell. */
const OP_SYMBOL: Record<Op, string> = { '+': '+', '-': '−', '×': '×' };

/** Whether column c of the top operand gets a scratch box (spec §7). */
function hasScratchBox(p: Problem, c: number): boolean {
  switch (p.op) {
    case '-': return c < digitsOf(p.a).length; // borrows
    case '+': return c >= 1;                   // carries
    case '×': return false;                    // multiplication uses the horizontal layout, no scratch boxes
  }
}

/** Columns of the top operand that get a scratch box (spec §7). */
export function scratchColumns(p: Problem): number[] {
  const operandCols = Math.max(digitsOf(p.a).length, digitsOf(p.b).length);
  const cols = [];
  for (let c = 0; c < operandCols; c++) {
    if (hasScratchBox(p, c)) cols.push(c);
  }
  return cols;
}

/** Re-render the vertical problem: scratch boxes, operands, rule, ghosts, and answer. */
export function renderColumnProblem(container: HTMLElement, vm: ProblemViewModel): void {
  const { problem: p, entry, ghosts, highlight, phase } = vm;
  const aDigits = digitsOf(p.a), bDigits = digitsOf(p.b);
  const cols = Math.max(aDigits.length + 1, bDigits.length + 1, entry.answer.length);
  const boxes = new Set(scratchColumns(p));

  // One row = operator cell + `cols` digit cells, highest column on the left.
  const row = (attrs: Record<string, string>, cell: (c: number) => HTMLElement, opCell: HTMLElement = el('span', { class: 'cell op' })) => {
    const r = el('div', { ...attrs, class: `row ${attrs.class ?? ''}`.trim() }, opCell);
    for (let c = cols - 1; c >= 0; c--) {
      const node = cell(c);
      node.classList.add('cell');
      node.dataset.col = String(c);
      if (highlight === c) node.classList.add('highlight');
      r.append(node);
    }
    return r;
  };

  const scratchRow = row({ class: 'scratch-row' }, c => {
    if (!boxes.has(c)) return el('span');
    const focused = entry.focus.kind === 'scratch' && entry.focus.column === c;
    return el('span', { class: `scratch${focused ? ' focused' : ''}`, 'data-scratch': c }, entry.scratch[c] ?? '');
  });

  const top = row({ 'data-role': 'top' }, c => {
    const struck = p.op === '-' && (entry.scratch[c] ?? '') !== '';
    return el('span', { class: struck ? 'struck' : undefined }, c < aDigits.length ? String(aDigits[c]) : '');
  });

  const bottom = row({ 'data-role': 'bottom' },
    c => el('span', {}, c < bDigits.length ? String(bDigits[c]) : ''),
    el('span', { class: 'cell op', 'data-role': 'op' }, OP_SYMBOL[p.op]));

  const ghostRow = row({ 'data-role': 'ghosts', class: 'ghost-row' },
    c => (c in ghosts ? el('span', { class: 'ghost', 'data-ghost': c }, String(ghosts[c])) : el('span')));

  const typed = entry.answer;
  const answerClasses = ['answer-row'];
  if (entry.faded) answerClasses.push('faded');
  if (phase === 'correct') answerClasses.push('correct');
  if (entry.focus.kind === 'answer' && phase === 'answering') answerClasses.push('focused');
  const answer = row({ 'data-role': 'answer', class: answerClasses.join(' ') },
    c => el('span', {}, c < typed.length ? typed[typed.length - 1 - c] : ''));

  container.replaceChildren(
    el('div', { class: 'problem', style: `--cols: ${cols + 1}` },
      scratchRow, top, bottom, el('div', { class: 'rule' }),
      el('div', { class: 'answer-wrap' }, ghostRow, answer)),
  );
}
