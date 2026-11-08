// Where Robo fits, worked out from measured rectangles (getBoundingClientRect), because iPadOS 15 has no
// container queries. Pure maths, so every case is unit-tested.

export interface Box { left: number; top: number; right: number; bottom: number }
export type RoboMode = 'standing' | 'peek';

export const ROBO_W = 112, ROBO_H = 136, GAP = 12;

/** Standing iff there's ROBO_W + 2*GAP of free width to the right of the controls. */
export function chooseMode(viewportWidth: number, controls: Box): RoboMode {
  return viewportWidth - controls.right >= ROBO_W + 2 * GAP ? 'standing' : 'peek';
}

/** Robo's spot: right of the controls, feet level with their bottom. */
export function spotPosition(controls: Box): { left: number; top: number } {
  return { left: controls.right + GAP, top: controls.bottom - ROBO_H };
}

/**
 * Up beside the problem. `content` is the problem anchor joined with the picture. The content shifts left by
 * `shift` px to make room; null means there's no room, so Robo points from its spot instead.
 */
export function placeUp(stage: Box, content: Box): { shift: number; left: number; top: number } | null {
  const need = ROBO_W + GAP;
  const shift = Math.max(0, need - (stage.right - content.right));
  if (shift > content.left - stage.left) return null;
  let top = content.top;
  if (top + ROBO_H > stage.bottom) top = stage.bottom - ROBO_H;
  if (top < stage.top) return null;
  return { shift, left: content.right - shift + GAP, top };
}

export function union(a: Box, b: Box | null): Box {
  if (!b) return a;
  return {
    left: Math.min(a.left, b.left), top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom),
  };
}

/** Peek: Robo's top-left when popping up centred on the stage, feet on the controls' top edge. */
export function peekPosition(stage: Box, controls: Box): { left: number; top: number } {
  return { left: (stage.left + stage.right) / 2 - ROBO_W / 2, top: controls.top - ROBO_H };
}

/** Walk lane: the row just above the controls. */
export function laneTop(controls: Box): number {
  return controls.top - ROBO_H;
}
