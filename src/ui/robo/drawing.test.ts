// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createFigure, LIGHT, setFigure } from './drawing';

const PARTS = ['light', 'glow', 'rays', 'highlight', 'mount', 'body', 'eyes-front', 'eyes-up', 'eyes-side',
  'mouth-flat', 'mouth-smile', 'mouth-talk', 'arm-left', 'arm-right', 'leg-left', 'leg-right'];

describe('Robo drawing', () => {
  it('a new figure starts with the light off, flat mouth, looking ahead, arms down', () => {
    const f = createFigure();
    expect(f.classList.contains('robo-figure')).toBe(true);
    expect(f.dataset).toMatchObject({ light: 'off', mouth: 'flat', look: 'front', arms: 'down' });
  });

  it('the figure has every named part', () => {
    const f = createFigure();
    for (const p of PARTS) expect(f.querySelector(`[data-part="${p}"]`), p).not.toBeNull();
    for (const arm of ['arm-left', 'arm-right']) {
      const poses = [...f.querySelectorAll(`[data-part="${arm}"] [data-pose]`)].map(g => g.getAttribute('data-pose'));
      expect(poses.sort()).toEqual(['down', 'high-five', 'point', 'up']);
    }
  });

  it('setFigure changes only what it is given', () => {
    const f = createFigure();
    setFigure(f, { light: 'green', mouth: 'smile' });
    expect(f.dataset).toMatchObject({ light: 'green', mouth: 'smile', look: 'front', arms: 'down' });
    setFigure(f, { arms: 'point' });
    expect(f.dataset).toMatchObject({ light: 'green', mouth: 'smile', look: 'front', arms: 'point' });
  });

  it('setFigure puts the light colours where the CSS reads them', () => {
    const f = createFigure();
    setFigure(f, { light: 'red' });
    expect(f.style.getPropertyValue('--robo-light')).toBe(LIGHT.red.light);
    expect(f.style.getPropertyValue('--robo-glow')).toBe(LIGHT.red.glow);
    expect(f.style.getPropertyValue('--robo-rays')).toBe(LIGHT.red.rays);
    setFigure(f, { light: 'off' });
    expect(f.style.getPropertyValue('--robo-light')).toBe(LIGHT.off.light);
  });

  it('LIGHT matches the character guide', () => {
    expect(LIGHT.green).toEqual({ light: '#4cd964', glow: '#c8f7c5', rays: '#2fa84f' });
    expect(LIGHT.red).toEqual({ light: '#ff5a4f', glow: '#ffd2cc', rays: '#d9362b' });
    expect(LIGHT.off.light).toBe('#e4e1d8');
    expect(LIGHT.off.glow).toBeNull();
    expect(LIGHT.off.rays).toBeNull();
  });

  it('the figure ignores taps and is hidden from screen readers', () => {
    expect(createFigure().getAttribute('aria-hidden')).toBe('true');
  });
});
