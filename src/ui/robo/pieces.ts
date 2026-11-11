// Small building blocks shared by Robo's standing view and its celebration scenes.
import { createFigure, setFigure } from './drawing';
import { ROBO_H, ROBO_W } from './layout';

export function div(cls: string, attrs: Record<string, string> = {}): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  for (const [k, v] of Object.entries(attrs)) d.setAttribute(k, v);
  return d;
}

export function words(text: string): HTMLElement {
  const w = div('robo-words', { 'data-role': 'moment-words' });
  w.textContent = text;
  return w;
}

/** Robo (or, with friend, one of its identical friends) with the green light on and smiling. */
export function cheering(friend = false): HTMLElement {
  const f = createFigure();
  setFigure(f, { light: 'green', mouth: 'smile' });
  if (friend) f.classList.add('robo-friend');
  return f;
}

/** A box Robo's shape, `size` tall, holding one figure (the drawing scales to fill it). fit() in robo.ts resizes it. */
export function slot(f: HTMLElement, cls = '', size = ROBO_H): HTMLElement {
  const s = div(`robo-slot ${cls}`.trim());
  s.style.width = `${Math.round(ROBO_W * size / ROBO_H)}px`;
  s.style.height = `${size}px`;
  s.append(f);
  return s;
}

/** The soccer ball from robot-kick.svg, with its speed lines. */
export const BALL = `
<svg viewBox="-60 -24 84 48" width="84" height="48" fill="none" stroke="#2b2b2b" stroke-linecap="round" stroke-linejoin="round" focusable="false">
  <g class="robo-speed"><path d="M-24 -10 L-50 -10 M-28 1 L-58 1 M-24 12 L-46 12" stroke-width="3"/></g>
  <g class="robo-ball-spin">
    <circle cx="0" cy="0" r="18" fill="#ffffff" stroke-width="3"/>
    <path d="M0 -7 L6.66 -2.16 L4.11 5.66 L-4.11 5.66 L-6.66 -2.16 Z" fill="#2b2b2b" stroke-width="2"/>
    <path d="M0 -7 L0 -18 M6.66 -2.16 L17.1 -5.6 M4.11 5.66 L10.6 14.6 M-4.11 5.66 L-10.6 14.6 M-6.66 -2.16 L-17.1 -5.6" stroke-width="2"/>
  </g>
</svg>`;

/** The same ball on its own, filling a square box. */
const ROUND_BALL = `
<svg viewBox="-20 -20 40 40" fill="none" stroke="#2b2b2b" stroke-linecap="round" stroke-linejoin="round" focusable="false">
  <g class="robo-ball-spin">
    <circle cx="0" cy="0" r="18" fill="#ffffff" stroke-width="3"/>
    <path d="M0 -7 L6.66 -2.16 L4.11 5.66 L-4.11 5.66 L-6.66 -2.16 Z" fill="#2b2b2b" stroke-width="2"/>
    <path d="M0 -7 L0 -18 M6.66 -2.16 L17.1 -5.6 M4.11 5.66 L10.6 14.6 M-4.11 5.66 L-10.6 14.6 M-6.66 -2.16 L-17.1 -5.6" stroke-width="2"/>
  </g>
</svg>`;

/** A scene's ball (class robo-ball, which the layout check looks for). */
export function ball(cls = ''): HTMLElement {
  const b = div(`robo-ball ${cls}`.trim());
  b.innerHTML = ROUND_BALL;
  return b;
}
