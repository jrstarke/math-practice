import './world.css';
import {
  AREA_H, AREA_W, HORIZON_Y, PLACE_PROMPT, pickPrompt, snapPlacement, zoneOf, type WorldItem, type WorldKind,
} from '../../core/world';
import { el } from '../dom';
import { createFigure, setFigure } from '../robo/drawing';
import { fitFrame } from './frame';
import { KIND_NAMES, drawKind } from './kinds';
import { GROUND, SKY_LOW, SKY_TOP, itemScale, sceneSvg, svgDataUri } from './scene';

export const PICK_CHEER_MS = 2500;

export interface PickDeps {
  items: WorldItem[];
  offer: WorldKind[];
  days: number;
  cheer(): string;
  onPlaced(item: WorldItem): void;
  onDone(): void;
}

/** Each kind's drawing (at x 0, y 0, scale 1) fits these viewBoxes, for the tray buttons. */
const ICON_BOX: Record<WorldKind, string> = {
  mountain: '-64 -74 132 78', tree: '-30 -68 60 72', bush: '-32 -32 60 36', house: '-32 -58 64 62', lake: '-46 -17 92 34',
};

const SVG_NS = 'http://www.w3.org/2000/svg';
const px = (n: number) => `${n}px`;

/** The pick: her world full screen, three kinds to choose from, tap where it goes, OK. */
export function createPick(deps: PickDeps): { el: HTMLElement; destroy(): void } {
  const scene = el('img', { class: 'pick-scene', alt: '', draggable: 'false' });
  scene.src = svgDataUri(sceneSvg(deps.items));
  const overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.setAttribute('class', 'pick-overlay');
  overlay.setAttribute('viewBox', `0 0 ${AREA_W} ${AREA_H}`);
  const frame = el('div', { class: 'pick-frame', 'data-role': 'pick-frame' }, scene, overlay);
  const shade = el('div', { class: 'pick-shade' });

  const figure = createFigure();
  setFigure(figure, { light: 'off', mouth: 'flat', look: 'front', arms: 'down' });
  const words = el('div', { class: 'robo-words pick-words', 'data-role': 'pick-words' }, pickPrompt(deps.days));
  const robo = el('div', { class: 'pick-robo' }, el('div', { class: 'pick-figure' }, figure), words);

  const kindButtons = deps.offer.map((kind) => {
    const icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('viewBox', ICON_BOX[kind]);
    icon.setAttribute('class', 'pick-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = drawKind(kind, 0, 0, 1);
    return el('button', { type: 'button', class: 'pick-kind', 'data-role': 'pick-kind', 'data-kind': kind },
      icon, el('span', {}, KIND_NAMES[kind]));
  });
  const okButton = el('button', { type: 'button', class: 'pick-ok', 'data-role': 'pick-ok', disabled: true }, 'OK');
  const tray = el('div', { class: 'pick-tray' }, el('div', { class: 'pick-kinds' }, ...kindButtons), okButton);
  const bottom = el('div', { class: 'pick-bottom' }, robo, tray);

  const root = el('div', { class: 'pick', 'data-role': 'pick', role: 'dialog', 'aria-label': 'Add something to your world' },
    frame, shade, bottom);

  let kind: WorldKind | null = null;
  let spot: { x: number; y: number } | null = null;
  let locked = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let box = fitFrame(window.innerWidth, window.innerHeight);

  function drawGhost(): void {
    overlay.innerHTML = '';
    okButton.disabled = !spot;
    if (!kind || !spot) return;
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-role', 'pick-ghost');
    g.setAttribute('class', 'pick-ghost');
    g.dataset.kind = kind;
    g.dataset.x = String(spot.x);
    g.dataset.y = String(spot.y);
    g.innerHTML = drawKind(kind, spot.x, spot.y, itemScale({ kind, y: spot.y }));
    overlay.append(g);
  }

  /** Dims everything outside the chosen kind's zone (beyond the frame too) and outlines the zone. */
  function drawShade(): void {
    shade.innerHTML = '';
    if (!kind || locked) return;
    const z = zoneOf(kind);
    const sx = box.width / AREA_W, sy = box.height / AREA_H;
    const l = box.left + z.x0 * sx, r = box.left + z.x1 * sx, t = box.top + z.y0 * sy, b = box.top + z.y1 * sy;
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = (role: string, x: number, y: number, w: number, h: number) => {
      const d = el('div', { class: role, 'data-role': role });
      Object.assign(d.style, { left: px(x), top: px(y), width: px(Math.max(0, w)), height: px(Math.max(0, h)) });
      return d;
    };
    shade.append(
      rect('pick-dim', 0, 0, vw, t),
      rect('pick-dim', 0, b, vw, vh - b),
      rect('pick-dim', 0, t, l, b - t),
      rect('pick-dim', r, t, vw - r, b - t),
      rect('pick-zone', l, t, r - l, b - t),
    );
  }

  function layout(): void {
    // The world fits in the space above the tray strip (Robo, its words and the choices), standing on it, so all of
    // the ground she can place on is visible and tappable.
    const above = Math.max(0, window.innerHeight - bottom.offsetHeight);
    const fit = fitFrame(window.innerWidth, above);
    box = { ...fit, top: above - fit.height };
    Object.assign(frame.style, { left: px(box.left), top: px(box.top), width: px(box.width), height: px(box.height) });
    const horizon = box.top + box.height * HORIZON_Y / AREA_H;
    // Flat sky above the frame, the frame's own sky gradient beside it (no seam in landscape), flat ground below.
    root.style.background = `linear-gradient(to bottom, ${SKY_TOP} 0px, ${SKY_TOP} ${px(box.top)}, `
      + `${SKY_LOW} ${px(horizon)}, ${GROUND} ${px(horizon)}, ${GROUND} 100%)`;
    drawShade();
  }

  function choose(next: WorldKind): void {
    kind = next;
    for (const b of kindButtons) b.toggleAttribute('data-selected', b.dataset.kind === next);
    words.textContent = PLACE_PROMPT;
    if (spot) spot = snapPlacement(next, spot.x, spot.y);
    drawGhost();
    drawShade();
  }

  function tap(clientX: number, clientY: number): void {
    if (!kind) return;
    const r = frame.getBoundingClientRect();
    const x = (clientX - r.left) / r.width * AREA_W, y = (clientY - r.top) / r.height * AREA_H;
    const s = snapPlacement(kind, x, y);
    if (!s) return;
    spot = s;
    drawGhost();
  }

  function ok(): void {
    if (!kind || !spot) return;
    locked = true;
    const item: WorldItem = { kind, area: 0, x: spot.x, y: spot.y };
    deps.onPlaced(item);
    root.dataset.locked = '';
    for (const b of kindButtons) b.disabled = true;
    okButton.disabled = true;
    shade.innerHTML = '';
    overlay.innerHTML = '';
    scene.src = svgDataUri(sceneSvg([...deps.items, item]));
    frame.dataset.placed = kind;
    setFigure(figure, { light: 'green', mouth: 'smile', arms: 'up' });
    words.textContent = deps.cheer();
    timer = setTimeout(() => { timer = null; deps.onDone(); }, PICK_CHEER_MS);
  }

  function onPointerDown(e: Event): void {
    if (locked) return;
    const target = e.target as Element | null;
    if (!target?.closest) return;
    const k = target.closest<HTMLElement>('[data-role="pick-kind"]');
    if (k) { choose(k.dataset.kind as WorldKind); return; }
    if (target.closest('[data-role="pick-ok"]')) { ok(); return; }
    if (target.closest('[data-role="pick-frame"]')) {
      const p = e as PointerEvent;
      tap(p.clientX, p.clientY);
    }
  }

  root.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', layout);
  // The strip's height is only known once it's in the document (and changes if its words wrap differently).
  const strip = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => layout());
  strip?.observe(bottom);
  layout();

  return {
    el: root,
    destroy() {
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', layout);
      strip?.disconnect();
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
