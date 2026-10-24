import { vi } from 'vitest';
import { defaultProgress, type Progress } from '../core/progress';
import { mulberry32 } from '../core/rng';
import type { ProgressStore } from '../storage';
import { mountApp, type AppDeps } from './app';

export function setup(seed = 1, overrides: Partial<AppDeps> = {}, initial: Progress = defaultProgress()) {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  const root = document.createElement('div');
  document.body.append(root);
  const saved: Progress[] = [];
  let t = 0;
  const store: ProgressStore = { load: () => initial, save: p => void saved.push(p) };
  const sound = { unlock: vi.fn(), correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), setMuted: vi.fn() };
  const app = mountApp({ root, rng: mulberry32(seed), now: () => t, store, sound, ...overrides });

  const q = (sel: string) => root.querySelector<HTMLElement>(sel);
  const tap = (sel: string) => q(sel)!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  const current = () => ({
    a: +q('[data-role="top"]')!.textContent!.replace(/\D/g, ''),
    b: +q('[data-role="bottom"]')!.textContent!.replace(/\D/g, ''),
    op: q('[data-role="op"]')!.textContent!.includes('+') ? '+' : '-',
  });
  const typeAnswer = (n: number) => { for (const d of String(n)) tap(`[data-key="${d}"]`); };
  const correctAnswer = () => { const c = current(); return c.op === '+' ? c.a + c.b : c.a - c.b; };
  const answerText = () => q('[data-role="answer"]')!.textContent!.replace(/\D/g, '');
  const advance = (ms: number) => { t += ms; vi.advanceTimersByTime(ms); };
  return { root, app, saved, sound, q, tap, current, typeAnswer, correctAnswer, answerText, advance };
}
