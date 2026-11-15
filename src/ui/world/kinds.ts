import type { WorldKind } from '../../core/world';

export const KIND_NAMES: Record<WorldKind, string> = {
  tree: 'Tree', bush: 'Bush', mountain: 'Mountain', lake: 'Lake', house: 'House',
};

const S = 'stroke="#2b2b2b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const at = (x: number, y: number, s: number, inner: string) => `<g transform="translate(${x} ${y}) scale(${s})">${inner}</g>`;

const SHAPES: Record<WorldKind, string> = {
  mountain: `<path d="M-60 0 L-18 -56 L0 -36 L22 -70 L64 0 Z" fill="#b9b3d6" ${S}/><path d="M22 -70 L12 -54 L22 -50 L30 -58 Z" fill="#fff" ${S}/>`,
  tree: `<path d="M0 0 L0 -26" ${S} fill="none"/><path d="M-20 -22 C-26 -44 -10 -62 0 -60 C12 -64 28 -46 20 -22 Z" fill="#8fd18a" ${S}/>`,
  bush: `<path d="M-22 0 C-30 -18 -10 -26 -2 -20 C6 -30 26 -20 22 0 Z" fill="#7cc47a" ${S}/>`,
  house: `<rect x="-24" y="-38" width="48" height="38" fill="#ffd9a8" ${S}/><path d="M-30 -38 L0 -64 L30 -38 Z" fill="#e88a7a" ${S}/><rect x="-9" y="-28" width="18" height="28" rx="3" fill="#b98a5e" ${S}/><circle cx="4" cy="-14" r="1.5" fill="#2b2b2b"/>`,
  lake: `<ellipse cx="0" cy="0" rx="42" ry="13" fill="#9fd4f2" ${S}/>`,
};

/** One thing in the marker style, standing at (x, y) and scaled by `scale`. */
export const drawKind = (kind: WorldKind, x: number, y: number, scale: number): string => at(x, y, scale, SHAPES[kind]);

/** A rolling hill along the horizon. */
export const drawHill = (x: number, y: number, w: number, h: number, c: string): string =>
  `<path d="M${x - w} ${y} Q${x} ${y - h * 2} ${x + w} ${y} Z" fill="${c}" ${S}/>`;

export const OUTLINE = S;
