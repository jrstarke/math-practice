import { AREA_H, AREA_W, HORIZON_Y, depthScale, type WorldItem } from '../../core/world';
import { OUTLINE, drawHill, drawKind } from './kinds';

export const SKY_TOP = '#bfe6ff', SKY_LOW = '#eaf7ff', GROUND = '#d8efc4';

export const svgDataUri = (svg: string): string => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/** How big a placed thing is drawn: mountains all stand on the horizon at one size, the rest by depth. */
export const itemScale = (item: Pick<WorldItem, 'kind' | 'y'>): number => item.kind === 'mountain' ? 0.9 : depthScale(item.y);

const tag = (g: string, item: WorldItem) => g.replace('<g ', `<g data-kind="${item.kind}" data-y="${item.y}" `);

/** The whole world as one SVG string. With `blur` the land is blurred inside the SVG itself. */
export function sceneSvg(items: WorldItem[], opts: { blur?: number } = {}): string {
  const sorted = items.map((it, i) => ({ it, i })).sort((a, b) => a.it.y - b.it.y || a.i - b.i).map((e) => e.it);
  const mountains = sorted.filter((i) => i.kind === 'mountain').map((i) => tag(drawKind('mountain', i.x, HORIZON_Y, itemScale(i)), i));
  const rest = sorted.filter((i) => i.kind !== 'mountain').map((i) => tag(drawKind(i.kind, i.x, i.y, itemScale(i)), i));
  const land = `<rect width="${AREA_W}" height="${HORIZON_Y}" fill="url(#sky)"/>`
    + `<rect y="${HORIZON_Y}" width="${AREA_W}" height="${AREA_H - HORIZON_Y}" fill="${GROUND}"/>`
    + `<circle cx="226" cy="26" r="15" fill="#ffe27a" ${OUTLINE}/>`
    + drawKind('mountain', 60, HORIZON_Y, 0.55) + drawKind('mountain', 150, HORIZON_Y, 0.4) + drawKind('mountain', 235, HORIZON_Y, 0.5)
    + mountains.join('')
    + drawHill(30, HORIZON_Y, 70, 9, '#c4e3ad') + drawHill(165, HORIZON_Y, 80, 11, '#b5dc9c') + drawHill(262, HORIZON_Y, 50, 8, '#c4e3ad')
    + rest.join('');
  const blur = opts.blur;
  const filter = blur ? `<filter id="bl" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${blur}"/></filter>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${AREA_W} ${AREA_H}" preserveAspectRatio="xMidYMid slice">`
    + `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY_TOP}"/><stop offset="1" stop-color="${SKY_LOW}"/></linearGradient>${filter}</defs>`
    + (blur ? `<g filter="url(#bl)">${land}</g>` : land) + '</svg>';
}
