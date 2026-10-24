// @vitest-environment jsdom
import { createHintBubble, LONG_HINT } from './hintBubble';

test('long hint text gets the compact "long" style; short text and empty do not', () => {
  const b = createHintBubble();
  b.set('13 − 8 = ?');
  expect(b.el.classList.contains('long')).toBe(false);
  b.set('x'.repeat(LONG_HINT + 1));
  expect(b.el.classList.contains('long')).toBe(true);
  b.set('');
  expect(b.el.classList.contains('long')).toBe(false);
  expect(b.el.classList.contains('empty')).toBe(true);
});
