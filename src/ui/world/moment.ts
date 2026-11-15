import type { BigMoment } from '../../core/robo';
import { AREA_H } from '../../core/world';
import type { MomentPlace } from '../robo/robo';
import { worldFrame } from './frame';

/** The lane's height (Robo's height in a one-robot scene) as a fraction of the screen's height. */
export const WORLD_LANE_H = 0.34;
/** The world y of Robo's feet: near the front of the ground, with a little ground in front of them. */
export const WORLD_FEET_Y = 330;
/** Longest a celebration may play in the world (the slides come on top: about 8 s in all). */
export const WORLD_MAX_MS = 6000;

/** The celebrations that play in her world once she has put something in it; level-ups and the kick stay in the strip. */
export function isWorldMoment(big: BigMoment, items: number): boolean {
  return items > 0 && (big.kind === 'stars' || big.kind === 'conga' || big.kind === 'day');
}

/** Where a world moment plays: the standing scenes, scaled up, with their feet on the world's ground. */
export function worldMomentPlace(w: number, h: number): MomentPlace {
  const frame = worldFrame(w, h);
  const size = Math.round(h * WORLD_LANE_H);
  const laneTop = Math.round(frame.top + frame.height * WORLD_FEET_Y / AREA_H - size);
  return {
    mode: 'standing', spot: null, laneTop, size, viewportWidth: w, maxMs: WORLD_MAX_MS,
    peek: { left: 0, top: 0 }, wordsAt: { x: 0, bottom: 0, width: 0 },
  };
}
