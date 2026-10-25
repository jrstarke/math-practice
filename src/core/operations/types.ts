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

export interface PicturePart {
  // 'hundreds'/'tens'/'ones' mean place-value blocks (flats/rods/squares)
  // and count is the DIGIT at that place, not the place value — actual
  // block count = count × placeValue(label) (100/10/1). Any other label
  // means count plain unit squares.
  label: string;
  count: number;
  revealed: boolean;
}

export interface PictureState {
  totalGroups: number;     // the N in "N groups of G"
  groupSize: number;       // the G in "N groups of G" (e.g. 24, or 3)
  groupsShown: number;     // levels 1–7: equals totalGroups from the first hint (every group is drawn at once — what grows across hints is tally/parts.revealed, not this count). Levels 8–9: 0 or 1 (the one drawn group).
  groupsOutlined: number;  // remaining groups shown as labelled outline circles (0 on levels 1–7)
  parts: PicturePart[];    // the one drawn group's breakdown, revealed left-to-right as hints progress
  tally: string[];         // running-total lines under the picture, e.g. ["6 tens = 60"]
  highlightGroups?: number; // levels 1–3/6 skip counting: the first n drawn groups are the ones being counted
  highlightPlace?: Place;   // levels 8–9: the place being worked on — that part of the drawn group, and that digit of each outline label
}

export type Place = 'hundreds' | 'tens' | 'ones';

export interface OpModule {
  matchesLevel(p: Problem): boolean;
  generate(level: number, rng: Rng): Problem;
  targetMs(p: Problem): number;
  maxAnswerLen(p: Problem): number;
  solve(p: Problem): Step[];
}
