import type { BigMoment } from '../../core/robo';
import { AREA_H, AREA_W, robotUnits, type WorldItem } from '../../core/world';
import type { MomentPlace } from '../robo/robo';
import { worldFrame } from './frame';
import { chooseLaneY, chooseSpot } from './spot';

/** Longest a celebration may play in the world (the slides come on top: about 8 s in all). */
export const WORLD_MAX_MS = 6000;
/** Robots never draw shorter than this on a small screen: Robo and his words have to stay readable. */
const MIN_ROBOT_H = 20;

/** The celebrations that play in her world once she has put something in it; level-ups and the kick stay in the strip. */
export function isWorldMoment(big: BigMoment, items: number): boolean {
  return items > 0 && (big.kind === 'stars' || big.kind === 'conga' || big.kind === 'day');
}

export type WorldMomentPlace = MomentPlace & { feetY: number };

/** Where a world moment plays: Robo the size he is in the world at the depth he stands (the conga on the clearest
 * lane, the rest on the emptiest patch of ground), with his feet on that ground. feetY is the world y of his feet. */
export function worldMomentPlace(w: number, h: number, items: readonly WorldItem[], big: BigMoment): WorldMomentPlace {
  const frame = worldFrame(w, h);
  const spot = chooseSpot(items);
  const feetY = big.kind === 'conga' ? chooseLaneY(items) : spot.y;
  const robotH = Math.max(MIN_ROBOT_H, Math.round(robotUnits(feetY) * frame.width / AREA_W));
  const laneTop = Math.round(frame.top + frame.height * feetY / AREA_H - robotH);
  return {
    mode: 'standing', spot: null, laneTop, size: robotH, robotH, centerX: Math.round(frame.left + frame.width * spot.x / AREA_W),
    viewportWidth: w, maxMs: WORLD_MAX_MS, feetY,
    peek: { left: 0, top: 0 }, wordsAt: { x: 0, bottom: 0, width: 0 },
  };
}
