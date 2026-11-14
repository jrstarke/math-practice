import './world.css';
import { AREA_H, AREA_W, HORIZON_Y, type WorldItem } from '../../core/world';
import { el } from '../dom';
import { fitFrame } from './frame';
import { GROUND, SKY_LOW, SKY_TOP, sceneExtent, sceneSvg, svgDataUri } from './scene';

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
  let items: WorldItem[] = [];
  let extent = { x0: 0, x1: AREA_W };
  let rev = 0;

  function layout(): void {
    const box = fitFrame(window.innerWidth, window.innerHeight);
    // Wider than the area: the scenery runs to the screen's edges.
    const s = sceneExtent(box.left, box.width, window.innerWidth);
    Object.assign(img.style, { left: px(s.left + box.left), top: px(box.top), width: px(s.width), height: px(box.height) });
    if (s.extent.x0 !== extent.x0 || s.extent.x1 !== extent.x1) { extent = s.extent; draw(); }
    const horizon = box.top + box.height * HORIZON_Y / AREA_H;
    // Flat sky above the picture, its own sky gradient beside it (no seam on wide screens), flat ground below.
    root.style.background = `linear-gradient(to bottom, ${SKY_TOP} 0px, ${SKY_TOP} ${px(box.top)}, `
      + `${SKY_LOW} ${px(horizon)}, ${GROUND} ${px(horizon)}, ${GROUND} 100%)`;
  }

  function draw(): void {
    const next = JSON.stringify([items, extent]);
    if (next === key) return;
    key = next;
    img.src = svgDataUri(sceneSvg(items, { blur: 2, extent }));
    root.dataset.rev = String(++rev);
  }

  function update(next: WorldItem[]): void {
    root.hidden = next.length === 0;
    items = next;
    draw();
  }

  window.addEventListener('resize', layout);
  layout();

  return { el: root, update, destroy: () => window.removeEventListener('resize', layout) };
}
