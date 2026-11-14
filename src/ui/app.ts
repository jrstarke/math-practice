import { answerOf } from '../core/arith';
import { localDate } from '../core/days';
import { focusAnswer, focusScratch, initialEntry, markWrong, pressKey, setScratch, type EntryState, type Key } from '../core/entry';
import { maxAnswerLength } from '../core/levels';
import type { Progress } from '../core/progress';
import type { Rng } from '../core/rng';
import { decideRobo, initialRoboMemory, welcomeWords, type BigMoment, type RoboOutcome } from '../core/robo';
import { nextProblem, recordResult, RECENT_LIMIT, type AttemptInput } from '../core/session';
import { hintLimit, revealState, solve, type RevealState, type Step } from '../core/solver';
import type { Problem } from '../core/types';
import { makeOffer, pickCheer, picksOwed, placeItem } from '../core/world';
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
import { createWorldBackground } from './world/background';
import { createPick } from './world/pick';

export interface AppDeps {
  root: HTMLElement;
  rng: Rng;
  now: () => number;
  /** Wall-clock time (epoch ms) for the day streak's dates and time away. Defaults to Date.now. */
  clock?: () => number;
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
/** Robo welcomes her on opening the app, and on coming back after at least this long away. */
export const WELCOME_AFTER_MS = 30 * 60 * 1000;
const TRY_AGAIN = 'Not quite — try again';
const ROBO_TRY_AGAIN = 'Not quite — try again!';
/** How far the problem's card reaches past the problem (and picture) on each side. */
const CARD_PAD = 14;

function toBox(r: DOMRect): Box {
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

interface Attempt extends AttemptInput { firstSubmitMs: number }

export function mountApp(deps: AppDeps): { destroy(): void } {
  const { root, rng, now, store, sound } = deps;
  const nav = deps.nav ?? (navigator as { standalone?: boolean });
  const clock = deps.clock ?? Date.now;

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
  let greeting = false; // Robo is saying hello at its spot
  let pickPending = false; // a pick is owed and opens when the moment playing now ends
  let pickView: { el: HTMLElement; destroy(): void } | null = null;
  let lastCheer: string | null = null; // in memory: the pick's last cheer line, so it doesn't repeat

  // Static shell
  const totalEl = el('span', { class: 'total', 'data-role': 'total' });
  const muteBtn = el('button', { type: 'button', class: 'icon-button', 'data-action': 'mute', 'aria-label': 'Sound on or off' });
  const problemHost = el('div');
  const messageEl = el('div', { class: 'message', 'data-role': 'message', 'aria-live': 'polite' });
  const bubble = createHintBubble();
  const pictureHost = el('div', { class: 'picture-host', 'data-role': 'picture' });
  // The bubble floats above the problem (anchored to it) so hint length never resizes the problem.
  const problemAnchor = el('div', { class: 'problem-anchor' }, bubble.el, problemHost);
  // With a world, the problem sits on a card (out of flow: placed by fitCard, so the layout never changes).
  const cardEl = el('div', { class: 'world-card', 'data-role': 'world-card', 'aria-hidden': 'true' });
  const problemArea = el('div', { class: 'problem-area', 'data-role': 'problem-area' }, cardEl, problemAnchor, pictureHost);
  const hintBtn = el('button', { type: 'button', class: 'action hint', 'data-action': 'hint' });
  const passBtn = el('button', { type: 'button', class: 'action pass', 'data-action': 'pass' }, 'Pass');
  const actions = el('div', { class: 'actions' });
  const stageEl = el('section', { class: 'stage' }, problemArea, messageEl);
  const controlsEl = el('section', { class: 'controls' }, actions, createNumberPad());
  const robo = createRobo();
  const appEl = el('div', { class: 'app' },
      el('header', { class: 'topbar' }, el('div', { class: 'badges' }, totalEl),
        el('div', { class: 'topbar-end' },
          ...(deps.version ? [el('span', { class: 'version', 'data-role': 'version' }, deps.version)] : []), muteBtn)),
      el('main', { class: 'play' },
        stageEl, controlsEl),
      robo.el, robo.overlay);
  // Her world, blurred and still behind the math (once she has one).
  const bg = createWorldBackground();
  root.replaceChildren(bg.el, appEl);
  if (shouldShowInstallTip(nav, progress)) appEl.prepend(createInstallTip());

  function showWorld() {
    bg.update(progress.world.items);
    appEl.toggleAttribute('data-world', progress.world.items.length > 0);
    fitCard();
  }

  /** The card hugs the problem and its picture (as drawn now, Robo's shift included), padded. Only with a world. */
  function fitCard() {
    if (!appEl.hasAttribute('data-world')) return;
    const area = rect(problemArea);
    const c = union(rect(problemAnchor), pictureHost.childElementCount > 0 ? rect(pictureHost) : null);
    Object.assign(cardEl.style, {
      left: `${c.left - area.left - CARD_PAD}px`, top: `${c.top - area.top - CARD_PAD}px`,
      width: `${c.right - c.left + 2 * CARD_PAD}px`, height: `${c.bottom - c.top + 2 * CARD_PAD}px`,
    });
  }

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
    fitCard();
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
    fitCard();
  }

  /** Measure the layout: stand or peek, and where. Runs after the first render and on every resize. */
  function measureRobo() {
    // A moment is placed in pixels for the layout it started in; if a rotation or resize moved the stage or the
    // controls it would be in the wrong place (or a second Robo, peek → standing), so it ends.
    const layout = JSON.stringify([rect(stageEl), rect(controlsEl)]);
    if (momentTimer && layout !== roboLayout) endMoment();
    roboLayout = layout;
    roboMode = deps.roboMode ?? chooseMode(document.documentElement.clientWidth || window.innerWidth, rect(controlsEl));
    robo.show(roboMode === 'standing' && !pickView); // the pick brings its own Robo
    if (roboMode === 'standing' && roboWanted) roboUp(); else roboDown();
    syncMessage();
  }

  function endMoment() {
    if (momentTimer) { clearTimeout(momentTimer); timers.delete(momentTimer); momentTimer = null; }
    roboAway = false;
    robo.endMoment();
    endGreeting();
    if (pickPending && !pickView) startPick();
  }

  /** The pick: full screen over the app. Its offer is saved before it shows, so a reload never loses it. */
  function startPick() {
    if (pickView) return;
    pickPending = true;
    let offer = progress.world.offer;
    if (!offer) {
      offer = makeOffer(roboRng);
      progress = { ...progress, world: { ...progress.world, offer } };
      store.save(progress);
    }
    const view = createPick({
      items: progress.world.items,
      offer,
      days: progress.day.practised,
      cheer: () => (lastCheer = pickCheer(lastCheer, roboRng)),
      onPlaced: (item) => {
        progress = { ...progress, world: placeItem(progress.world, item) };
        store.save(progress);
        showWorld();
      },
      onDone: closePick,
    });
    pickView = view; // before endMoment(), so it can't open a second one
    endMoment(); // any greeting or moment still playing
    robo.show(false);
    root.append(view.el);
  }

  function closePick() {
    if (!pickView) return;
    pickView.destroy();
    pickView.el.remove();
    pickView = null;
    pickPending = false;
    actionsReadyAt = now() + ACTION_GUARD_MS; // a tap that lands as the pick closes must not hit Hint or Pass
    measureRobo(); // Robo back
  }

  function endGreeting() {
    if (!greeting) return;
    greeting = false;
    robo.say('');
  }

  /** Hello, at Robo's spot. Never while it's up beside the problem or away on a moment: nothing may cover her work. */
  function greet() {
    // roboWanted: a hint or Pass is showing (on small screens a peek's words would sit on the hint).
    if (pickView || roboWanted || (roboMode === 'standing' && (roboPlace !== 'spot' || roboAway))) return;
    endMoment();
    if (pickView) return; // ending a moment that held a pick opened it: no hello under the pick
    const ms = robo.greet(welcomeWords(progress.total), momentPlace());
    greeting = roboMode === 'standing';
    sound.robo();
    momentTimer = later(() => { momentTimer = null; endMoment(); }, ms);
  }

  const awayLongEnough = () => progress.hiddenAt === null || clock() - progress.hiddenAt >= WELCOME_AFTER_MS;

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      progress = { ...progress, hiddenAt: clock() };
      store.save(progress);
    } else if (awayLongEnough()) {
      greet();
    }
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
    const { big, line, surprise, pick } = r.decision;
    if (big) {
      // The moment opens the pick when it ends. Set after playMoment, whose own opening endMoment() must not open it
      // (a pick already waiting on an earlier moment waits on this one instead).
      const wantPick = pick || pickPending;
      pickPending = false;
      playMoment(big);
      pickPending = wantPick;
      return;
    }
    // Pending (and no pick open) means a moment is holding it: it opens when that moment ends.
    if (pick) { if (!pickPending) startPick(); return; }
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
    messageEl.textContent = message || unlockNote;
    messageEl.classList.toggle('good', !message && unlockNote !== '');
    syncMessage();
    muteBtn.textContent = progress.muted ? '🔇' : '🔊';
    bubble.set(reveal.text);
    renderPicture(pictureHost, reveal.picture ?? null);
    fitCard();
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
    const result = recordResult(progress, problem, a, localDate(new Date(clock())));
    progress = result.progress;
    store.save(progress);
    recent.push(problem);
    if (recent.length > RECENT_LIMIT) recent.shift();
    return result;
  }

  /** After the answer is recorded: a pick is owed for every 5 days practised that she hasn't spent yet. */
  const pickOwed = () => picksOwed(progress.day.practised, progress.world) > 0;

  function submit() {
    if (!firstSubmitted) {
      attempt.firstSubmitMs = now() - shownAt;
      firstSubmitted = true;
    }
    if (Number(entry.answer) === answerOf(problem)) {
      const totalBefore = progress.total;
      const { levelChange, unlocked, dayDone } = finish(attempt);
      if (unlocked.length > 0) unlockNote = `New: ${unlocked.join(' and ')}!`;
      if (levelChange === 1 || unlocked.length > 0) sound.levelUp(); else sound.correct();
      phase = 'correct';
      message = '';
      render();
      cheer({ totalBefore, totalAfter: progress.total, levelChange, unlocked,
        wrongSubmits: attempt.wrongSubmits, hintsUsed: attempt.hintsUsed, passed: false, dayDone, pickOwed: pickOwed() });
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
    pickPending = false; // no pick under a hint; it opens on her next right answer (still owed, no offer made yet)
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
    const { levelChange, unlocked, dayDone } = finish({ ...attempt, passed: true });
    phase = 'passing';
    message = '';
    entry = focusAnswer({ ...entry, answer: '', faded: false });
    pickPending = false; // a Pass never opens a pick; it opens on her next right answer
    endMoment();
    robo.calm();
    roboWanted = true; // so passStep() sends Robo up
    passStep();
    cheer({ totalBefore, totalAfter: progress.total, levelChange, unlocked,
      wrongSubmits: attempt.wrongSubmits, hintsUsed: attempt.hintsUsed, passed: true, dayDone, pickOwed: pickOwed() });
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
    endGreeting();
    const r = pressKey(entry, key, maxAnswerLength(problem));
    entry = r.state;
    if (key !== 'submit' && message === TRY_AGAIN && !entry.faded) message = '';
    if (r.submit) submit(); else render();
  }

  const unlockSound = () => sound.unlock();
  function onPointerDown(e: Event) {
    sound.unlock();
    // The pick handles its own taps (its listener has already run); nothing under it may take one.
    if (pickView) return;
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
    if (pickView) return; // the answer under the pick can't change
    const key = keyFromKeyboard(e);
    if (!key) return;
    e.preventDefault();
    handleKey(key);
  }

  root.addEventListener('pointerdown', onPointerDown);
  root.addEventListener('pointerup', unlockSound);
  window.addEventListener('keydown', onKeyDown);
  sound.setMuted(progress.muted);
  showWorld();
  showNext();
  measureRobo();
  if (awayLongEnough()) greet();
  document.addEventListener('visibilitychange', onVisibility);
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
      document.removeEventListener('visibilitychange', onVisibility);
      resizeObserver?.disconnect();
      robo.el.remove();
      robo.overlay.remove();
      if (pickView) { pickView.destroy(); pickView.el.remove(); pickView = null; }
      pickPending = false;
      bg.destroy();
      bg.el.remove();
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
