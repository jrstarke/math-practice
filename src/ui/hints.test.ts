// @vitest-environment jsdom
import { defaultProgress } from '../core/progress';
import { ACTION_GUARD_MS } from './app';
import { setup } from './testUtil';

const bubble = (s: ReturnType<typeof setup>) => s.q('[data-role="bubble"]')!.textContent;
const ghostNumber = (s: ReturnType<typeof setup>) =>
  +[...s.root.querySelectorAll<HTMLElement>('[data-ghost]')]
    .sort((x, y) => +y.dataset.ghost! - +x.dataset.ghost!)
    .map(g => g.textContent).join('');

test('each hint tap reveals one step and the button disables at the end', () => {
  const s = setup();
  s.tap('[data-action="hint"]');
  const first = bubble(s);
  expect(first).toBeTruthy();
  expect(s.root.querySelector('.highlight')).not.toBeNull();
  s.tap('[data-action="hint"]');
  expect(bubble(s)).not.toBe(first);
  for (let i = 0; i < 20; i++) s.tap('[data-action="hint"]');
  const btn = s.q('[data-action="hint"]') as HTMLButtonElement;
  expect(btn.disabled).toBe(true);
  expect(btn.textContent).toContain("That's every hint!");
  expect(ghostNumber(s)).toBe(s.correctAnswer());
});

test('hint scratch values appear in the scratch boxes', () => {
  // Level 6 always carries (addition) or borrows (subtraction), so hints fill a scratch box.
  const level6 = { level: 6, window: [], calibrationLeft: 10 };
  const s = setup(1, {}, { ...defaultProgress(), addition: level6, subtraction: level6 });
  for (let i = 0; i < 20; i++) s.tap('[data-action="hint"]');
  const filled = [...s.root.querySelectorAll('[data-scratch]')].filter(b => b.textContent !== '');
  expect(filled.length).toBeGreaterThan(0);
});

test('answer after hints breaks the streak', () => {
  const s = setup();
  s.tap('[data-action="hint"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  expect(s.saved[0].streak).toBe(0);
});

test('hints reset on the next problem', () => {
  const s = setup();
  s.tap('[data-action="hint"]');
  s.typeAnswer(s.correctAnswer());
  s.tap('[data-key="submit"]');
  s.advance(1000);
  expect(bubble(s)).toBe('');
  expect(s.root.querySelectorAll('[data-ghost]')).toHaveLength(0);
  expect((s.q('[data-action="hint"]') as HTMLButtonElement).disabled).toBe(false);
});

test('pass records once, auto-plays to full ghost answer, then Next advances', () => {
  const s = setup();
  const ans = s.correctAnswer();
  const first = s.current();
  s.tap('[data-action="pass"]');
  expect(s.saved).toHaveLength(1);
  expect(s.saved[0].streak).toBe(0);
  expect(s.q('[data-action="next"]')).toBeNull();
  s.advance(1500 * 20);
  expect(ghostNumber(s)).toBe(ans);
  s.tap('[data-action="next"]');
  expect(s.current()).not.toEqual(first);
  expect(s.q('[data-action="next"]')).toBeNull();
});

test('keys and hint are ignored during and after pass', () => {
  const s = setup();
  s.tap('[data-action="pass"]');
  s.tap('[data-key="3"]');
  s.tap('[data-key="submit"]');
  s.tap('[data-action="pass"]');
  s.tap('[data-action="hint"]');
  expect(s.answerText()).toBe('');
  expect(s.saved).toHaveLength(1);
  s.advance(1500 * 20);
  s.tap('[data-key="3"]');
  expect(s.answerText()).toBe('');
  expect(s.saved).toHaveLength(1);
});

test('tapping the bubble during pass skips ahead', () => {
  const s = setup();
  s.tap('[data-action="pass"]');
  const before = bubble(s);
  s.tap('[data-role="bubble"]');
  expect(bubble(s)).not.toBe(before);
});

test('pass continues from hints already shown', () => {
  const s = setup();
  s.tap('[data-action="hint"]');
  s.tap('[data-action="hint"]');
  const shown = bubble(s);
  s.tap('[data-action="pass"]');
  expect(bubble(s)).not.toBe(shown); // first pass step is the 3rd step
});

test('a fast second tap after Next does not hit Hint/Pass on the new problem', () => {
  const s = setup();
  s.tap('[data-action="pass"]');
  s.advance(1500 * 20);
  s.tap('[data-action="next"]');
  s.tap('[data-action="pass"]');
  s.tap('[data-action="hint"]');
  expect(s.saved).toHaveLength(1);
  expect(bubble(s)).toBe('');
  s.advance(ACTION_GUARD_MS);
  s.tap('[data-action="pass"]');
  expect(s.saved).toHaveLength(2);
});
