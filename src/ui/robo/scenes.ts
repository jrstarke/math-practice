// Robo's celebrations: one small builder per level-up, 20-star and 100s celebration. Their moves are in scenes.css.
import type { BigMoment, LevelUpStyle, StarStyle } from '../../core/robo';
import { CONGA_LIGHTS, setFigure, paintLight } from './drawing';
import { ROBO_W } from './layout';
import { cheering, div, slot, words } from './pieces';
import type { MomentPlace } from './robo';
import './scenes.css';

export type SceneMoment = Extract<BigMoment, { kind: 'levelUp' | 'stars' | 'conga' }>;
type SceneName = LevelUpStyle | StarStyle | 'conga';

/** How many robot heights tall each scene is. Its robots are drawn lane ÷ ROOM tall, so a scene that goes above
 * Robo's head (a jump, a tower, a ball in the air) still fits inside the lane. */
export const ROOM: Record<SceneName, number> = {
  'high-five': 1, 'jump-together': 1.25, pass: 1.2, dance: 1.1, tower: 1.75, 'keepy-uppy': 1.5, 'light-show': 1,
  header: 1.4, cartwheel: 1.3, walk: 1, 'walk-friend': 1, dribble: 1, hop: 1.25, 'stop-wave': 1, 'ball-ride': 1.35, conga: 1,
};

export const WALK_MS = 4000;
const HIGH_FIVE_MS = 2500;
/** Conga robots stand this many robot widths apart (they overlap a little; their bodies don't touch). */
export const CONGA_SPACING = 0.7;
/** Room the words take beside a walking line: their max width plus the gap. */
export const WALK_WORDS_W = 226;

/** The length of a conga line of full-size robots, words included. */
export function congaLength(robots: number, robotW = ROBO_W): number {
  return robotW * (1 + CONGA_SPACING * (robots - 1)) + WALK_WORDS_W;
}

/** The conga walks at the walk's speed (one Robo and its words cross the screen in 4 s), so a longer line takes longer. */
export function congaMs(robots: number, viewportWidth: number): number {
  return Math.round(WALK_MS * (viewportWidth + congaLength(robots)) / (viewportWidth + congaLength(1)));
}

type Builder = (m: HTMLElement, big: SceneMoment, at: MomentPlace) => number;

function walk(m: HTMLElement, big: SceneMoment): number {
  const walker = div('robo-walker');
  walker.append(slot(cheering(), 'robo-walking'));
  if (m.dataset.moment === 'walk-friend') walker.append(slot(cheering(true), 'robo-walking robo-walking-b'));
  walker.append(words(big.words));
  m.append(walker);
  return WALK_MS;
}

function highFive(m: HTMLElement, big: SceneMoment): number {
  const me = cheering();
  setFigure(me, { arms: 'high-five' });
  const friend = cheering(true);
  setFigure(friend, { arms: 'high-five' });
  m.append(words(big.words), slot(me, 'robo-hf-me'), slot(friend, 'robo-hf-friend'));
  return HIGH_FIVE_MS;
}

/** Robo leads a line of friends across, bobbing with a kick every few steps. Friend k has the k-th colour. */
function conga(m: HTMLElement, big: SceneMoment, at: MomentPlace): number {
  const robots = big.kind === 'conga' ? big.robots : 2;
  const ms = congaMs(robots, at.viewportWidth);
  // Laid out right to left (row-reverse): the words lead, then Robo, then the friends in order.
  const line = div('robo-walker robo-conga');
  line.style.animationDuration = `${ms}ms`;
  line.append(words(big.words), slot(cheering(), 'robo-conga-step'));
  for (let k = 0; k < robots - 1; k++) {
    const f = cheering(true);
    paintLight(f, CONGA_LIGHTS[k % CONGA_LIGHTS.length]);
    line.append(slot(f, 'robo-conga-step'));
  }
  m.append(line);
  return ms;
}

const BUILDERS: Partial<Record<SceneName, Builder>> = {
  walk, 'walk-friend': walk, 'high-five': highFive, conga,
};

/** The scene for a celebration: a .robo-scene with data-moment (the style) and data-room (ROOM). */
export function buildScene(big: SceneMoment, at: MomentPlace): { node: HTMLElement; ms: number } {
  const name: SceneName = big.kind === 'conga' ? 'conga' : big.style;
  const m = div('robo-scene', { 'data-moment': name, 'data-room': String(ROOM[name]) });
  // Until every style has its own scene, the rest borrow the walk (stars) or the high five (level-ups).
  const build = BUILDERS[name] ?? (big.kind === 'levelUp' ? highFive : walk);
  return { node: m, ms: build(m, big, at) };
}
