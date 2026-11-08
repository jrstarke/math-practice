import { answerOf } from '../core/arith';
import { focusAnswer, focusScratch, initialEntry, markWrong, pressKey, setScratch, type EntryState, type Key } from '../core/entry';
import { maxAnswerLength } from '../core/levels';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { decideRobo, initialRoboMemory, type BigMoment, type RoboOutcome } from '../core/robo';
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
import { fitPicture, renderPicture } from './pictureView';
import { renderColumnProblem, type Phase } from './problemView';
import { chooseMode, laneTop, momentSize, peekPosition, placeUp, spotPosition, union, type Box, type RoboMode } from './robo/layout';
import { createRobo, type MomentPlace } from './robo/robo';
import type { SoundPlayer } from './sound';

export interface AppDeps {
  root: HTMLElement;
  rng: Rng;
  now: () => number;
  store: ProgressStore;
  sound: SoundPlayer;
  /** iOS exposes navigator.standalone; injectable for tests. */
  nav?: { standalone?: boolean };
  /** Build label shown small above the mute button, so a parent can tell which version is running. */
  version?: string;
  /** Robo's surprises use their own random source, so seeded problem sequences don't change. */
  roboRng?: Rng;
  /** Tests only: fix Robo's mode instead of measuring the layout. */
  roboMode?: RoboMode;
}

export const ADVANCE_MS = 1000;
export const PASS_STEP_MS = 1500;
/** Hint/Pass ignore taps this soon after Next, so a double-tap on Next cannot pass the new problem. */
export const ACTION_GUARD_MS = 400;
const TRY_AGAIN = 'Not quite — try again';
const ROBO_TRY_AGAIN = 'Not quite — try again!';

function toBox(r: DOMRect): Box {
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

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
  const roboRng = deps.roboRng ?? Math.random;
  let roboMemory = initialRoboMemory();
  let roboMode: RoboMode = deps.roboMode ?? 'standing';
  let roboPlace: 'spot' | 'up' | 'point' = 'spot';
  let roboWanted = false; // Hint or Pass asked Robo up for this problem (survives a rotation through peek mode)
  let momentTimer: ReturnType<typeof setTimeout> | null = null;
  let roboLayout = ''; // where the stage and controls were at the last measure
  let roboAway = false; // a walk, high five or kick is playing in standing mode

  // Static shell
  const totalEl = el('span', { class: 'total', 'data-role': 'total' });
  const streakEl = el('span', { class: 'streak', 'data-role': 'streak' });
  const muteBtn = el('button', { type: 'button', class: 'icon-button', 'data-action': 'mute', 'aria-label': 'Sound on or off' });
  const problemHost = el('div');
  const messageEl = el('div', { class: 'message', 'data-role': 'message', 'aria-live': 'polite' });
  const bubble = createHintBubble();
  const pictureHost = el('div', { class: 'picture-host', 'data-role': 'picture' });
  // The bubble floats above the problem (anchored to it) so hint length never resizes the problem.
  const problemAnchor = el('div', { class: 'problem-anchor' }, bubble.el, problemHost);
  const problemArea = el('div', { class: 'problem-area', 'data-role': 'problem-area' }, problemAnchor, pictureHost);
  const hintBtn = el('button', { type: 'button', class: 'action hint', 'data-action': 'hint' });
  const passBtn = el('button', { type: 'button', class: 'action pass', 'data-action': 'pass' }, 'Pass');
  const actions = el('div', { class: 'actions' });
  const stageEl = el('section', { class: 'stage' }, problemArea, messageEl);
  const controlsEl = el('section', { class: 'controls' }, actions, createNumberPad());
  const robo = createRobo();
  const appEl = el('div', { class: 'app' },
      el('header', { class: 'topbar' }, el('div', { class: 'badges' }, totalEl, streakEl),
        el('div', { class: 'topbar-end' },
          ...(deps.version ? [el('span', { class: 'version', 'data-role': 'version' }, deps.version)] : []), muteBtn)),
      el('main', { class: 'play' },
        stageEl, controlsEl),
      robo.el, robo.overlay);
  root.replaceChildren(appEl);
  if (shouldShowInstallTip(nav, progress)) appEl.prepend(createInstallTip());

  function later(fn: () => void, ms: number) {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
    return t;
  }

  // ---- Robo ----
  const rect = (node: Element) => toBox(node.getBoundingClientRect());
  const spot = () => spotPosition(rect(controlsEl));

  /** Robo says the wrong-answer words itself, unless it's up with a hint or away for a moment. */
  function roboSaysTryAgain() {
    return roboMode === 'standing' && roboPlace !== 'up' && !roboAway;
  }

  /**
   * In standing mode Robo says these itself, so the text line is kept for screen readers only. The one owner of
   * where "try again" shows: Robo's bubble at its spot, or the text line (Robo up with a hint, away, or peeking).
   */
  function syncMessage() {
    const roboSaysIt = message ? message === TRY_AGAIN && roboSaysTryAgain() : unlockNote !== '' && roboMode === 'standing';
    messageEl.classList.toggle('sr-only', roboSaysIt);
    if (message === TRY_AGAIN) robo.say(roboSaysIt ? ROBO_TRY_AGAIN : '');
  }

  /** Back to the spot: the problem moves back and the hint bubble is an ordinary bubble again. */
  function roboDown() {
    problemArea.style.removeProperty('--robo-shift');
    bubble.el.classList.remove('robo-says');
    roboPlace = 'spot';
    robo.moveTo(spot(), 'spot');
    syncMessage();
  }

  /** Up beside the problem if there's room, otherwise point at the bubble from the spot. */
  function roboUp() {
    roboWanted = true;
    if (roboMode !== 'standing') return;
    // --robo-shift is a transform, so measure without it.
    problemArea.style.removeProperty('--robo-shift');
    const content = union(rect(problemAnchor), pictureHost.childElementCount > 0 ? rect(pictureHost) : null);
    const p = placeUp(rect(stageEl), content);
    if (p) {
      problemArea.style.setProperty('--robo-shift', `${p.shift}px`);
      bubble.el.classList.add('robo-says');
      roboPlace = 'up';
      robo.moveTo({ left: p.left, top: p.top }, 'up');
      robo.talk(true);
    } else {
      bubble.el.classList.remove('robo-says');
      roboPlace = 'point';
      robo.moveTo(spot(), 'point');
    }
    syncMessage();
  }

  /** Measure the layout: stand or peek, and where. Runs after the first render and on every resize. */
  function measureRobo() {
    // A moment is placed in pixels for the layout it started in; if a rotation or resize moved the stage or the
    // controls it would be in the wrong place (or a second Robo, peek → standing), so it ends.
    const layout = JSON.stringify([rect(stageEl), rect(controlsEl)]);
    if (momentTimer && layout !== roboLayout) endMoment();
    roboLayout = layout;
    roboMode = deps.roboMode ?? chooseMode(document.documentElement.clientWidth || window.innerWidth, rect(controlsEl));
    robo.show(roboMode === 'standing');
    if (roboMode === 'standing' && roboWanted) roboUp(); else roboDown();
    syncMessage();
  }

  function endMoment() {
    if (momentTimer) { clearTimeout(momentTimer); timers.delete(momentTimer); momentTimer = null; }
    roboAway = false;
    robo.endMoment();
  }

  /** Where a moment can play now: the room under the problem (or picture) on screen. */
  function momentPlace(): MomentPlace {
    const controls = rect(controlsEl);
    const anchor = rect(problemAnchor), stage = rect(stageEl);
    const content = union(anchor, pictureHost.childElementCount > 0 ? rect(pictureHost) : null);
    const size = momentSize(stage.bottom, content.bottom);
    return {
      mode: roboMode,
      spot: roboMode === 'standing' ? spotPosition(controls) : null,
      laneTop: laneTop(stage, size),
      size,
      viewportWidth: window.innerWidth,
      peek: peekPosition(stage, size),
      wordsAt: { x: (stage.left + stage.right) / 2, bottom: anchor.top - 12, width: stage.right - stage.left },
    };
  }

  function playMoment(big: BigMoment) {
    endMoment();
    const ms = robo.play(big, momentPlace());
    roboAway = roboMode === 'standing';
    sound.robo();
    momentTimer = later(() => { momentTimer = null; endMoment(); syncMessage(); }, ms);
  }

  function cheer(o: RoboOutcome) {
    const r = decideRobo(roboMemory, o, roboRng);
    roboMemory = r.memory;
    const { big, line, surprise } = r.decision;
    if (big) { playMoment(big); return; }
    if (o.passed) return;
    if (roboPlace === 'up') {
      robo.right(null);
      if (line) bubble.set(line); // Robo's bubble is the one beside the problem while it's up
    } else {
      robo.right(line);
    }
    if (surprise && roboMode === 'standing' && roboPlace === 'spot' && !roboAway) {
      endMoment();
      momentTimer = later(() => { momentTimer = null; endMoment(); }, robo.surprise());
    }
  }

  function render() {
    const renderFn = problem.op === '×' || problem.op === '÷' ? renderHorizontalProblem : renderColumnProblem;
    renderFn(problemHost, { problem, entry, ghosts: reveal.ghosts, highlight: reveal.column, phase });
    totalEl.textContent = `⭐ ${progress.total}`;
    streakEl.textContent = `🔥 ${progress.streak}`;
    messageEl.textContent = message || unlockNote;
    messageEl.classList.toggle('good', !message && unlockNote !== '');
    syncMessage();
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
    roboWanted = false;
    roboDown();
    robo.think();
    render();
    // A moment still playing from the last answer: fit it to the room under this problem.
    if (momentTimer) robo.refit(momentPlace());
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
      const totalBefore = progress.total;
      const { levelChange, unlocked } = finish(attempt);
      if (unlocked.length > 0) unlockNote = `New: ${unlocked.join(' and ')}!`;
      if (levelChange === 1 || unlocked.length > 0) sound.levelUp(); else sound.correct();
      phase = 'correct';
      message = '';
      render();
      cheer({ totalBefore, totalAfter: progress.total, levelChange, unlocked,
        wrongSubmits: attempt.wrongSubmits, hintsUsed: attempt.hintsUsed, passed: false });
      later(showNext, ADVANCE_MS);
    } else {
      attempt.wrongSubmits++;
      entry = markWrong(entry);
      message = TRY_AGAIN;
      robo.wrong(null); // render() → syncMessage() decides where the words go
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
    endMoment();
    render();
    roboUp();
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
    if (roboWanted) roboUp(); // the picture may have just appeared
  }

  function pass() {
    if (phase !== 'answering') return;
    const totalBefore = progress.total;
    const { levelChange, unlocked } = finish({ ...attempt, passed: true });
    phase = 'passing';
    message = '';
    entry = focusAnswer({ ...entry, answer: '', faded: false });
    endMoment();
    robo.calm();
    roboWanted = true; // so passStep() sends Robo up
    passStep();
    cheer({ totalBefore, totalAfter: progress.total, levelChange, unlocked,
      wrongSubmits: attempt.wrongSubmits, hintsUsed: attempt.hintsUsed, passed: true });
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
    robo.calm();
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
  measureRobo();
  const onResize = () => measureRobo();
  window.addEventListener('resize', onResize);

  // Re-fit the multiplication picture when .problem-area's own box changes size (rotation, the
  // browser chrome collapsing/expanding, the install tip being dismissed, ...), not just on the
  // next render(): --picture-budget tracks .problem-area's height live via container queries, but
  // the --picture-cell scale fitPicture() picks is a one-off snapshot, so without this it can go
  // stale (too small after the box grows, or still overflowing after it shrinks) until the next
  // unrelated re-render happens to call renderPicture() again. .problem-area is a size container
  // (container-type: size), so its own size never depends on its content — observing it, rather
  // than .picture-host itself, can't create a resize feedback loop.
  let resizeObserver: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (pictureHost.childElementCount > 0) fitPicture(pictureHost);
      measureRobo();
    });
    resizeObserver.observe(problemArea);
  }

  return {
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointerup', unlockSound);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      robo.el.remove();
      robo.overlay.remove();
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
