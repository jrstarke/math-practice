import { AREA_H, AREA_W } from '../../core/world';

/** The largest 3:4 (area-shaped) box that fits in w×h, centred. */
export function fitFrame(w: number, h: number): { left: number; top: number; width: number; height: number } {
  const width = Math.min(w, h * AREA_W / AREA_H);
  const height = width * AREA_H / AREA_W;
  return { left: (w - width) / 2, top: (h - height) / 2, width, height };
}

/** The pick's bottom strip (Robo, his words and the tray), without the safe area. world.css gives .pick-bottom this height. */
export const STRIP_H = 176;

let probe: HTMLElement | null = null;

/** The bottom safe-area inset in px (the home indicator), 0 where unsupported. */
export function safeBottom(): number {
  if (!probe) {
    probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom, 0px)';
    document.body.append(probe);
  }
  const v = Number.parseFloat(getComputedStyle(probe).paddingBottom);
  return Number.isFinite(v) ? v : 0;
}

/**
 * The world's frame on screen: the area's 3:4 box above the pick's bottom strip, centred, its bottom on the strip.
 * The pick, the blurred background and the world celebrations all use it, so a thing she places is in the same spot
 * everywhere.
 */
export function worldFrame(w: number, h: number): { left: number; top: number; width: number; height: number } {
  const above = Math.max(0, h - STRIP_H - safeBottom());
  const f = fitFrame(w, above);
  return { ...f, top: above - f.height };
}
