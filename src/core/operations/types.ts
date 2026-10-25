import type { Problem } from '../types';
import type { Rng } from '../rng';

export type Ghost = { column: number; digit: number };

export interface Step {
  column: number | null;
  text: string;
  scratch: Record<number, string>;
  ghosts: Ghost[];
  picture?: PictureState;
  passOnly?: boolean;
}

export interface RevealState {
  column: number | null;
  text: string;
  scratch: Record<number, string>;
  ghosts: Record<number, number>;
  picture?: PictureState;
}

export type PictureState = unknown;

export interface OpModule {
  matchesLevel(p: Problem): boolean;
  generate(level: number, rng: Rng): Problem;
  targetMs(p: Problem): number;
  maxAnswerLen(p: Problem): number;
  solve(p: Problem): Step[];
}
