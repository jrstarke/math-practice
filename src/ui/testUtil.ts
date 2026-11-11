import { vi } from 'vitest';
import { defaultProgress, type Progress } from '../core/progress';
import { mulberry32 } from '../core/rng';
import type { ProgressStore } from '../storage';
import { mountApp, type AppDeps } from './app';

/** 9am on 2026-11-11, local time. */
export const START = new Date(2026, 10, 11, 9).getTime();

export function setup(seed = 1, overrides: Partial<AppDeps> = {}, initial: Progress = defaultProgress()) {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  const root = document.createElement('div');
  document.body.append(root);
  const saved: Progress[] = [];
  let t = 0;
  let wall = START;
  const store: ProgressStore = { load: () => initial, save: p => void saved.push(p) };
  const sound = { unlock: vi.fn(), correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), robo: vi.fn(), setMuted: vi.fn() };
  const app = mountApp({ root, rng: mulberry32(seed), now: () => t, clock: () => wall, store, sound, roboRng: () => 0.1, ...overrides });

  const q = (sel: string) => root.querySelector<HTMLElement>(sel);
  const tap = (sel: string) => q(sel)!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  const current = () => {
    const opText = q('[data-role="op"]')!.textContent!;
    const op: '+' | '-' | '×' | '÷' = opText.includes('+') ? '+' : opText.includes('×') ? '×' : opText.includes('÷') ? '÷' : '-';
    return {
      a: +q('[data-role="top"]')!.textContent!.replace(/\D/g, ''),
      b: +q('[data-role="bottom"]')!.textContent!.replace(/\D/g, ''),
      op,
    };
  };
  const typeAnswer = (n: number) => { for (const d of String(n)) tap(`[data-key="${d}"]`); };
  const correctAnswer = () => {
    const c = current();
    return c.op === '+' ? c.a + c.b : c.op === '-' ? c.a - c.b : c.op === '÷' ? c.a / c.b : c.a * c.b;
  };
  const answerText = () => q('[data-role="answer"]')!.textContent!.replace(/\D/g, '');
  const advance = (ms: number) => { t += ms; wall += ms; vi.advanceTimersByTime(ms); };
  /** Move the wall clock only (time away while the app is hidden). */
  const away = (ms: number) => { wall += ms; };
  const visibility = (state: 'hidden' | 'visible') => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
  };
  const hide = () => visibility('hidden');
  const show = () => visibility('visible');
  return { root, app, saved, sound, q, tap, current, typeAnswer, correctAnswer, answerText, advance, away, hide, show };
}
