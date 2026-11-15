// @vitest-environment jsdom
import type { BigMoment } from '../../core/robo';
import { worldFrame } from './frame';
import { WORLD_FEET_Y, WORLD_LANE_H, WORLD_MAX_MS, isWorldMoment, worldMomentPlace } from './moment';

const stars: BigMoment = { kind: 'stars', style: 'walk', words: 'x' };
const conga: BigMoment = { kind: 'conga', robots: 3, words: 'x' };
const day: BigMoment = { kind: 'day', days: 3, tier: 'arms', words: 'x' };
const levelUp: BigMoment = { kind: 'levelUp', style: 'dance', words: 'x' };
const kick: BigMoment = { kind: 'kick', words: 'x' };

describe('which moments play in her world', () => {
  test.each([['stars', stars], ['conga', conga], ['day', day]])('%s does, once she has something in it', (_n, big) => {
    expect(isWorldMoment(big, 1)).toBe(true);
    expect(isWorldMoment(big, 5)).toBe(true);
  });
  test.each([['stars', stars], ['conga', conga], ['day', day]])('%s stays in the strip while the world has no items', (_n, big) => {
    expect(isWorldMoment(big, 0)).toBe(false);
  });
  test('level-ups and the unlock kick always stay in the strip', () => {
    expect(isWorldMoment(levelUp, 5)).toBe(false);
    expect(isWorldMoment(kick, 5)).toBe(false);
  });
});

describe('where Robo stands in the world', () => {
  test('upright iPad: a lane a third of the screen tall, feet on the ground in the frame', () => {
    const p = worldMomentPlace(810, 1080);
    const f = worldFrame(810, 1080);
    expect(p.mode).toBe('standing');
    expect(p.spot).toBeNull();
    expect(p.size).toBe(Math.round(1080 * WORLD_LANE_H));
    expect(p.laneTop + p.size).toBeCloseTo(f.top + f.height * WORLD_FEET_Y / 360, 0);
    expect(p.viewportWidth).toBe(810);
    expect(p.maxMs).toBe(WORLD_MAX_MS);
    expect(WORLD_MAX_MS).toBe(6000);
  });
  test('a phone in landscape still has the lane inside the screen', () => {
    const p = worldMomentPlace(852, 393);
    expect(p.laneTop).toBeGreaterThanOrEqual(0);
    expect(p.laneTop + p.size).toBeLessThanOrEqual(393);
  });
});
