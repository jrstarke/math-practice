// @vitest-environment jsdom
import type { WorldItem } from '../../core/world';
import css from './world.css?raw';
import { createWorldBackground } from './background';
import { createWorldFront } from './front';

const tree: WorldItem = { kind: 'tree', area: 0, x: 100, y: 300 };

test('hidden until shown; show gives it a picture, hide hides it again', () => {
  const f = createWorldFront();
  expect(f.el.dataset.role).toBe('world-front');
  expect(f.el.hidden).toBe(true);
  f.show([tree], 200);
  expect(f.el.hidden).toBe(false);
  expect(f.el.getAttribute('src')!.startsWith('data:image/svg+xml')).toBe(true);
  expect(decodeURIComponent(f.el.getAttribute('src')!)).toContain('data-kind="tree"');
  f.hide();
  expect(f.el.hidden).toBe(true);
  f.destroy();
});

test('its box is the sharp twin\'s', () => {
  const bg = createWorldBackground();
  bg.update([tree]);
  const sharp = bg.el.querySelector<HTMLImageElement>('[data-role="world-sharp"]')!;
  const f = createWorldFront();
  f.show([tree], 200);
  for (const side of ['left', 'top', 'width', 'height'] as const) {
    expect(f.el.style[side]).not.toBe('');
    expect(f.el.style[side]).toBe(sharp.style[side]);
  }
});

test('css: fixed, takes no taps, above Robo\'s moment layer (5) and below the skip button', () => {
  const rule = css.match(/\.world-front\s*\{([^}]*)\}/)![1];
  expect(rule).toMatch(/position:\s*fixed/);
  expect(rule).toMatch(/pointer-events:\s*none/);
  const z = (sel: string) => Number(css.match(new RegExp('\\' + sel + '\\s*\\{[^}]*z-index:\\s*(\\d+)'))![1]);
  expect(z('.world-front')).toBeGreaterThan(5);
  expect(z('.world-skip')).toBeGreaterThan(z('.world-front'));
});
