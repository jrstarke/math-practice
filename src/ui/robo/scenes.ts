// Robo's celebrations: one small builder per level-up, 20-star and 100s celebration. Their moves are in scenes.css.
import type { BigMoment, LevelUpStyle, StarStyle } from '../../core/robo';
import { CONGA_LIGHTS, setFigure, paintLight } from './drawing';
import { ROBO_W } from './layout';
import { ball, cheering, div, slot, words } from './pieces';
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

/** A scene that stays in the middle of the lane: it fades in and out over `ms` (scenes.css .robo-stay). Its inner
 * moves have the same length written in scenes.css. */
function stay(m: HTMLElement, ms: number): number {
  m.classList.add('robo-stay');
  m.style.animationDuration = `${ms}ms`;
  return ms;
}

/** Words that appear at the scene's payoff (its --payoff in scenes.css), not from the start. */
function laterWords(text: string): HTMLElement {
  const w = words(text);
  w.classList.add('robo-later');
  return w;
}

/** A figure that throws its arms up at the scene's payoff (--payoff). */
function armsUpLater(f: HTMLElement): HTMLElement {
  f.classList.add('robo-arms-later');
  return f;
}

function arms(f: HTMLElement, a: 'up' | 'high-five'): HTMLElement {
  setFigure(f, { arms: a });
  return f;
}

function jumpTogether(m: HTMLElement, big: SceneMoment): number {
  m.append(words(big.words), slot(arms(cheering(), 'up'), 'robo-jt-me'), slot(arms(cheering(true), 'up'), 'robo-jt-friend'));
  return stay(m, 2800);
}

/** Robo kicks (the unlock kick's wind-up) and the ball rolls across to the friend, who jumps for joy. */
function pass(m: HTMLElement, big: SceneMoment): number {
  const kicker = cheering();
  kicker.classList.add('robo-kicking');
  m.append(words(big.words), slot(kicker, 'robo-ps-me'), ball('robo-ps-ball'), slot(armsUpLater(cheering(true)), 'robo-ps-friend'));
  return stay(m, 3200);
}

function dance(m: HTMLElement, big: SceneMoment): number {
  m.append(words(big.words), slot(cheering(), 'robo-dn-me'));
  return stay(m, 3200);
}

/** Two friends side by side; Robo runs in and jumps up to stand on their heads; all arms up, then the words. */
function tower(m: HTMLElement, big: SceneMoment): number {
  m.append(
    laterWords(big.words),
    slot(armsUpLater(cheering(true)), 'robo-tw-a'),
    slot(armsUpLater(cheering(true)), 'robo-tw-b'),
    slot(armsUpLater(cheering()), 'robo-tw-top'),
  );
  return stay(m, 3600);
}

/** Four taps off Robo's foot, then the ball lands on its head: arms up, then the words. */
function keepyUppy(m: HTMLElement, big: SceneMoment): number {
  m.append(laterWords(big.words), slot(armsUpLater(cheering()), 'robo-ku-me'), ball('robo-ku-ball'));
  return stay(m, 3800);
}

/** Robo sways while its light runs green, yellow, blue, purple (scenes.css; never red). */
function lightShow(m: HTMLElement, big: SceneMoment): number {
  m.append(words(big.words), slot(cheering(), 'robo-ls-me'));
  return stay(m, 3200);
}

/** The friend tosses the ball up, Robo heads it into a small net: arms up, then the words. */
function header(m: HTMLElement, big: SceneMoment): number {
  const me = armsUpLater(cheering());
  setFigure(me, { look: 'up' });
  m.append(
    div('robo-goal'), laterWords(big.words),
    slot(arms(cheering(true), 'up'), 'robo-hd-friend'), slot(me, 'robo-hd-me'), ball('robo-hd-ball'),
  );
  return stay(m, 3800);
}

/** Robo cartwheels across the lane twice, arms up like a star, with the words alongside (level-up or 20 stars). */
function cartwheel(m: HTMLElement, big: SceneMoment): number {
  const wheel = div('robo-walker robo-cartwheel');
  wheel.append(slot(arms(cheering(), 'up'), 'robo-cw-me'), words(big.words));
  m.append(wheel);
  return 3600;
}

const BUILDERS: Partial<Record<SceneName, Builder>> = {
  walk, 'walk-friend': walk, 'high-five': highFive, conga,
  'jump-together': jumpTogether, pass, dance, tower, 'keepy-uppy': keepyUppy, 'light-show': lightShow, header, cartwheel,
};

/** The scene for a celebration: a .robo-scene with data-moment (the style) and data-room (ROOM). */
export function buildScene(big: SceneMoment, at: MomentPlace): { node: HTMLElement; ms: number } {
  const name: SceneName = big.kind === 'conga' ? 'conga' : big.style;
  const m = div('robo-scene', { 'data-moment': name, 'data-room': String(ROOM[name]) });
  // Until every style has its own scene, the rest borrow the walk (stars) or the high five (level-ups).
  const build = BUILDERS[name] ?? (big.kind === 'levelUp' ? highFive : walk);
  return { node: m, ms: build(m, big, at) };
}
