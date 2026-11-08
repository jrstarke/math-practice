// Where Robo fits, worked out from measured rectangles (getBoundingClientRect), because iPadOS 15 has no
// container queries. Pure maths, so every case is unit-tested.

export interface Box { left: number; top: number; right: number; bottom: number }
export type RoboMode = 'standing' | 'peek';

export const ROBO_W = 112, ROBO_H = 136, GAP = 12;
/** Moments shrink Robo to fit the gap under the problem, but never below this height. */
export const MIN_MOMENT_H = 56;

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

/**
 * How tall Robo is in a moment: full size if the gap between the problem (or picture) and the stage's bottom has
 * room, otherwise shrunk to fit it (phones), keeping 4 px clear of the answer row.
 */
export function momentSize(stageBottom: number, contentBottom: number): number {
  return Math.round(Math.max(MIN_MOMENT_H, Math.min(ROBO_H, stageBottom - contentBottom - 4)));
}

/**
 * Peek: Robo's top-left when popping up from the stage's bottom left corner (clear of the centred text line),
 * `size` tall. The stage, not the controls: in phone landscape the controls are beside the stage.
 */
export function peekPosition(stage: Box, size: number): { left: number; top: number } {
  return { left: stage.left, top: stage.bottom - size };
}

/** Walk lane: the stage's bottom row, just above the controls, `size` tall. */
export function laneTop(stage: Box, size: number): number {
  return stage.bottom - size;
}
