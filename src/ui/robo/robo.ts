import type { BigMoment } from '../../core/robo';
import { createFigure, setFigure } from './drawing';
import { ROBO_H, ROBO_W, type RoboMode } from './layout';
import { BALL, cheering, div, slot, words } from './pieces';
import { buildScene, congaLength } from './scenes';

export const MOMENT_MS = { walk: 4000, highFive: 2500, kick: 3000, day: 3500, peek: 2500, surprise: 1200, welcome: 3000, flash: 600 } as const;

/** Where a moment can play, measured by app.ts. */
export interface MomentPlace {
  mode: RoboMode;
  spot: { left: number; top: number } | null;
  laneTop: number;
  /** Robo's height in the moment: ROBO_H, or less to fit the gap under the problem (layout.momentSize). */
  size: number;
  viewportWidth: number;
  peek: { left: number; top: number };
  /** Peek mode: where the words go, centred on x with their bottom edge here (just above the problem). */
  wordsAt: { x: number; bottom: number; width: number };
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
  /** Robo's own words at its spot ('' hides the bubble). */
  say(text: string): void;
  talk(on: boolean): void;
  play(big: BigMoment, at: MomentPlace): number;
  /** Re-place the moment that's playing (the next problem may have less room under it). No-op without one. */
  refit(at: MomentPlace): void;
  surprise(): number;
  /** Hello: Robo waves at its spot and says `words` (or peeks in with them on a small screen). The caller clears the
   * words with say(''); endMoment() stops the wave. */
  greet(words: string, at: MomentPlace): number;
  endMoment(): void;
}

/** Restart a one-shot CSS animation class. */
function retrigger(node: HTMLElement, cls: string) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
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

  /** A moment's layer. --s is Robo's scale in it, which the CSS uses for offsets and the ball. */
  function scene(kind: string, cls = 'robo-scene'): HTMLElement {
    return div(cls, { 'data-moment': kind });
  }

  /** Size and place a moment's layer, its Robos and (peek) its words for `at`. The layer is the lane's height; a
   * scene with a room factor (data-room) draws its Robos that much smaller, and --a is their scale for CSS offsets. */
  function fit(m: HTMLElement, at: MomentPlace) {
    const peeking = m.dataset.moment === 'peek';
    const room = Number(m.dataset.room ?? 1) || 1;
    const height = Math.round(at.size / room);
    const width = Math.round(ROBO_W * height / ROBO_H);
    m.style.top = `${peeking ? at.peek.top : at.laneTop}px`;
    m.style.height = `${at.size}px`;
    m.style.setProperty('--s', String(Math.round(at.size / ROBO_H * 1000) / 1000));
    m.style.setProperty('--a', String(Math.round(at.size / ROBO_H / room * 1000) / 1000));
    if (peeking) {
      m.style.left = `${at.peek.left}px`;
      m.style.width = `${width}px`;
    }
    const slots = m.querySelectorAll<HTMLElement>('.robo-slot');
    for (const s of slots) {
      s.style.width = `${width}px`;
      s.style.height = `${height}px`;
    }
    if (m.dataset.moment === 'conga') {
      // Under Reduce Motion the line stands still, centred: --fit shrinks it to the screen width (scenes.css).
      const fit = Math.min(1, (at.viewportWidth - 32) / congaLength(slots.length, width));
      m.style.setProperty('--fit', String(Math.floor(fit * 1000) / 1000));
    }
    const w = overlay.querySelector<HTMLElement>('.robo-peek-words');
    if (w) {
      w.style.left = `${at.wordsAt.x}px`;
      w.style.top = `${at.wordsAt.bottom}px`;
      w.style.maxWidth = `${at.wordsAt.width}px`;
    }
  }

  function standingMoment(big: BigMoment, at: MomentPlace): { node: HTMLElement; ms: number } {
    if (big.kind === 'levelUp' || big.kind === 'stars' || big.kind === 'conga') return buildScene(big, at);
    if (big.kind === 'day') {
      const m = scene('day');
      m.dataset.tier = big.tier;
      const me = cheering();
      if (big.tier !== 'wave') setFigure(me, { arms: 'up' });
      m.append(words(big.words), slot(me, 'robo-day-me', at.size));
      if (big.tier === 'fireworks') m.append(fireworks());
      return { node: m, ms: MOMENT_MS.day };
    }
    const m = scene('kick');
    const kicker = cheering();
    kicker.classList.add('robo-kicking');
    const ball = div('robo-ball');
    ball.innerHTML = BALL; // the kick's ball flies inside a rig that scales with Robo
    const ballRig = div('robo-ball-rig'); // scales the ball and its flight with Robo
    ballRig.append(ball);
    m.append(words(big.words), slot(kicker, 'robo-kicker', at.size), ballRig);
    return { node: m, ms: MOMENT_MS.kick };
  }

  function peekMoment(text: string, at: MomentPlace): HTMLElement[] {
    const m = scene('peek', 'robo-scene robo-peek');
    const f = cheering();
    setFigure(f, { arms: 'up' });
    // Robo rises out of the controls' top edge: the clip hides it until it's above that line.
    const clip = div('robo-peek-clip');
    clip.append(slot(f, '', at.size));
    m.append(clip);
    // On a small screen there's no room beside or above Robo, so the words show where hints show.
    const w = words(text);
    w.classList.add('robo-peek-words');
    return [m, w];
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
      if (figure.dataset.light !== 'red') return;
      setFigure(figure, { light: 'off' });
      say('');
    },
    say,
    talk(on) {
      setFigure(figure, { mouth: on ? 'talk' : 'flat' });
    },
    play(big, at) {
      el.removeAttribute('data-surprise');
      if (at.mode === 'peek') {
        overlay.replaceChildren(...peekMoment(big.words, at));
        view.refit(at);
        return MOMENT_MS.peek;
      }
      const { node, ms } = standingMoment(big, at);
      overlay.replaceChildren(node);
      view.refit(at);
      el.setAttribute('data-away', '');
      return ms;
    },
    refit(at) {
      const m = overlay.querySelector<HTMLElement>('[data-moment]');
      if (m) fit(m, at);
    },
    surprise() {
      el.dataset.surprise = surprises++ % 2 === 0 ? 'wave' : 'bounce';
      return MOMENT_MS.surprise;
    },
    greet(text, at) {
      if (at.mode === 'peek') {
        overlay.replaceChildren(...peekMoment(text, at));
        view.refit(at);
        return MOMENT_MS.peek;
      }
      el.dataset.surprise = 'wave';
      say(text);
      return MOMENT_MS.welcome;
    },
    endMoment() {
      overlay.replaceChildren();
      el.removeAttribute('data-away');
      el.removeAttribute('data-surprise');
    },
  };
  return view;
}

/** Bursts of sparks beside Robo for a 10+ day: the box is 170 × 136 at full scale and shrinks with --s like the ball. */
function fireworks(): HTMLElement {
  const box = div('robo-fireworks', { 'data-role': 'fireworks' });
  box.innerHTML = FIREWORKS;
  return box;
}

function burst(x: number, y: number, r: number, colour: string, n: number): string {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const p = (k: number) => `${Math.round(x + Math.cos(a) * r * k)} ${Math.round(y + Math.sin(a) * r * k)}`;
    return `M${p(0.35)} L${p(1)}`;
  }).join(' ');
  return `<g class="robo-burst robo-burst-${n}" stroke="${colour}"><path d="${rays}"/><circle cx="${x}" cy="${y}" r="${Math.round(r * 0.12)}" fill="${colour}" stroke="none"/></g>`;
}

const FIREWORKS = `
<svg viewBox="0 0 170 136" fill="none" stroke-width="5" stroke-linecap="round" focusable="false">
  ${burst(48, 40, 34, '#4cd964', 1)}
  ${burst(126, 58, 30, '#ff5a4f', 2)}
  ${burst(78, 100, 28, '#f5b700', 3)}
</svg>`;
