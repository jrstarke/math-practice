import { AREA_H, AREA_W, HORIZON_Y, depthScale, type WorldItem } from '../../core/world';
import { OUTLINE, drawHill, drawKind } from './kinds';

export const SKY_TOP = '#bfe6ff', SKY_LOW = '#eaf7ff', GROUND = '#d8efc4';

export const svgDataUri = (svg: string): string => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/** How big a placed thing is drawn: mountains all stand on the horizon at one size, the rest by depth. */
export const itemScale = (item: Pick<WorldItem, 'kind' | 'y'>): number => item.kind === 'mountain' ? 0.9 : depthScale(item.y);

const tag = (g: string, item: WorldItem) => g.replace('<g ', `<g data-kind="${item.kind}" data-y="${item.y}" `);

/** The starting hills: one set fits inside an area (x 0..270, none cut off), and the set repeats beyond it so the hills run to the screen's edges. */
const HILLS = [[52, 48, 9, '#c4e3ad'], [150, 70, 11, '#b5dc9c'], [232, 36, 8, '#c4e3ad']] as const;
function hillsAcross(x0: number, x1: number): string {
  let out = '';
  for (let k = Math.floor(x0 / AREA_W) - 1; k <= Math.ceil(x1 / AREA_W); k++) {
    for (const [x, w, h, c] of HILLS) {
      if (k * AREA_W + x + w > x0 && k * AREA_W + x - w < x1) out += drawHill(k * AREA_W + x, HORIZON_Y, w, h, c);
    }
  }
  return out;
}

/**
 * The whole world as one SVG string. With `blur` the land is blurred inside the SVG itself. `extent` is the stretch of
 * world x it shows (default: one area, 0..270): wider, the sky, ground and hills simply carry on past the area's sides.
 */
export function sceneSvg(items: WorldItem[], opts: { blur?: number; extent?: { x0: number; x1: number } } = {}): string {
  const { x0, x1 } = opts.extent ?? { x0: 0, x1: AREA_W };
  const span = x1 - x0;
  const sorted = items.map((it, i) => ({ it, i })).sort((a, b) => a.it.y - b.it.y || a.i - b.i).map((e) => e.it);
  const mountains = sorted.filter((i) => i.kind === 'mountain').map((i) => tag(drawKind('mountain', i.x, HORIZON_Y, itemScale(i)), i));
  const rest = sorted.filter((i) => i.kind !== 'mountain').map((i) => tag(drawKind(i.kind, i.x, i.y, itemScale(i)), i));
  const land = `<rect x="${x0}" width="${span}" height="${HORIZON_Y}" fill="url(#sky)"/>`
    + `<rect x="${x0}" y="${HORIZON_Y}" width="${span}" height="${AREA_H - HORIZON_Y}" fill="${GROUND}"/>`
    + `<circle cx="226" cy="26" r="15" fill="#ffe27a" ${OUTLINE}/>`
    + mountains.join('')
    + hillsAcross(x0, x1)
    + rest.join('');
  const blur = opts.blur;
  const filter = blur ? `<filter id="bl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${blur}"/></filter>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 0 ${span} ${AREA_H}" preserveAspectRatio="xMidYMid slice">`
    + `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY_TOP}"/><stop offset="1" stop-color="${SKY_LOW}"/></linearGradient>${filter}</defs>`
    + (blur ? `<g filter="url(#bl)">${land}</g>` : land) + '</svg>';
}

/**
 * Where the scene picture goes so the area lands exactly in its frame and the scenery runs the full width of the screen:
 * the picture's left offset from the frame (≤ 0), its width, and the world x it shows. All in px, from the frame's box.
 */
export function sceneExtent(frameLeft: number, frameWidth: number, screenWidth: number): { left: number; width: number; extent: { x0: number; x1: number } } {
  const unit = frameWidth / AREA_W;
  return { left: -frameLeft, width: screenWidth, extent: { x0: 0 - frameLeft / unit, x1: (screenWidth - frameLeft) / unit } };
}

/**
 * Only the things that stand nearer than Robo's feet (y strictly greater than `feetY`, mountains never), drawn exactly
 * as sceneSvg draws them over the same extent, with no sky, ground or hills: a transparent picture to lay over him.
 */
export function frontSvg(items: WorldItem[], feetY: number, opts: { extent: { x0: number; x1: number } }): string {
  const { x0, x1 } = opts.extent;
  const near = items.map((it, i) => ({ it, i })).filter((e) => e.it.kind !== 'mountain' && e.it.y > feetY)
    .sort((a, b) => a.it.y - b.it.y || a.i - b.i).map((e) => tag(drawKind(e.it.kind, e.it.x, e.it.y, itemScale(e.it)), e.it));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} 0 ${x1 - x0} ${AREA_H}" preserveAspectRatio="xMidYMid slice">${near.join('')}</svg>`;
}
