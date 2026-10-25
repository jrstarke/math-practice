import { answerOf } from '../core/arith';
import { focusAnswer, focusScratch, initialEntry, markWrong, pressKey, setScratch, type EntryState, type Key } from '../core/entry';
import { maxAnswerLength } from '../core/levels';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { nextProblem, recordResult, RECENT_LIMIT, type AttemptInput } from '../core/session';
import { hintLimit, revealState, solve, type RevealState, type Step } from '../core/solver';
import type { Problem } from '../core/types';
import type { ProgressStore } from '../storage';
import { el } from './dom';
import { shake } from './feedback';
import { createHintBubble } from './hintBubble';
import { renderHorizontalProblem } from './horizontalProblemView';
import { createInstallTip, shouldShowInstallTip } from './installTip';
import { createNumberPad, keyFromKeyboard } from './numberPad';
import { renderPicture } from './pictureView';
import { renderColumnProblem, type Phase } from './problemView';
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
/** Hint/Pass ignore taps this soon after Next, so a double-tap on Next cannot pass the new problem. */
export const ACTION_GUARD_MS = 400;
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
  let unlockNote = ''; // 'New: subtraction!' — stays into the next problem until her first key press
  let steps: Step[] = [];
  let hintsShown = 0;
  let reveal: RevealState = revealState([], 0);
  let passTimer: ReturnType<typeof setTimeout> | null = null;
  let actionsReadyAt = -Infinity;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  // Static shell
  const totalEl = el('span', { class: 'total', 'data-role': 'total' });
  const streakEl = el('span', { class: 'streak', 'data-role': 'streak' });
  const muteBtn = el('button', { type: 'button', class: 'icon-button', 'data-action': 'mute', 'aria-label': 'Sound on or off' });
  const problemHost = el('div');
  const messageEl = el('div', { class: 'message', 'data-role': 'message', 'aria-live': 'polite' });
  const bubble = createHintBubble();
  const pictureHost = el('div', { class: 'picture-host', 'data-role': 'picture' });
  // The bubble floats above the problem (anchored to it) so hint length never resizes the problem.
  const problemArea = el('div', { class: 'problem-area', 'data-role': 'problem-area' },
    el('div', { class: 'problem-anchor' }, bubble.el, problemHost), pictureHost);
  const hintBtn = el('button', { type: 'button', class: 'action hint', 'data-action': 'hint' });
  const passBtn = el('button', { type: 'button', class: 'action pass', 'data-action': 'pass' }, 'Pass');
  const actions = el('div', { class: 'actions' });
  const appEl = el('div', { class: 'app' },
      el('header', { class: 'topbar' }, el('div', { class: 'badges' }, totalEl, streakEl), muteBtn),
      el('main', { class: 'play' },
        el('section', { class: 'stage' }, problemArea, messageEl),
        el('section', { class: 'controls' }, actions, createNumberPad())));
  root.replaceChildren(appEl);
  if (shouldShowInstallTip(nav, progress)) appEl.prepend(createInstallTip());

  function later(fn: () => void, ms: number) {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }

  function render() {
    const renderFn = problem.op === '×' ? renderHorizontalProblem : renderColumnProblem;
    renderFn(problemHost, { problem, entry, ghosts: reveal.ghosts, highlight: reveal.column, phase });
    totalEl.textContent = `⭐ ${progress.total}`;
    streakEl.textContent = `🔥 ${progress.streak}`;
    messageEl.textContent = message || unlockNote;
    messageEl.classList.toggle('good', !message && unlockNote !== '');
    muteBtn.textContent = progress.muted ? '🔇' : '🔊';
    bubble.set(reveal.text);
    renderPicture(pictureHost, reveal.picture ?? null);
    const allShown = hintsShown >= hintLimit(steps);
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
    return result;
  }

  function submit() {
    if (!firstSubmitted) {
      attempt.firstSubmitMs = now() - shownAt;
      firstSubmitted = true;
    }
    if (Number(entry.answer) === answerOf(problem)) {
      const { levelChange, unlocked } = finish(attempt);
      if (unlocked.length > 0) unlockNote = `New: ${unlocked.join(' and ')}!`;
      if (levelChange === 1 || unlocked.length > 0) sound.levelUp(); else sound.correct();
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
    if (phase !== 'answering' || hintsShown >= hintLimit(steps)) return;
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
    unlockNote = '';
    const r = pressKey(entry, key, maxAnswerLength(problem));
    entry = r.state;
    if (key !== 'submit' && message === TRY_AGAIN && !entry.faded) message = '';
    if (r.submit) submit(); else render();
  }

  const unlockSound = () => sound.unlock();
  function onPointerDown(e: Event) {
    sound.unlock();
    const target = e.target as HTMLElement;
    const keyEl = target.closest<HTMLElement>('[data-key]');
    if (keyEl) { e.preventDefault(); handleKey(keyEl.dataset.key as Key); return; }
    const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'mute') { toggleMute(); return; }
    if (action === 'dismiss-tip') { dismissTip(); return; }
    if (action === 'hint' || action === 'pass') {
      if (now() >= actionsReadyAt) { if (action === 'hint') hint(); else pass(); }
      return;
    }
    if (action === 'next') {
      if (phase === 'passed') { showNext(); actionsReadyAt = now() + ACTION_GUARD_MS; }
      return;
    }
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
    sound.unlock();
    const key = keyFromKeyboard(e);
    if (!key) return;
    e.preventDefault();
    handleKey(key);
  }

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', unlockSound);
  window.addEventListener('keydown', onKeyDown);
  sound.setMuted(progress.muted);
  showNext();

  return {
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', unlockSound);
      window.removeEventListener('keydown', onKeyDown);
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
