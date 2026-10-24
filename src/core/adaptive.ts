import { MAX_LEVEL, MIN_LEVEL } from './levels';
import type { Rng } from './rng';

export interface OpState { level: number; window: number[]; calibrationLeft: number }
export type LevelChange = -1 | 0 | 1;

const WINDOW = 5;
const CALIBRATION_PROBLEMS = 10;
const MISS = 0.3;

export function initialOpState(): OpState {
  return { level: 4, window: [], calibrationLeft: CALIBRATION_PROBLEMS };
}

/** Feed one current-level score into the ladder (spec §5). */
export function update(s: OpState, score: number): { state: OpState; change: LevelChange } {
  const window = [...s.window, score].slice(-WINDOW);
  const lastTwo = window.slice(-2);
  const twoMisses = lastTwo.length === 2 && lastTwo.every(x => x <= MISS);

  let change: LevelChange = 0;
  if (s.calibrationLeft > 0) {
    if (lastTwo.length === 2 && lastTwo.every(x => x === 1)) change = 1;
    else if (score <= MISS) change = -1;
  } else {
    const mean = window.reduce((x, y) => x + y, 0) / window.length;
    if (window.length === WINDOW && mean >= 0.8) change = 1;
    else if (twoMisses) change = -1;
  }

  const level = s.level + change;
  if (level < MIN_LEVEL || level > MAX_LEVEL) change = 0;
  const calibrationLeft = Math.max(0, s.calibrationLeft - 1);
  return change === 0
    ? { state: { level: s.level, window, calibrationLeft }, change }
    : { state: { level: s.level + change, window: [], calibrationLeft }, change };
}

/** Choose a level for the next problem: 70% current, 20% below, 10% above. */
export function pickLevel(s: OpState, rng: Rng): number {
  if (s.calibrationLeft > 0) return s.level;
  const r = rng();
  const level = r < 0.7 ? s.level : r < 0.9 ? s.level - 1 : s.level + 1;
  return level < MIN_LEVEL || level > MAX_LEVEL ? s.level : level;
}
