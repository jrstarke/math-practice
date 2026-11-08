// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { BigMoment } from '../../core/robo';
import { createRobo, MOMENT_MS, type MomentPlace, type RoboView } from './robo';

const standing: MomentPlace = { mode: 'standing', spot: { left: 647, top: 932 }, laneTop: 504, size: 136, viewportWidth: 810, peek: { left: 349, top: 504 }, wordsAt: { x: 405, bottom: 188, width: 778 } };
const peek: MomentPlace = { ...standing, mode: 'peek', spot: null };
const walk: BigMoment = { kind: 'walk', withFriend: false, words: "You've gotten 40 questions right! Keep going!" };
const walk100: BigMoment = { kind: 'walk', withFriend: true, words: "You've gotten 100 questions right! Keep going!" };
const highFive: BigMoment = { kind: 'highFive', words: 'High five!' };
const kick: BigMoment = { kind: 'kick', words: 'New: division!' };

let robo: RoboView;
const figure = () => robo.el.querySelector<HTMLElement>('.robo-figure')!;
const bubble = () => robo.el.querySelector<HTMLElement>('[data-role="robo-bubble"]')!;
const moment = () => robo.overlay.querySelector<HTMLElement>('[data-moment]');

beforeEach(() => {
  document.body.innerHTML = '';
  robo = createRobo();
  document.body.append(robo.el, robo.overlay);
});

describe('Robo view', () => {
  it('think: light off, looking up, nothing said', () => {
    robo.right('You got it!');
    robo.think();
    expect(figure().dataset).toMatchObject({ light: 'off', look: 'up', mouth: 'flat' });
    expect(bubble().textContent).toBe('');
    expect(bubble().classList.contains('empty')).toBe(true);
  });

  it('right with a line says it and smiles green; right with null says nothing', () => {
    robo.right('You got it!');
    expect(figure().dataset).toMatchObject({ light: 'green', mouth: 'smile' });
    expect(bubble().textContent).toBe('You got it!');
    expect(bubble().classList.contains('empty')).toBe(false);
    robo.think();
    robo.right(null);
    expect(figure().dataset.light).toBe('green');
    expect(bubble().textContent).toBe('');
  });

  it('wrong turns red and says the words; calm turns the light off', () => {
    robo.wrong('Not quite — try again!');
    expect(figure().dataset).toMatchObject({ light: 'red', mouth: 'flat' });
    expect(bubble().textContent).toBe('Not quite — try again!');
    robo.calm();
    expect(figure().dataset.light).toBe('off');
    expect(bubble().textContent).toBe('');
  });

  it('calm leaves a green light alone', () => {
    robo.right(null);
    robo.calm();
    expect(figure().dataset.light).toBe('green');
  });

  it('wrong(null) keeps whatever the bubble said', () => {
    robo.right('You got it!');
    robo.wrong(null);
    expect(figure().dataset.light).toBe('red');
    expect(bubble().textContent).toBe('You got it!');
  });

  it('moveTo sets data-place and the fixed position', () => {
    robo.moveTo({ left: 520, top: 210 }, 'up');
    expect(robo.el.dataset.place).toBe('up');
    expect(robo.el.style.left).toBe('520px');
    expect(robo.el.style.top).toBe('210px');
    expect(figure().dataset.arms).toBe('point');
    robo.moveTo({ left: 647, top: 932 }, 'spot');
    expect(robo.el.dataset.place).toBe('spot');
    expect(figure().dataset.arms).toBe('down');
  });

  it('talk switches the talking mouth', () => {
    robo.talk(true);
    expect(figure().dataset.mouth).toBe('talk');
    robo.talk(false);
    expect(figure().dataset.mouth).toBe('flat');
  });

  it('show hides and shows the standing Robo', () => {
    robo.show(false);
    expect(robo.el.hidden).toBe(true);
    robo.show(true);
    expect(robo.el.hidden).toBe(false);
  });

  it('play(walk) in standing mode shows the walk with its words, hides the standing Robo, returns 4000', () => {
    expect(robo.play(walk, standing)).toBe(MOMENT_MS.walk);
    expect(MOMENT_MS.walk).toBe(4000);
    expect(moment()!.dataset.moment).toBe('walk');
    expect(robo.overlay.querySelector('[data-role="moment-words"]')!.textContent).toBe(walk.words);
    expect(robo.overlay.querySelectorAll('.robo-figure')).toHaveLength(1);
    expect(robo.el.hasAttribute('data-away')).toBe(true);
  });

  it('play(walk withFriend) shows two figures', () => {
    robo.play(walk100, standing);
    expect(moment()!.dataset.moment).toBe('walk-friend');
    expect(robo.overlay.querySelectorAll('.robo-figure')).toHaveLength(2);
  });

  it('play(highFive) shows the friend', () => {
    expect(robo.play(highFive, standing)).toBe(MOMENT_MS.highFive);
    expect(moment()!.dataset.moment).toBe('high-five');
    expect(robo.overlay.querySelectorAll('.robo-figure')).toHaveLength(2);
    expect(robo.overlay.querySelector('[data-role="moment-words"]')!.textContent).toBe('High five!');
  });

  it('play(kick) shows a ball', () => {
    expect(robo.play(kick, standing)).toBe(MOMENT_MS.kick);
    expect(moment()!.dataset.moment).toBe('kick');
    expect(robo.overlay.querySelector('.robo-ball')).not.toBeNull();
    expect(robo.overlay.querySelector('[data-role="moment-words"]')!.textContent).toBe('New: division!');
  });

  it('a new moment replaces the one playing', () => {
    robo.play(walk, standing);
    robo.play(kick, standing);
    expect(robo.overlay.querySelectorAll('[data-moment]')).toHaveLength(1);
    expect(moment()!.dataset.moment).toBe('kick');
  });

  it('in peek mode every moment is a peek with the words and no friend', () => {
    for (const big of [walk, walk100, highFive, kick]) {
      expect(robo.play(big, peek)).toBe(MOMENT_MS.peek);
      expect(moment()!.dataset.moment).toBe('peek');
      expect(robo.overlay.querySelectorAll('.robo-figure')).toHaveLength(1);
      expect(robo.overlay.querySelector('[data-role="moment-words"]')!.textContent).toBe(big.words);
      expect(robo.overlay.querySelector<HTMLElement>('.robo-figure')!.dataset).toMatchObject({ light: 'green', arms: 'up' });
    }
  });

  it('in peek mode the words show above the problem, where hints show', () => {
    robo.play(walk, peek);
    const w = robo.overlay.querySelector<HTMLElement>('[data-role="moment-words"]')!;
    expect(w.classList.contains('robo-peek-words')).toBe(true);
    expect([w.style.left, w.style.top, w.style.maxWidth]).toEqual(['405px', '188px', '778px']);
  });

  it('a moment in a short lane shrinks Robo to fit it', () => {
    for (const big of [walk, highFive, kick]) {
      robo.play(big, { ...standing, laneTop: 572, size: 68 });
      const scene = moment()!;
      expect(scene.style.top).toBe('572px');
      expect(scene.style.height).toBe('68px');
      expect(scene.style.getPropertyValue('--s')).toBe('0.5');
      const slot = robo.overlay.querySelector<HTMLElement>('.robo-slot')!;
      expect([slot.style.width, slot.style.height]).toEqual(['56px', '68px']);
    }
    robo.play(walk, { ...peek, size: 68 });
    expect(moment()!.style.height).toBe('68px');
    expect(robo.overlay.querySelector<HTMLElement>('.robo-slot')!.style.width).toBe('56px');
  });

  it('endMoment clears the overlay and brings Robo back', () => {
    robo.play(walk, standing);
    robo.endMoment();
    expect(robo.overlay.childElementCount).toBe(0);
    expect(robo.el.hasAttribute('data-away')).toBe(false);
  });

  it('surprise plays at the spot and endMoment ends it', () => {
    expect(robo.surprise()).toBe(MOMENT_MS.surprise);
    expect(robo.el.dataset.surprise).toMatch(/^(wave|bounce)$/);
    robo.endMoment();
    expect(robo.el.hasAttribute('data-surprise')).toBe(false);
  });

  it('all Robo layers are aria-hidden', () => {
    robo.play(highFive, standing);
    expect(robo.el.getAttribute('aria-hidden')).toBe('true');
    expect(robo.overlay.getAttribute('aria-hidden')).toBe('true');
  });
});
