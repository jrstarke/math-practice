// @vitest-environment jsdom
import type { BigMoment } from '../../core/robo';
import { worldFrame } from './frame';
import { AREA_H, AREA_W, HOUSE_DOOR_H, depthScale, robotUnits, type WorldItem } from '../../core/world';
import { chooseLaneY, chooseSpot } from './spot';
import { WORLD_MAX_MS, isWorldMoment, worldMomentPlace } from './moment';

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
  const house = (y: number): WorldItem => ({ kind: 'house', area: 0, x: 135, y });
  const frameY = (f: ReturnType<typeof worldFrame>, feetY: number) => f.top + f.height * feetY / AREA_H;

  test('upright iPad: feet on the ground in the frame, robotH from the depth he stands at', () => {
    const p = worldMomentPlace(810, 1080, [], stars);
    const f = worldFrame(810, 1080);
    expect(p.mode).toBe('standing');
    expect(p.spot).toBeNull();
    expect(p.robotH).toBe(Math.round(robotUnits(p.feetY) * f.width / AREA_W));
    expect(p.laneTop + p.size).toBeCloseTo(frameY(f, p.feetY), 0);
    expect(p.viewportWidth).toBe(810);
    expect(p.maxMs).toBe(WORLD_MAX_MS);
    expect(WORLD_MAX_MS).toBe(6000);
  });
  test('a house at the bottom is taller than Robo', () => {
    const p = worldMomentPlace(810, 1080, [house(340)], stars);
    const f = worldFrame(810, 1080);
    expect(p.robotH!).toBeLessThan(HOUSE_DOOR_H * depthScale(340) * f.width / AREA_W);
  });
  test('a phone in landscape: robots stay readable and the lane is inside the screen', () => {
    const p = worldMomentPlace(852, 393, [], stars);
    expect(p.robotH!).toBeGreaterThanOrEqual(20);
    expect(p.laneTop).toBeGreaterThanOrEqual(0);
    expect(p.laneTop + p.size).toBeLessThanOrEqual(393);
  });
  test('the conga walks the clearest lane; the others stand on the emptiest spot', () => {
    const items: WorldItem[] = [house(345), { kind: 'tree', area: 0, x: 60, y: 340 }];
    expect(worldMomentPlace(810, 1080, items, conga).feetY).toBe(chooseLaneY(items));
    expect(worldMomentPlace(810, 1080, items, stars).feetY).toBe(chooseSpot(items).y);
    expect(chooseLaneY(items)).not.toBe(chooseSpot(items).y);
  });
  test('centerX is where the spot is on screen', () => {
    const items: WorldItem[] = [house(345)];
    const f = worldFrame(810, 1080);
    expect(worldMomentPlace(810, 1080, items, day).centerX).toBeCloseTo(f.left + f.width * chooseSpot(items).x / AREA_W, 0);
  });
});
