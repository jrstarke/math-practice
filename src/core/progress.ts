import { initialOpState, type OpState } from './adaptive';
import type { Op } from './types';

export interface Progress {
  version: 2;
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
    version: 2,
    addition: initialOpState(),
    subtraction: initialOpState(),
    streak: 0,
    bestStreak: 0,
    total: 0,
    muted: false,
    installTipShown: false,
  };
}

export function opKey(op: Op): 'addition' | 'subtraction' {
  return op === '+' ? 'addition' : 'subtraction';
}
