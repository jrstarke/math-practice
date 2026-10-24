import { answerOf } from '../core/arith';
import { focusAnswer, focusScratch, initialEntry, markWrong, pressKey, setScratch, type EntryState, type Key } from '../core/entry';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { nextProblem, recordResult, RECENT_LIMIT, type AttemptInput } from '../core/session';
import { revealState, solve, type RevealState, type Step } from '../core/solver';
import type { Problem } from '../core/types';
import type { ProgressStore } from '../storage';
import { el } from './dom';
import { shake } from './feedback';
import { createHintBubble } from './hintBubble';
import { createInstallTip, shouldShowInstallTip } from './installTip';
import { createNumberPad, keyFromKeyboard } from './numberPad';
import { renderProblem, type Phase } from './problemView';
import type { SoundPlayer } from './sound';

export interface AppDeps {
  root: HTMLElement;
  rng: Rng;
  now: () => number;
  store: ProgressStore;
  sound: SoundPlayer;
  /** iOS exposes navigator.standalone; injectable for tests. */
  nav?: { standalone?: boolean };
}

export const ADVANCE_MS = 1000;
export const PASS_STEP_MS = 1500;
const TRY_AGAIN = 'Not quite — try again';

interface Attempt extends AttemptInput { firstSubmitMs: number }

export function mountApp(deps: AppDeps): { destroy(): void } {
  const { root, rng, now, store, sound } = deps;
  const nav = deps.nav ?? (navigator as { standalone?: boolean });

  let progress: Progress = store.load();
  const recent: Problem[] = [];
  let problem!: Problem;
  let entry: EntryState;
  let attempt: Attempt;
  let firstSubmitted: boolean;
  let shownAt: number;
  let phase: Phase;
  let message = '';
  let steps: Step[] = [];
  let hintsShown = 0;
  let reveal: RevealState = revealState([], 0);
  let passTimer: ReturnType<typeof setTimeout> | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  // Static shell
  const streakEl = el('span', { class: 'streak', 'data-role': 'streak' });
  const muteBtn = el('button', { type: 'button', class: 'icon-button', 'data-action': 'mute', 'aria-label': 'Sound on or off' });
  const problemArea = el('div', { class: 'problem-area', 'data-role': 'problem-area' });
  const messageEl = el('div', { class: 'message', 'data-role': 'message', 'aria-live': 'polite' });
  const bubble = createHintBubble();
  const hintBtn = el('button', { type: 'button', class: 'action hint', 'data-action': 'hint' });
  const passBtn = el('button', { type: 'button', class: 'action pass', 'data-action': 'pass' }, 'Pass');
  const actions = el('div', { class: 'actions' });
  const appEl = el('div', { class: 'app' },
      el('header', { class: 'topbar' }, streakEl, muteBtn),
      el('main', { class: 'play' },
        el('section', { class: 'stage' }, bubble.el, problemArea, messageEl),
        el('section', { class: 'controls' }, actions, createNumberPad())));
  root.replaceChildren(appEl);
  if (shouldShowInstallTip(nav, progress)) appEl.prepend(createInstallTip());

  function later(fn: () => void, ms: number) {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }

  function render() {
    renderProblem(problemArea, { problem, entry, ghosts: reveal.ghosts, highlight: reveal.column, phase });
    streakEl.textContent = `🔥 ${progress.streak}`;
    messageEl.textContent = message;
    muteBtn.textContent = progress.muted ? '🔇' : '🔊';
    bubble.set(reveal.text);
    const allShown = hintsShown >= steps.length;
    hintBtn.disabled = allShown;
    hintBtn.textContent = allShown ? "💡 That's every hint!" : '💡 Hint';
    if (phase === 'passed') {
      actions.replaceChildren(el('button', { type: 'button', class: 'action next', 'data-action': 'next' }, 'Next →'));
    } else {
      actions.replaceChildren(hintBtn, passBtn);
    }
  }

  function showNext() {
    problem = nextProblem(progress, recent, rng);
    entry = initialEntry();
    attempt = { wrongSubmits: 0, hintsUsed: 0, passed: false, firstSubmitMs: 0 };
    firstSubmitted = false;
    steps = solve(problem);
    hintsShown = 0;
    reveal = revealState(steps, 0);
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

  function showSteps(count: number) {
    hintsShown = Math.min(count, steps.length);
    reveal = revealState(steps, hintsShown);
    entry = setScratch(entry, reveal.scratch);
  }

  function hint() {
    if (phase !== 'answering' || hintsShown >= steps.length) return;
    showSteps(hintsShown + 1);
    attempt.hintsUsed = hintsShown;
    render();
  }

  function passStep() {
    if (passTimer) { clearTimeout(passTimer); timers.delete(passTimer); passTimer = null; }
    if (hintsShown < steps.length) showSteps(hintsShown + 1);
    if (hintsShown >= steps.length) {
      phase = 'passed';
    } else {
      passTimer = setTimeout(() => { if (passTimer) timers.delete(passTimer); passTimer = null; passStep(); }, PASS_STEP_MS);
      timers.add(passTimer);
    }
    render();
  }

  function pass() {
    if (phase !== 'answering') return;
    finish({ ...attempt, passed: true });
    phase = 'passing';
    message = '';
    entry = focusAnswer({ ...entry, answer: '', faded: false });
    passStep();
  }

  function dismissTip() {
    root.querySelector('[data-role="install-tip"]')?.remove();
    progress = { ...progress, installTipShown: true };
    store.save(progress);
  }

  function toggleMute() {
    progress = { ...progress, muted: !progress.muted };
    store.save(progress);
    sound.setMuted(progress.muted);
    render();
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
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'mute') { toggleMute(); return; }
    if (action === 'dismiss-tip') { dismissTip(); return; }
    if (action === 'hint') { hint(); return; }
    if (action === 'pass') { pass(); return; }
    if (action === 'next') { if (phase === 'passed') showNext(); return; }
    if (phase === 'passing') {
      if (target.closest('[data-role="bubble"], [data-role="problem-area"]')) passStep();
      return;
    }
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
  sound.setMuted(progress.muted);
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
