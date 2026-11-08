import type { BigMoment } from '../../core/robo';
import { createFigure, setFigure } from './drawing';
import { ROBO_H, ROBO_W, type RoboMode } from './layout';

export const MOMENT_MS = { walk: 4000, highFive: 2500, kick: 3000, peek: 2500, surprise: 1200, flash: 600 } as const;

/** Where a moment can play, measured by app.ts. */
export interface MomentPlace {
  mode: RoboMode;
  spot: { left: number; top: number } | null;
  laneTop: number;
  viewportWidth: number;
  peek: { left: number; top: number };
}

export interface RoboView {
  /** data-role="robo": the standing Robo (fixed-position) and its own bubble. */
  el: HTMLElement;
  /** data-role="robo-moment": a fixed, full-viewport layer for moments. */
  overlay: HTMLElement;
  show(visible: boolean): void;
  moveTo(p: { left: number; top: number }, place: 'spot' | 'up' | 'point'): void;
  think(): void;
  right(line: string | null): void;
  wrong(words: string | null): void;
  calm(): void;
  talk(on: boolean): void;
  play(big: BigMoment, at: MomentPlace): number;
  surprise(): number;
  endMoment(): void;
}

function div(cls: string, attrs: Record<string, string> = {}): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  for (const [k, v] of Object.entries(attrs)) d.setAttribute(k, v);
  return d;
}

/** Restart a one-shot CSS animation class. */
function retrigger(node: HTMLElement, cls: string) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

function words(text: string): HTMLElement {
  const w = div('robo-words', { 'data-role': 'moment-words' });
  w.textContent = text;
  return w;
}

function cheering(friend = false): HTMLElement {
  const f = createFigure();
  setFigure(f, { light: 'green', mouth: 'smile' });
  if (friend) f.classList.add('robo-friend');
  return f;
}

/** A positioned box the size of Robo, holding one figure. */
function slot(f: HTMLElement, cls = ''): HTMLElement {
  const s = div(`robo-slot ${cls}`.trim());
  s.style.width = `${ROBO_W}px`;
  s.style.height = `${ROBO_H}px`;
  s.append(f);
  return s;
}

export function createRobo(): RoboView {
  const figure = createFigure();
  const bubble = div('robo-bubble empty', { 'data-role': 'robo-bubble' });
  const el = div('robo', { 'data-role': 'robo', 'aria-hidden': 'true', 'data-place': 'spot' });
  el.style.width = `${ROBO_W}px`;
  el.style.height = `${ROBO_H}px`;
  el.append(bubble, figure);
  const overlay = div('robo-moment-layer', { 'data-role': 'robo-moment', 'aria-hidden': 'true' });
  let surprises = 0;

  function say(text: string) {
    bubble.textContent = text;
    bubble.classList.toggle('empty', text === '');
  }

  function scene(kind: string, top: number): HTMLElement {
    const m = div('robo-scene', { 'data-moment': kind });
    m.style.top = `${top}px`;
    m.style.height = `${ROBO_H}px`;
    return m;
  }

  function standingMoment(big: BigMoment, at: MomentPlace): { node: HTMLElement; ms: number } {
    if (big.kind === 'walk') {
      const m = scene(big.withFriend ? 'walk-friend' : 'walk', at.laneTop);
      const walker = div('robo-walker');
      walker.append(slot(cheering(), 'robo-walking'));
      if (big.withFriend) walker.append(slot(cheering(true), 'robo-walking robo-walking-b'));
      walker.append(words(big.words));
      m.append(walker);
      return { node: m, ms: MOMENT_MS.walk };
    }
    if (big.kind === 'highFive') {
      const m = scene('high-five', at.laneTop);
      const me = cheering();
      setFigure(me, { arms: 'high-five' });
      const friend = cheering(true);
      setFigure(friend, { arms: 'high-five' });
      m.append(words(big.words), slot(me, 'robo-hf-me'), slot(friend, 'robo-hf-friend'));
      return { node: m, ms: MOMENT_MS.highFive };
    }
    const m = scene('kick', at.laneTop);
    const kicker = cheering();
    kicker.classList.add('robo-kicking');
    const ball = div('robo-ball');
    ball.innerHTML = BALL;
    m.append(words(big.words), slot(kicker, 'robo-kicker'), ball);
    return { node: m, ms: MOMENT_MS.kick };
  }

  function peekMoment(big: BigMoment, at: MomentPlace): HTMLElement {
    const m = div('robo-scene robo-peek', { 'data-moment': 'peek' });
    m.style.left = `${at.peek.left}px`;
    m.style.top = `${at.peek.top}px`;
    m.style.width = `${ROBO_W}px`;
    m.style.height = `${ROBO_H}px`;
    const f = cheering();
    setFigure(f, { arms: 'up' });
    // Robo rises out of the controls' top edge: the clip hides it until it's above that line.
    const clip = div('robo-peek-clip');
    clip.append(slot(f));
    m.append(clip, words(big.words));
    return m;
  }

  const view: RoboView = {
    el,
    overlay,
    show(visible) {
      el.hidden = !visible;
    },
    moveTo(p, place) {
      if (el.dataset.place !== place) retrigger(el, 'robo-hop');
      el.dataset.place = place;
      el.style.left = `${p.left}px`;
      el.style.top = `${p.top}px`;
      setFigure(figure, place === 'spot' ? { arms: 'down', look: 'up' } : { arms: 'point', look: place === 'up' ? 'side' : 'up' });
    },
    think() {
      setFigure(figure, { light: 'off', look: el.dataset.place === 'up' ? 'side' : 'up', mouth: 'flat' });
      say('');
    },
    right(line) {
      setFigure(figure, { light: 'green', mouth: 'smile' });
      retrigger(el, 'robo-flash');
      say(line ?? '');
    },
    wrong(text) {
      setFigure(figure, { light: 'red', mouth: 'flat' });
      if (text !== null) say(text);
    },
    calm() {
      if (figure.dataset.light === 'red') setFigure(figure, { light: 'off' });
    },
    talk(on) {
      setFigure(figure, { mouth: on ? 'talk' : 'flat' });
    },
    play(big, at) {
      el.removeAttribute('data-surprise');
      if (at.mode === 'peek') {
        overlay.replaceChildren(peekMoment(big, at));
        return MOMENT_MS.peek;
      }
      const { node, ms } = standingMoment(big, at);
      overlay.replaceChildren(node);
      el.setAttribute('data-away', '');
      return ms;
    },
    surprise() {
      el.dataset.surprise = surprises++ % 2 === 0 ? 'wave' : 'bounce';
      return MOMENT_MS.surprise;
    },
    endMoment() {
      overlay.replaceChildren();
      el.removeAttribute('data-away');
      el.removeAttribute('data-surprise');
    },
  };
  return view;
}

/** The soccer ball from robot-kick.svg, with its speed lines. */
const BALL = `
<svg viewBox="-60 -24 84 48" width="84" height="48" fill="none" stroke="#2b2b2b" stroke-linecap="round" stroke-linejoin="round" focusable="false">
  <g class="robo-speed"><path d="M-24 -10 L-50 -10 M-28 1 L-58 1 M-24 12 L-46 12" stroke-width="3"/></g>
  <g class="robo-ball-spin">
    <circle cx="0" cy="0" r="18" fill="#ffffff" stroke-width="3"/>
    <path d="M0 -7 L6.66 -2.16 L4.11 5.66 L-4.11 5.66 L-6.66 -2.16 Z" fill="#2b2b2b" stroke-width="2"/>
    <path d="M0 -7 L0 -18 M6.66 -2.16 L17.1 -5.6 M4.11 5.66 L10.6 14.6 M-4.11 5.66 L-10.6 14.6 M-6.66 -2.16 L-17.1 -5.6" stroke-width="2"/>
  </g>
</svg>`;
