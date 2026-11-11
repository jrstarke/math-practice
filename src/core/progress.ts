import { initialOpState, type OpState } from './adaptive';
import { initialDayStreak, type DayStreak } from './days';
import type { Op } from './types';

export type OpKey = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface Progress {
  version: 8;
  unlocked: OpKey[]; // operations in the mix; once unlocked, always unlocked
  addition: OpState;
  subtraction: OpState;
  multiplication: OpState;
  division: OpState;
  streak: number;
  bestStreak: number;
  total: number; // clean answers ever; never resets
  muted: boolean;
  installTipShown: boolean;
  /** After an unlock, the next `left` problems are the new operation (saved so a reload doesn't lose it). */
  welcome: { op: OpKey; left: number } | null;
  /** Her days-in-a-row streak (shown only in Robo's words) and her days practised in total (not shown yet). */
  day: DayStreak;
  /** When the app was last hidden (epoch ms), so a reload soon after a short switch isn't a fresh start. */
  hiddenAt: number | null;
}

export function defaultProgress(): Progress {
  return {
    version: 8,
    unlocked: ['addition'],
    addition: initialOpState(),
    subtraction: initialOpState(),
    multiplication: initialOpState(),
    division: initialOpState(),
    streak: 0,
    bestStreak: 0,
    total: 0,
    muted: false,
    installTipShown: false,
    welcome: null,
    day: initialDayStreak(),
    hiddenAt: null,
  };
}

const OP_KEY_BY_OP: Record<Op, OpKey> = { '+': 'addition', '-': 'subtraction', '×': 'multiplication', '÷': 'division' };
const OP_BY_OP_KEY: Record<OpKey, Op> = { addition: '+', subtraction: '-', multiplication: '×', division: '÷' };

export function opKey(op: Op): OpKey {
  return OP_KEY_BY_OP[op];
}

export function opOf(key: OpKey): Op {
  return OP_BY_OP_KEY[key];
}
