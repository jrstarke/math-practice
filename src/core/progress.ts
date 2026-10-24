import { initialOpState, type OpState } from './adaptive';
import type { Op } from './types';

export interface Progress {
  version: 1;
  addition: OpState;
  subtraction: OpState;
  streak: number;
  bestStreak: number;
  muted: boolean;
  installTipShown: boolean;
}

export function defaultProgress(): Progress {
  return {
    version: 1,
    addition: initialOpState(),
    subtraction: initialOpState(),
    streak: 0,
    bestStreak: 0,
    muted: false,
    installTipShown: false,
  };
}

export function opKey(op: Op): 'addition' | 'subtraction' {
  return op === '+' ? 'addition' : 'subtraction';
}
