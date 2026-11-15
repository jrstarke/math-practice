// @vitest-environment jsdom
import { STRIP_H, safeBottom, worldFrame } from './frame';

test('safeBottom is 0 where there is no safe area (jsdom)', () => {
  expect(safeBottom()).toBe(0);
});

test('upright iPad: the world sits above the strip, centred, its bottom on the strip', () => {
  const f = worldFrame(810, 1080);
  expect(f.height).toBeCloseTo(1080 - STRIP_H, 0);
  expect(f.width).toBeCloseTo(678, 0);
  expect(f.left).toBeCloseTo(66, 0);
  expect(f.top).toBeCloseTo(0, 0);
});

test('landscape is width-limited: the frame still stands on the strip', () => {
  const f = worldFrame(1080, 740);
  expect(f.top + f.height).toBeCloseTo(740 - STRIP_H, 5);
  expect(f.left + f.width / 2).toBeCloseTo(540, 5);
});

test('a screen shorter than the strip gives an empty frame, not a negative one', () => {
  const f = worldFrame(300, 100);
  expect(f.width).toBe(0);
  expect(f.height).toBe(0);
});
