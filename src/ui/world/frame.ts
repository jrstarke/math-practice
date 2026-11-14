import { AREA_H, AREA_W } from '../../core/world';

/** The largest 3:4 (area-shaped) box that fits in w×h, centred. */
export function fitFrame(w: number, h: number): { left: number; top: number; width: number; height: number } {
  const width = Math.min(w, h * AREA_W / AREA_H);
  const height = width * AREA_H / AREA_W;
  return { left: (w - width) / 2, top: (h - height) / 2, width, height };
}
