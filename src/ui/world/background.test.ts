// @vitest-environment jsdom
import type { WorldItem } from '../../core/world';
import css from './world.css?raw';
import { createWorldBackground } from './background';
import { worldFrame } from './frame';

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

test('the picture spans the screen width at the height worldFrame gives, and shows more of the world beside the area, on mount and on resize', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 810 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1080 });
  const bg = createWorldBackground();
  bg.update([tree]);
  expect(img(bg.el).style.width).toBe('810px');
  expect(img(bg.el).style.height).toBe(`${worldFrame(810, 1080).height}px`);
expect(img(bg.el).style.top).toBe(`${worldFrame(810, 1080).top}px`);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1080 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 810 });
  window.dispatchEvent(new Event('resize'));
  expect(img(bg.el).style.width).toBe('1080px'); // the scenery runs to the screen's edges
  expect(img(bg.el).style.left).toBe('0px');
  const f2 = worldFrame(1080, 810);
expect(img(bg.el).style.height).toBe(`${f2.height}px`);
  const view = decodeURIComponent(img(bg.el).src).match(/viewBox="(-?[\d.]+) 0 ([\d.]+) 360"/)!;
  const unit = f2.width / 270;
  expect(Number(view[1])).toBeCloseTo(-f2.left / unit, 5); // x0: the area starts f2.left px in
  expect(Number(view[2])).toBeCloseTo(1080 / unit, 5);
  bg.destroy();
});

describe('coming into focus (a sharp twin that fades in)', () => {
  const sharp = (el: HTMLElement) => el.querySelector<HTMLImageElement>('[data-role="world-sharp"]')!;
  const decode = (i: HTMLImageElement) => decodeURIComponent(i.getAttribute('src')!.slice(i.getAttribute('src')!.indexOf(',') + 1));

  test('focus(true) sets data-focus and the sharp picture is the same world without the blur', () => {
    const bg = createWorldBackground();
    bg.update([tree]);
    expect(bg.el.hasAttribute('data-focus')).toBe(false);
    bg.focus(true);
    expect(bg.el.hasAttribute('data-focus')).toBe(true);
    expect(decode(sharp(bg.el))).toContain('data-kind="tree"');
    expect(decode(sharp(bg.el))).not.toContain('feGaussianBlur');
    expect(svgOf(bg.el)).toContain('feGaussianBlur stdDeviation="2"'); // the blurred one is untouched
    bg.focus(false);
    expect(bg.el.hasAttribute('data-focus')).toBe(false);
    bg.destroy();
  });

  test('the sharp picture sits exactly where the blurred one does', () => {
    const bg = createWorldBackground();
    bg.update([tree]);
    bg.focus(true);
    for (const side of ['left', 'top', 'width', 'height'] as const) expect(sharp(bg.el).style[side]).toBe(img(bg.el).style[side]);
    bg.destroy();
  });

  test('an item placed while it is in focus shows in the sharp picture', () => {
    const bg = createWorldBackground();
    bg.update([tree]);
    bg.focus(true);
    bg.update([tree, lake]);
    expect(decode(sharp(bg.el))).toContain('data-kind="lake"');
    bg.destroy();
  });

  test('until it is first needed the sharp picture is not drawn', () => {
    const bg = createWorldBackground();
    bg.update([tree]);
    expect(sharp(bg.el).getAttribute('src')).toBeNull();
    bg.destroy();
  });

  test('css: focus fades the sharp picture in and the blurred one and the veil out, with opacity only (no live blur)', () => {
    expect(css).toMatch(/\.world-bg\[data-focus\] \.world-sharp\s*\{[^}]*opacity:\s*1/);
    expect(css).toMatch(/\.world-bg\[data-focus\] \.world-veil\s*\{[^}]*opacity:\s*0/);
    expect(css).toMatch(/\.world-sharp\s*\{[^}]*transition:\s*opacity/);
    expect(css).not.toMatch(/filter:\s*blur/);
  });
});
