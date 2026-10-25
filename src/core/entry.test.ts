import { focusAnswer, focusScratch, initialEntry, markWrong, pressKey, setScratch, type Key } from './entry';

const press = (keys: Key[], s = initialEntry()) =>
  keys.reduce((acc, k) => pressKey(acc.state, k), { state: s, submit: false });

test('types left to right, max 4', () => expect(press(['2', '7', '1', '0', '9']).state.answer).toBe('2710'));

test('zero alone submits; leading zero is replaced', () => {
  const z = press(['0', 'submit']);
  expect(z.submit).toBe(true);
  expect(z.state.answer).toBe('0');
  expect(press(['0', '7']).state.answer).toBe('7');
});

test('empty submit does nothing', () => expect(press(['submit']).submit).toBe(false));

test('backspace', () => {
  expect(press(['8', '5', 'back']).state.answer).toBe('8');
  expect(press(['back']).state.answer).toBe('');
});

test('faded wrong answer: next digit replaces, back clears, resubmit ignored', () => {
  const w = markWrong(press(['8', '4']).state);
  expect(w.faded).toBe(true);
  expect(pressKey(w, 'submit').submit).toBe(false);
  expect(pressKey(w, '5').state).toMatchObject({ answer: '5', faded: false });
  expect(pressKey(w, 'back').state).toMatchObject({ answer: '', faded: false });
});

test('scratch focus: digits go to box, max 2, submit returns focus', () => {
  const s = focusScratch(initialEntry(), 1);
  const r = press(['1', '3', '5', 'submit'], s);
  expect(r.state.scratch).toEqual({ 1: '13' });
  expect(r.state.answer).toBe('');
  expect(r.submit).toBe(false);
  expect(r.state.focus).toEqual({ kind: 'answer' });
});

test('scratch backspace and focusAnswer', () => {
  const s = press(['1', '2', 'back'], focusScratch(initialEntry(), 0)).state;
  expect(s.scratch).toEqual({ 0: '1' });
  expect(focusAnswer(s).focus).toEqual({ kind: 'answer' });
});

test('setScratch overwrites given columns only', () =>
  expect(setScratch({ ...initialEntry(), scratch: { 1: '4', 2: '7' } }, { 1: '5', 0: '12' }).scratch)
    .toEqual({ 0: '12', 1: '5', 2: '7' }));

test('maxLen caps the answer; back and submit are unaffected by it', () => {
  let s = initialEntry();
  s = pressKey(s, '9', 2).state;
  s = pressKey(s, '9', 2).state;
  s = pressKey(s, '9', 2).state; // third digit ignored: capped at maxLen
  expect(s.answer).toBe('99');
  expect(pressKey(s, 'back', 2).state.answer).toBe('9');
  expect(pressKey(s, 'submit', 2).submit).toBe(true);
});
