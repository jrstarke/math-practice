import { answerOf } from '../core/arith';
import { focusAnswer, focusScratch, initialEntry, markWrong, pressKey, type EntryState, type Key } from '../core/entry';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { nextProblem, recordResult, RECENT_LIMIT, type AttemptInput } from '../core/session';
import type { Problem } from '../core/types';
import type { ProgressStore } from '../storage';
import { el } from './dom';
import { shake } from './feedback';
import { createNumberPad, keyFromKeyboard } from './numberPad';
import { renderProblem, type Phase } from './problemView';
import type { SoundPlayer } from './sound';

export interface AppDeps {
  root: HTMLElement;
  rng: Rng;
  now: () => number;
  store: ProgressStore;
  sound: SoundPlayer;
}

export const ADVANCE_MS = 1000;
const TRY_AGAIN = 'Not quite — try again';

interface Attempt extends AttemptInput { firstSubmitMs: number }

export function mountApp(deps: AppDeps): { destroy(): void } {
  const { root, rng, now, store, sound } = deps;

  let progress: Progress = store.load();
  const recent: Problem[] = [];
  let problem!: Problem;
  let entry: EntryState;
  let attempt: Attempt;
  let firstSubmitted: boolean;
  let shownAt: number;
  let phase: Phase;
  let message = '';
  const timers = new Set<ReturnType<typeof setTimeout>>();

  // Static shell
  const streakEl = el('span', { class: 'streak', 'data-role': 'streak' });
  const problemArea = el('div', { class: 'problem-area', 'data-role': 'problem-area' });
  const messageEl = el('div', { class: 'message', 'data-role': 'message', 'aria-live': 'polite' });
  root.replaceChildren(
    el('div', { class: 'app' },
      el('header', { class: 'topbar' }, streakEl),
      el('main', { class: 'play' },
        el('section', { class: 'stage' }, problemArea, messageEl),
        el('section', { class: 'controls' }, createNumberPad()))));

  function later(fn: () => void, ms: number) {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }

  function render() {
    renderProblem(problemArea, { problem, entry, ghosts: {}, highlight: null, phase });
    streakEl.textContent = `🔥 ${progress.streak}`;
    messageEl.textContent = message;
  }

  function showNext() {
    problem = nextProblem(progress, recent, rng);
    entry = initialEntry();
    attempt = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 0 };
    firstSubmitted = false;
    shownAt = now();
    phase = 'answering';
    message = '';
    render();
  }

  function finish(a: Attempt) {
    const result = recordResult(progress, problem, a);
    progress = result.progress;
    store.save(progress);
    recent.push(problem);
    if (recent.length > RECENT_LIMIT) recent.shift();
    return result.levelChange;
  }

  function submit() {
    if (!firstSubmitted) {
      attempt.firstSubmitMs = now() - shownAt;
      firstSubmitted = true;
    }
    if (Number(entry.answer) === answerOf(problem)) {
      const change = finish(attempt);
      if (change === 1) sound.levelUp(); else sound.correct();
      phase = 'correct';
      message = '';
      render();
      later(showNext, ADVANCE_MS);
    } else {
      attempt.wrongSubmits++;
      entry = markWrong(entry);
      message = TRY_AGAIN;
      sound.wrong();
      render();
      shake(problemArea.querySelector<HTMLElement>('[data-role="answer"]')!);
    }
  }

  function handleKey(key: Key) {
    if (phase !== 'answering') return;
    const r = pressKey(entry, key);
    entry = r.state;
    if (key !== 'submit' && message === TRY_AGAIN && !entry.faded) message = '';
    if (r.submit) submit(); else render();
  }

  let unlocked = false;
  function onPointerDown(e: Event) {
    if (!unlocked) { unlocked = true; sound.unlock(); }
    const target = e.target as HTMLElement;
    const keyEl = target.closest<HTMLElement>('[data-key]');
    if (keyEl) { e.preventDefault(); handleKey(keyEl.dataset.key as Key); return; }
    if (phase !== 'answering') return;
    const box = target.closest<HTMLElement>('[data-scratch]');
    if (box) { entry = focusScratch(entry, Number(box.dataset.scratch)); render(); return; }
    if (target.closest('[data-role="answer"]')) { entry = focusAnswer(entry); render(); }
  }

  function onKeyDown(e: KeyboardEvent) {
    const key = keyFromKeyboard(e);
    if (!key) return;
    e.preventDefault();
    handleKey(key);
  }

  root.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);
  showNext();

  return {
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
