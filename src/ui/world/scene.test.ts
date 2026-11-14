// @vitest-environment jsdom
import { KINDS, depthScale, type WorldItem } from '../../core/world';
import { drawKind, KIND_NAMES } from './kinds';
import { sceneSvg, svgDataUri, SKY_TOP, SKY_LOW, GROUND } from './scene';

const parse = (s: string) => new DOMParser().parseFromString(s, 'image/svg+xml');
const it = (kind: WorldItem['kind'], x: number, y: number): WorldItem => ({ kind, area: 0, x, y });
const kindsIn = (s: string) => [...parse(s).querySelectorAll('g[data-kind]')];

test('an empty world still has sky, ground from the horizon, and the sun', () => {
  const d = parse(sceneSvg([]));
  expect(d.querySelector('parsererror')).toBeNull();
  expect(d.documentElement.getAttribute('viewBox')).toBe('0 0 270 360');
  expect(sceneSvg([])).toContain(SKY_TOP);
  expect(sceneSvg([])).toContain(SKY_LOW);
  const ground = [...d.querySelectorAll('rect')].find((r) => r.getAttribute('fill') === GROUND)!;
  expect(ground.getAttribute('y')).toBe('90');
  const sun = d.querySelector('circle')!;
  expect([sun.getAttribute('cx'), sun.getAttribute('cy')]).toEqual(['226', '26']);
});

test('items are drawn far to near, ties keep placement order', () => {
  const g = kindsIn(sceneSvg([it('tree', 50, 300), it('tree', 60, 120), it('bush', 10, 200), it('house', 20, 200)]));
  expect(g.map((e) => e.getAttribute('data-y'))).toEqual(['120', '200', '200', '300']);
  expect(g.map((e) => e.getAttribute('data-kind')).slice(1, 3)).toEqual(['bush', 'house']);
});

test('a placed mountain sits on the horizon at scale .9, behind the hills', () => {
  const svg = sceneSvg([it('tree', 50, 120), it('mountain', 100, 90)]);
  const m = kindsIn(svg).find((e) => e.getAttribute('data-kind') === 'mountain')!;
  expect(m.getAttribute('data-y')).toBe('90');
  expect(m.getAttribute('transform')).toBe('translate(100 90) scale(0.9)');
  expect(svg.indexOf('data-kind="mountain"')).toBeLessThan(svg.indexOf('#c4e3ad'));
  expect(svg.indexOf('data-kind="tree"')).toBeGreaterThan(svg.lastIndexOf('#c4e3ad'));
});

test('item scale grows with y', () => {
  const sc = (s: string) => Number(/scale\(([\d.]+)\)/.exec(s)![1]);
  const [a, b] = kindsIn(sceneSvg([it('tree', 50, 120), it('tree', 50, 300)])).map((e) => sc(e.getAttribute('transform')!));
  expect(a).toBeLessThan(b);
  expect(a).toBeCloseTo(depthScale(120), 3);
});

test('blur is baked in only when asked for', () => {
  const d = parse(sceneSvg([], { blur: 2 }));
  expect(d.querySelector('feGaussianBlur')!.getAttribute('stdDeviation')).toBe('2');
  expect(d.querySelector('g[filter="url(#bl)"]')).not.toBeNull();
  const plain = sceneSvg([]);
  expect(plain).not.toContain('feGaussianBlur');
  expect(plain).not.toContain('filter=');
});

test('svgDataUri round-trips', () => {
  const s = sceneSvg([it('lake', 100, 200)]);
  const u = svgDataUri(s);
  expect(u.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
  expect(decodeURIComponent(u.slice('data:image/svg+xml;charset=utf-8,'.length))).toBe(s);
});

test('all five kinds draw and have names', () => {
  for (const k of KINDS) {
    expect(drawKind(k, 10, 100, 1).length).toBeGreaterThan(20);
    expect(KIND_NAMES[k].length).toBeGreaterThan(0);
  }
  expect(KIND_NAMES.house).toBe('House');
});

test('an empty world has no mountains (she adds those) but keeps its hills', () => {
  const svg = sceneSvg([]);
  expect(svg).not.toContain('data-kind="mountain"');
  expect(kindsIn(svg).filter((e) => e.getAttribute('data-kind') === 'mountain')).toHaveLength(0);
  expect(svg).toContain('#c4e3ad');
});

test('the starting hills sit fully inside the picture, so none is cut off at its edges', () => {
  const hills = [...sceneSvg([]).matchAll(/<path d="M(-?[\d.]+) [\d.]+ Q[\d.]+ [\d.-]+ (-?[\d.]+) [\d.]+ Z" fill="#(?:c4e3ad|b5dc9c)"/g)];
  expect(hills).toHaveLength(3);
  for (const m of hills) {
    expect(Number(m[1])).toBeGreaterThanOrEqual(0);
    expect(Number(m[2])).toBeLessThanOrEqual(270);
  }
});
