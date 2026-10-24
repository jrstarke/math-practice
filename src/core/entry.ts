export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type Key = Digit | 'back' | 'submit';
export type Focus = { kind: 'answer' } | { kind: 'scratch'; column: number };

export interface EntryState {
  answer: string;
  faded: boolean;          // last submitted answer was wrong; next key clears it
  focus: Focus;
  scratch: Record<number, string>;
}

export const MAX_ANSWER = 4;
export const MAX_SCRATCH = 2;

export function initialEntry(): EntryState {
  return { answer: '', faded: false, focus: { kind: 'answer' }, scratch: {} };
}

function pressScratch(s: EntryState, column: number, key: Key): { state: EntryState; submit: boolean } {
  if (key === 'submit') return { state: focusAnswer(s), submit: false };
  const current = s.scratch[column] ?? '';
  const next = key === 'back' ? current.slice(0, -1) : current.length < MAX_SCRATCH ? current + key : current;
  return { state: { ...s, scratch: { ...s.scratch, [column]: next } }, submit: false };
}

/** Apply one key press. `submit` is true when the answer should be checked. */
export function pressKey(s: EntryState, key: Key): { state: EntryState; submit: boolean } {
  if (s.focus.kind === 'scratch') return pressScratch(s, s.focus.column, key);

  if (key === 'submit') return { state: s, submit: s.answer !== '' && !s.faded };
  if (s.faded) {
    return { state: { ...s, faded: false, answer: key === 'back' ? '' : key }, submit: false };
  }
  if (key === 'back') return { state: { ...s, answer: s.answer.slice(0, -1) }, submit: false };
  if (s.answer === '0') return { state: { ...s, answer: key }, submit: false };
  if (s.answer.length >= MAX_ANSWER) return { state: s, submit: false };
  return { state: { ...s, answer: s.answer + key }, submit: false };
}

export function focusScratch(s: EntryState, column: number): EntryState {
  return { ...s, focus: { kind: 'scratch', column } };
}

export function focusAnswer(s: EntryState): EntryState {
  return { ...s, focus: { kind: 'answer' } };
}

export function markWrong(s: EntryState): EntryState {
  return { ...s, faded: true };
}

/** Merge hint-provided scratch values, overwriting those columns. */
export function setScratch(s: EntryState, values: Record<number, string>): EntryState {
  return { ...s, scratch: { ...s.scratch, ...values } };
}
