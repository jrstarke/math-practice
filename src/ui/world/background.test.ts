// @vitest-environment jsdom
import type { WorldItem } from '../../core/world';
import css from './world.css?raw';
import { createWorldBackground } from './background';

const tree: WorldItem = { kind: 'tree', area: 0, x: 100, y: 200 };
const lake: WorldItem = { kind: 'lake', area: 0, x: 135, y: 300 };
const img = (el: HTMLElement) => el.querySelector<HTMLImageElement>('img')!;
const svgOf = (el: HTMLElement) => {
  const src = img(el).getAttribute('src')!;
  expect(src.startsWith('data:image/svg+xml')).toBe(true);
  return decodeURIComponent(src.slice(src.indexOf(',') + 1));
};

beforeEach(() => { document.body.innerHTML = ''; });

test('hidden with no items, decorative and out of the way of taps', () => {
  const bg = createWorldBackground();
  bg.update([]);
  expect(bg.el.dataset.role).toBe('world-bg');
  expect(bg.el.hidden).toBe(true);
  expect(bg.el.getAttribute('aria-hidden')).toBe('true');
  expect(bg.el.classList.contains('world-bg')).toBe(true);
  // Asserted through the class's rule (jsdom doesn't load the stylesheet).
  const rule = css.match(/\.world-bg\s*\{([^}]*)\}/)![1];
  expect(rule).toMatch(/pointer-events:\s*none/);
  expect(rule).toMatch(/position:\s*fixed/);
  expect(rule).toMatch(/z-index:\s*-1/);
  expect(rule).not.toMatch(/display:/); // the hidden attribute must still hide it
  expect(css).toMatch(/\.world-bg img\s*\{[^}]*will-change:\s*transform/);
  expect(css).not.toMatch(/filter:\s*blur/);
});

test('shown with one item: the picture is the world blurred inside the SVG, with a veil over it', () => {
  const bg = createWorldBackground();
  bg.update([tree]);
  expect(bg.el.hidden).toBe(false);
  const svg = svgOf(bg.el);
  expect(svg).toContain('feGaussianBlur stdDeviation="2"');
  expect(svg).toContain('data-kind="tree"');
  expect(img(bg.el).getAttribute('alt')).toBe('');
  const veil = bg.el.querySelector<HTMLElement>('[data-role="world-veil"]')!;
  expect(veil).not.toBeNull();
  expect(css).toMatch(/\.world-veil\s*\{[^}]*rgba\(255,\s*248,\s*236,\s*0?\.15\)/);
});

test("the card (app.ts places it around the problem) is drawn behind it in the card style, only with a world", () => {
  const rule = css.match(/\.world-card\s*\{([^}]*)\}/)![1];
  expect(rule).toMatch(/position:\s*absolute/);
  expect(rule).toMatch(/z-index:\s*-1/);
  expect(rule).toMatch(/pointer-events:\s*none/);
  expect(rule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0?\.92\)/);
  expect(rule).toMatch(/box-shadow:\s*0 3px 0 var\(--key-shadow\)/);
  expect(css).toMatch(/\.app:not\(\[data-world\]\) \.world-card\s*\{\s*display:\s*none/);
  expect(css).toMatch(/\.app\[data-world\] \.problem-area\s*\{[^}]*position:\s*relative[^}]*z-index:\s*0/);
  expect(css).not.toMatch(/problem-area::before/); // not the whole problem area
  expect(css).toMatch(/\.app\[data-world\] \.answer-row \.cell:empty:not\(:first-child\)\s*\{\s*background:\s*#fff3dd/);
});

test('update rebuilds the picture only when the items changed', () => {
  const bg = createWorldBackground();
  bg.update([tree]);
  const rev = bg.el.dataset.rev;
  const src = img(bg.el).getAttribute('src');
  bg.update([{ ...tree }]);
  expect(bg.el.dataset.rev).toBe(rev);
  expect(img(bg.el).getAttribute('src')).toBe(src);
  bg.update([tree, lake]);
  expect(bg.el.dataset.rev).not.toBe(rev);
  expect(svgOf(bg.el)).toContain('data-kind="lake"');
});

test('the picture is sized to the screen by fitFrame, on mount and on resize', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 810 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
  const bg = createWorldBackground();
  bg.update([tree]);
  expect(img(bg.el).style.width).toBe('810px');
  expect(img(bg.el).style.height).toBe('1080px');
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1080 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 810 });
  window.dispatchEvent(new Event('resize'));
  expect(img(bg.el).style.width).toBe('607.5px');
  expect(img(bg.el).style.left).toBe('236.25px');
  bg.destroy();
});
