// @vitest-environment jsdom
import { defaultProgress } from '../core/progress';
import { setup } from './testUtil';

test('renders a problem and number pad', () => {
  const s = setup();
  expect(s.current().a).toBeGreaterThan(0);
  for (const k of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', 'submit']) expect(s.q(`[data-key="${k}"]`)).not.toBeNull();
});

test('correct answer records once, plays sound, advances after 1s', () => {
  const s = setup();
  const first = s.current();
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(1);
  expect(s.sound.correct.mock.calls.length + s.sound.levelUp.mock.calls.length).toBe(1);
  expect(s.q('[data-role="answer"]')!.classList.contains('correct')).toBe(true);
  expect(s.q('[data-role="streak"]')!.textContent).toContain('1');
  s.advance(1000);
  expect(s.current()).not.toEqual(first);
  expect(s.answerText()).toBe('');
});

test('total badge shows the saved total and goes up on a clean answer', () => {
  const s = setup(1, {}, { ...defaultProgress(), total: 41, streak: 3 });
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 41');
  expect(s.q('[data-role="streak"]')!.textContent).toBe('🔥 3');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 42');
  expect(s.saved[0].total).toBe(42);
});

test('a wrong first try resets the streak but keeps the total', () => {
  const s = setup(1, {}, { ...defaultProgress(), total: 41, streak: 3 });
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.q('[data-role="total"]')!.textContent).toBe('⭐ 41');
  expect(s.q('[data-role="streak"]')!.textContent).toBe('🔥 0');
});

test('double-tapping submit on a correct answer records only once', () => {
  const s = setup();
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  s.tap('[data-key="submit"]');
  s.tap('[data-key="5"]');
  expect(s.saved).toHaveLength(1);
  s.advance(1000);
  expect(s.answerText()).toBe('');
});

test('wrong answer fades, shows message, does not record', () => {
  const s = setup();
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(0);
  expect(s.sound.wrong).toHaveBeenCalledOnce();
  expect(s.q('[data-role="answer"]')!.classList.contains('faded')).toBe(true);
  expect(s.q('[data-role="message"]')!.textContent).toBe('Not quite — try again');
});

test('then correct after wrong resets streak to 0', () => {
  const s = setup();
  s.typeAnswer(s.correctAnswer() + 1);
  s.tap('[data-key="submit"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved).toHaveLength(1);
  expect(s.saved[0].streak).toBe(0);
});

test('slow-but-correct timing is measured from display to first submit', () => {
  const s = setup();
  s.advance(60_000);
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved[0].streak).toBe(1); // slow answers still count for the streak
});

test('hardware keyboard works', () => {
  const s = setup();
  for (const d of String(s.correctAnswer())) window.dispatchEvent(new KeyboardEvent('keydown', { key: d }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(s.saved).toHaveLength(1);
});

test('tapping a scratch box routes digits there, not to the answer', () => {
  const s = setup(7, {}, { ...defaultProgress(), addition: { level: 4, window: [], calibrationLeft: 10 } });
  const box = s.q('[data-scratch]');
  expect(box).not.toBeNull(); // calibration always picks the current level; level 4 problems have boxes
  box!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  s.tap('[data-key="1"]');
  expect(s.q('[data-scratch]')!.textContent).toBe('1');
  expect(s.q('[data-scratch]')!.classList.contains('focused')).toBe(true);
  expect(s.answerText()).toBe('');
  s.tap('[data-role="answer"]');
  s.tap('[data-key="2"]');
  expect(s.answerText()).toBe('2');
});

test('first pointerdown unlocks sound', () => {
  const s = setup();
  s.tap('[data-key="3"]');
  expect(s.sound.unlock).toHaveBeenCalled();
});

test('destroy removes keyboard listener', () => {
  const s = setup();
  s.app.destroy();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(s.saved).toHaveLength(0);
});

test('mute toggle saves and updates icon', () => {
  const s = setup();
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(false);
  expect(s.q('[data-action="mute"]')!.textContent).toBe('🔊');
  s.tap('[data-action="mute"]');
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(true);
  expect(s.saved.at(-1)!.muted).toBe(true);
  expect(s.q('[data-action="mute"]')!.textContent).toBe('🔇');
  s.tap('[data-action="mute"]');
  expect(s.sound.setMuted).toHaveBeenLastCalledWith(false);
});

test('install tip shows on iOS Safari and dismiss saves installTipShown', () => {
  const s = setup(1, { nav: { standalone: false } });
  expect(s.q('[data-role="install-tip"]')!.textContent).toContain('Add to Home Screen');
  s.tap('[data-action="dismiss-tip"]');
  expect(s.q('[data-role="install-tip"]')).toBeNull();
  expect(s.saved.at(-1)!.installTipShown).toBe(true);
});

test('install tip hidden when not iOS Safari', () => {
  const s = setup(1, { nav: {} });
  expect(s.q('[data-role="install-tip"]')).toBeNull();
});

test('sound unlock is retried on every pointerup and keydown (iOS gesture rules)', () => {
  const s = setup();
  s.q('[data-key="3"]')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
  s.q('[data-key="3"]')!.dispatchEvent(new Event('pointerup', { bubbles: true }));
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));
  expect(s.sound.unlock).toHaveBeenCalledTimes(3);
});
