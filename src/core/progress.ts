import { initialOpState, type OpState } from './adaptive';
import type { Op } from './types';

export type OpKey = 'addition' | 'subtraction';

export interface Progress {
  version: 3;
  unlocked: OpKey[]; // operations in the mix; once unlocked, always unlocked
  addition: OpState;
  subtraction: OpState;
  streak: number;
  bestStreak: number;
  total: number; // clean answers ever; never resets
  muted: boolean;
  installTipShown: boolean;
}

export function defaultProgress(): Progress {
  return {
    version: 3,
    unlocked: ['addition'],
    addition: initialOpState(),
    subtraction: initialOpState(),
    streak: 0,
    bestStreak: 0,
    total: 0,
    muted: false,
    installTipShown: false,
  };
}

export function opKey(op: Op): OpKey {
  return op === '+' ? 'addition' : 'subtraction';
}
