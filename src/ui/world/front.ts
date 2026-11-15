import './world.css';
import type { WorldItem } from '../../core/world';
import { el } from '../dom';
import { worldFrame } from './frame';
import { frontSvg, sceneExtent, svgDataUri } from './scene';

const px = (n: number) => `${n}px`;

/**
 * The things nearer than Robo's feet, drawn again over him during a world celebration: a transparent picture laid exactly
 * on the sharp world (same box, same extent), so they line up with the scene and he stands among them. Never takes a tap.
 */
export function createWorldFront(): { el: HTMLElement; show(items: WorldItem[], feetY: number): void; hide(): void; destroy(): void } {
  const img = el('img', { class: 'world-front', 'data-role': 'world-front', alt: '', 'aria-hidden': 'true', draggable: 'false' });
  img.hidden = true;
  let shown: { items: WorldItem[]; feetY: number } | null = null;

  function draw(): void {
    if (!shown) return;
    const box = worldFrame(window.innerWidth, window.innerHeight);
    const s = sceneExtent(box.left, box.width, window.innerWidth);
    Object.assign(img.style, { left: px(s.left + box.left), top: px(box.top), width: px(s.width), height: px(box.height) });
    img.src = svgDataUri(frontSvg(shown.items, shown.feetY, { extent: s.extent }));
  }

  function show(items: WorldItem[], feetY: number): void {
    shown = { items, feetY };
    draw();
    img.hidden = false;
  }

  function hide(): void {
    shown = null;
    img.hidden = true;
  }

  return { el: img, show, hide, destroy: hide };
}
