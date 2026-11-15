import type { BigMoment } from '../../core/robo';
import { el } from '../dom';
import type { MomentPlace } from '../robo/robo';

const COUNT = 10;
const STAR = 14;
const STAR_PATH = 'M12 2l2.9 6.6 7.1.7-5.3 4.8 1.5 7-6.2-3.6-6.2 3.6 1.5-7L2 9.3l7.1-.7z';

/** The circle the sparkles go on: round Robo's middle, three robot heights out, so a small Robo still has a party. */
export function sparkleCircle(place: Pick<MomentPlace, 'centerX' | 'laneTop' | 'size' | 'robotH'>): { x: number; y: number; r: number } {
  const h = place.robotH ?? place.size;
  return { x: place.centerX ?? 0, y: place.laneTop + place.size - h / 2, r: 3 * h };
}

/** Sparkles go with the celebrations that have no fireworks of their own. */
export function wantsSparkles(big: BigMoment): boolean {
  if (big.kind === 'stars' || big.kind === 'conga') return true;
  return big.kind === 'day' && big.tier !== 'fireworks';
}

/** A ring of small stars that rise and fade (opacity and transform only). Under Reduce Motion they just sit and fade. */
export function createSparkles(): { el: HTMLElement; play(at: { x: number; y: number; r: number }, ms: number): void; stop(): void } {
  const layer = el('div', { class: 'sparkles', 'data-role': 'sparkles', 'aria-hidden': 'true' });
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function stop(): void {
    layer.replaceChildren();
  }

  function play(at: { x: number; y: number; r: number }, ms: number): void {
    stop();
    const still = reduced();
    const nodes: HTMLElement[] = [];
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 - Math.PI / 2;
      const star = el('span', { class: still ? 'sparkle' : 'sparkle sparkle-go' });
      if (still) star.setAttribute('data-still', '');
      star.style.left = `${Math.round((at.x + Math.cos(a) * at.r) * 10) / 10}px`;
      star.style.top = `${Math.round((at.y + Math.sin(a) * at.r) * 10) / 10}px`;
      star.style.setProperty('--sd', `${Math.round(ms * 0.6 * i / COUNT)}ms`);
      star.style.setProperty('--sl', `${Math.max(600, Math.round(ms * 0.4))}ms`);
      star.innerHTML = `<svg viewBox="0 0 24 24" width="${STAR}" height="${STAR}" focusable="false"><path d="${STAR_PATH}" fill="#f5b700" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
      nodes.push(star);
    }
    layer.append(...nodes);
  }

  return { el: layer, play, stop };
}
