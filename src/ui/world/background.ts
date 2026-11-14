import './world.css';
import { AREA_H, HORIZON_Y, type WorldItem } from '../../core/world';
import { el } from '../dom';
import { fitFrame } from './frame';
import { GROUND, SKY_LOW, SKY_TOP, sceneSvg, svgDataUri } from './scene';

const px = (n: number) => `${n}px`;

/**
 * Her world behind the math: blurred once into a picture (the blur is inside the SVG, never a live CSS filter) on its
 * own layer, still, under a light veil. Behind `.app`, decorative and never in the way of a tap.
 */
export function createWorldBackground(): { el: HTMLElement; update(items: WorldItem[]): void; destroy(): void } {
  const img = el('img', { alt: '', draggable: 'false' });
  const veil = el('div', { class: 'world-veil', 'data-role': 'world-veil' });
  const root = el('div', { class: 'world-bg', 'data-role': 'world-bg', 'aria-hidden': 'true' }, img, veil);
  root.hidden = true;
  let key = '';
  let rev = 0;

  function layout(): void {
    const box = fitFrame(window.innerWidth, window.innerHeight);
    Object.assign(img.style, { left: px(box.left), top: px(box.top), width: px(box.width), height: px(box.height) });
    const horizon = box.top + box.height * HORIZON_Y / AREA_H;
    // Flat sky above the picture, its own sky gradient beside it (no seam on wide screens), flat ground below.
    root.style.background = `linear-gradient(to bottom, ${SKY_TOP} 0px, ${SKY_TOP} ${px(box.top)}, `
      + `${SKY_LOW} ${px(horizon)}, ${GROUND} ${px(horizon)}, ${GROUND} 100%)`;
  }

  function update(items: WorldItem[]): void {
    root.hidden = items.length === 0;
    const next = JSON.stringify(items);
    if (next === key) return;
    key = next;
    img.src = svgDataUri(sceneSvg(items, { blur: 2 }));
    root.dataset.rev = String(++rev);
  }

  window.addEventListener('resize', layout);
  layout();

  return { el: root, update, destroy: () => window.removeEventListener('resize', layout) };
}
