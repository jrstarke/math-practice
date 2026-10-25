import type { Problem } from './types';
import { OPS } from './operations/registry';
import type { Ghost, Step, RevealState } from './operations/types';

// Re-export for backward compatibility
export type { Ghost, Step, RevealState };

/** Column-by-column worked solution used for hints and Pass (spec §8). */
export function solve(p: Problem): Step[] {
  return OPS[p.op].solve(p);
}

/** Merge the first `count` steps into what should currently be on screen. */
export function revealState(steps: Step[], count: number): RevealState {
  const shown = steps.slice(0, Math.min(count, steps.length));
  const state: RevealState = { column: null, text: '', scratch: {}, ghosts: {} };
  for (const s of shown) {
    state.column = s.column;
    state.text = s.text;
    Object.assign(state.scratch, s.scratch);
    for (const g of s.ghosts) state.ghosts[g.column] = g.digit;
    if (s.picture) state.picture = s.picture;
  }
  return state;
}

/** Return the number of steps to show before reaching a pass-only step (or the end). */
export function hintLimit(steps: Step[]): number {
  const i = steps.findIndex(s => s.passOnly);
  return i === -1 ? steps.length : i;
}
