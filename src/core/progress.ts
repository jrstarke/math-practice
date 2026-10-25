import { initialOpState, type OpState } from './adaptive';
import type { Op } from './types';

export type OpKey = 'addition' | 'subtraction' | 'multiplication';

export interface Progress {
  version: 4;
  unlocked: OpKey[]; // operations in the mix; once unlocked, always unlocked
  addition: OpState;
  subtraction: OpState;
  multiplication: OpState;
  streak: number;
  bestStreak: number;
  total: number; // clean answers ever; never resets
  muted: boolean;
  installTipShown: boolean;
}

export function defaultProgress(): Progress {
  return {
    version: 4,
    unlocked: ['addition'],
    addition: initialOpState(),
    subtraction: initialOpState(),
    multiplication: initialOpState(),
    streak: 0,
    bestStreak: 0,
    total: 0,
    muted: false,
    installTipShown: false,
  };
}

const OP_KEY_BY_OP: Record<Op, OpKey> = { '+': 'addition', '-': 'subtraction', '×': 'multiplication' };
const OP_BY_OP_KEY: Record<OpKey, Op> = { addition: '+', subtraction: '-', multiplication: '×' };

export function opKey(op: Op): OpKey {
  return OP_KEY_BY_OP[op];
}

export function opOf(key: OpKey): Op {
  return OP_BY_OP_KEY[key];
}
