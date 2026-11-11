// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { walkWords } from '../../core/robo';
import { CONGA_LIGHTS } from './drawing';
import { createRobo, type MomentPlace, type RoboView } from './robo';
import { buildScene, congaMs, ROOM } from './scenes';

const standing: MomentPlace = { mode: 'standing', spot: { left: 647, top: 932 }, laneTop: 504, size: 136, viewportWidth: 810, peek: { left: 349, top: 504 }, wordsAt: { x: 405, bottom: 188, width: 778 } };
const lights = (n: HTMLElement) => [...n.querySelectorAll<HTMLElement>('.robo-figure')].map(f => f.style.getPropertyValue('--robo-light'));

beforeEach(() => { document.body.innerHTML = ''; });

describe('conga lights', () => {
  it('nine friend colours in a fixed order, none of them red', () => {
    expect(CONGA_LIGHTS).toEqual([
      { light: '#f5c400', glow: '#fff0a8', rays: '#c99a00' },
      { light: '#3d8bff', glow: '#cfe2ff', rays: '#1f5fc4' },
      { light: '#a259ff', glow: '#e6d4ff', rays: '#7339c4' },
      { light: '#ff9a1f', glow: '#ffe0b8', rays: '#c76a00' },
      { light: '#ff6fcf', glow: '#ffd6f1', rays: '#c23d98' },
      { light: '#1fc7b6', glow: '#c4f4ef', rays: '#138c80' },
      { light: '#6fd3ff', glow: '#d9f4ff', rays: '#2f9fcf' },
      { light: '#b6e61e', glow: '#ecfac2', rays: '#7fa30f' },
      { light: '#c9a7ff', glow: '#f0e6ff', rays: '#8f6ad1' },
    ]);
    const all = JSON.stringify(CONGA_LIGHTS);
    expect(all).not.toContain('#ff5a4f');
    expect(all).not.toContain('#d9362b');
  });
});

describe('buildScene', () => {
  it('a 2-robot conga: Robo green first, then the yellow friend, with the words', () => {
    const { node } = buildScene({ kind: 'conga', robots: 2, words: walkWords(100) }, standing);
    expect(node.dataset.moment).toBe('conga');
    expect(lights(node)).toEqual(['#4cd964', '#f5c400']);
    expect(node.querySelector('[data-role="moment-words"]')!.textContent).toBe(walkWords(100));
  });

  it('a 10-robot conga ends with lavender', () => {
    const { node } = buildScene({ kind: 'conga', robots: 10, words: walkWords(900) }, standing);
    const l = lights(node);
    expect(l).toHaveLength(10);
    expect(l[9]).toBe('#c9a7ff');
    expect(node.querySelectorAll('.robo-figure[data-light="green"]')).toHaveLength(10); // glow and rays show
  });

  it('the conga lasts as long as the line takes to pass at walking speed', () => {
    expect(congaMs(2, 810)).toBeGreaterThanOrEqual(3500);
    expect(congaMs(2, 810)).toBeLessThanOrEqual(4500);
    expect(congaMs(10, 810)).toBeLessThanOrEqual(8000);
    for (let n = 2; n < 10; n++) expect(congaMs(n + 1, 810)).toBeGreaterThan(congaMs(n, 810));
    const { node, ms } = buildScene({ kind: 'conga', robots: 5, words: walkWords(400) }, standing);
    expect(ms).toBe(congaMs(5, 810));
    expect(node.querySelector<HTMLElement>('.robo-walker')!.style.animationDuration).toBe(`${ms}ms`);
  });

  it('walk, walk-friend and high five keep their scenes', () => {
    const walk = buildScene({ kind: 'stars', style: 'walk', words: walkWords(40) }, standing);
    expect([walk.node.dataset.moment, walk.node.querySelectorAll('.robo-figure').length, walk.ms]).toEqual(['walk', 1, 4000]);
    const friend = buildScene({ kind: 'stars', style: 'walk-friend', words: walkWords(60) }, standing);
    expect([friend.node.dataset.moment, friend.node.querySelectorAll('.robo-figure').length]).toEqual(['walk-friend', 2]);
    const hf = buildScene({ kind: 'levelUp', style: 'high-five', words: 'High five!' }, standing);
    expect([hf.node.dataset.moment, hf.node.querySelectorAll('.robo-figure').length, hf.ms]).toEqual(['high-five', 2, 2500]);
  });

  it('every scene names its style and carries its room factor', () => {
    const t = buildScene({ kind: 'levelUp', style: 'tower', words: 'Level up!' }, standing).node;
    expect([t.dataset.moment, t.dataset.room]).toEqual(['tower', '1.75']);
    const d = buildScene({ kind: 'stars', style: 'dribble', words: walkWords(80) }, standing).node;
    expect([d.dataset.moment, d.dataset.room]).toEqual(['dribble', String(ROOM.dribble)]);
    expect(Object.values(ROOM).every(r => r >= 1)).toBe(true);
  });
});

describe('room factor in the Robo view', () => {
  let robo: RoboView;
  beforeEach(() => {
    robo = createRobo();
    document.body.append(robo.el, robo.overlay);
  });
  const slots = () => [...robo.overlay.querySelectorAll<HTMLElement>('.robo-slot')];

  it('a tall scene draws its robots smaller so it fits the lane, also after a refit', () => {
    robo.play({ kind: 'levelUp', style: 'tower', words: 'Level up!' }, standing);
    const scene = robo.overlay.querySelector<HTMLElement>('[data-moment]')!;
    expect(scene.style.height).toBe('136px');
    expect(scene.style.getPropertyValue('--a')).toBe('0.571');
    for (const s of slots()) expect([s.style.width, s.style.height]).toEqual(['64px', '78px']);
    robo.refit({ ...standing, size: 68 });
    for (const s of slots()) expect([s.style.width, s.style.height]).toEqual(['32px', '39px']);
    expect(scene.style.getPropertyValue('--a')).toBe('0.286');
  });

  it('a 10-robot conga knows how much to shrink to fit the screen width (used under Reduce Motion)', () => {
    robo.play({ kind: 'conga', robots: 10, words: walkWords(900) }, standing);
    const scene = robo.overlay.querySelector<HTMLElement>('[data-moment]')!;
    const fit = Number(scene.style.getPropertyValue('--fit'));
    expect(fit).toBeGreaterThan(0);
    expect(fit).toBeLessThan(1);
    // 10 robots at 0.7 widths apart plus the words fit in 810 - 32 at that scale.
    expect((112 * (1 + 0.7 * 9) + 226) * fit).toBeLessThanOrEqual(778 + 1);
    robo.play({ kind: 'conga', robots: 2, words: walkWords(100) }, standing);
    expect(robo.overlay.querySelector<HTMLElement>('[data-moment]')!.style.getPropertyValue('--fit')).toBe('1');
  });
});
