// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BigMoment } from '../../core/robo';
import { createSparkles, sparkleCircle, wantsSparkles } from './sparkles';

afterEach(() => { vi.unstubAllGlobals(); });
const reduce = (on: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), media: q }));
const stars = () => [...createSparkles().el.children];

describe('createSparkles', () => {
  it('play adds 10 stars on a circle of radius r around (x, y); stop removes them', () => {
    reduce(false);
    const s = createSparkles();
    s.play({ x: 200, y: 300, r: 60 }, 3000);
    const kids = [...s.el.children] as HTMLElement[];
    expect(kids).toHaveLength(10);
    for (const k of kids) {
      expect(k.querySelector('svg')).not.toBeNull();
      const d = Math.hypot(parseFloat(k.style.left) - 200, parseFloat(k.style.top) - 300);
      expect(d).toBeLessThanOrEqual(60.5);
      expect(d).toBeGreaterThan(59);
      expect(k.classList.contains('sparkle-go')).toBe(true);
    }
    s.stop();
    expect(s.el.children).toHaveLength(0);
    expect(stars()).toHaveLength(0);
  });
  it('under Reduce Motion the stars are still: data-still and no animation class', () => {
    reduce(true);
    const s = createSparkles();
    s.play({ x: 0, y: 0, r: 20 }, 1000);
    const kids = [...s.el.children] as HTMLElement[];
    expect(kids).toHaveLength(10);
    for (const k of kids) {
      expect(k.hasAttribute('data-still')).toBe(true);
      expect(k.classList.contains('sparkle-go')).toBe(false);
    }
  });
  it('a second play replaces the first', () => {
    reduce(false);
    const s = createSparkles();
    s.play({ x: 0, y: 0, r: 20 }, 1000);
    s.play({ x: 0, y: 0, r: 20 }, 1000);
    expect(s.el.children).toHaveLength(10);
  });
});

describe('sparkleCircle', () => {
  it('is centred on Robo\'s middle, 3 robot heights out', () => {
    expect(sparkleCircle({ centerX: 300, laneTop: 100, size: 40, robotH: 40 })).toEqual({ x: 300, y: 120, r: 120 });
  });
});

describe('wantsSparkles', () => {
  const day = (tier: 'wave' | 'arms' | 'jump' | 'fireworks'): BigMoment => ({ kind: 'day', days: 3, tier, words: 'x' });
  it('stars, conga and the day at wave/arms/jump; not fireworks', () => {
    expect(wantsSparkles({ kind: 'stars', style: 'walk', words: 'x' })).toBe(true);
    expect(wantsSparkles({ kind: 'conga', robots: 4, words: 'x' })).toBe(true);
    for (const t of ['wave', 'arms', 'jump'] as const) expect(wantsSparkles(day(t))).toBe(true);
    expect(wantsSparkles(day('fireworks'))).toBe(false);
  });
});
