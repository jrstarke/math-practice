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

export interface PicturePart { label: string; count: number; revealed: boolean }

export interface PictureState {
  totalGroups: number;     // the N in "N groups of G"
  groupSize: number;       // the G in "N groups of G" (e.g. 24, or 3)
  groupsShown: number;     // groups drawn in full so far: grows 0→totalGroups on levels 1–7; 0 or 1 on levels 8–9
  groupsOutlined: number;  // remaining groups shown as labelled outline circles (0 on levels 1–7)
  parts: PicturePart[];    // the one drawn group's breakdown, revealed left-to-right as hints progress
  tally: string[];         // running-total lines under the picture, e.g. ["6 tens = 60"]
}

export interface OpModule {
  matchesLevel(p: Problem): boolean;
  generate(level: number, rng: Rng): Problem;
  targetMs(p: Problem): number;
  maxAnswerLen(p: Problem): number;
  solve(p: Problem): Step[];
}
