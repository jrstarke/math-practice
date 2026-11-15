import { depthScale, type WorldItem, type WorldKind } from '../../core/world';

const HALF_WIDTH: Partial<Record<WorldKind, number>> = { house: 26, tree: 20, bush: 22, lake: 42 };
const CENTRE_X = 135;

const solid = (items: readonly WorldItem[]) => items.filter((i) => i.kind !== 'mountain');

/** Where Robo's feet go: the emptiest patch of ground, preferring the nearer (lower) part of it. */
export function chooseSpot(items: readonly WorldItem[]): { x: number; y: number } {
  const obstacles = solid(items);
  let best = { x: CENTRE_X, y: 345 };
  let bestScore = -Infinity;
  let bestOff = Infinity;
  for (let y = 200; y <= 345; y += 10) {
    for (let x = 40; x <= 230; x += 10) {
      let clear = Infinity;
      for (const o of obstacles) {
        const half = (HALF_WIDTH[o.kind] ?? 0) * depthScale(o.y);
        clear = Math.min(clear, Math.hypot(x - o.x, 1.5 * (y - o.y)) - half);
      }
      const score = Math.min(clear, 60) + 0.05 * y;
      const off = Math.abs(x - CENTRE_X);
      if (score > bestScore || (score === bestScore && off < bestOff)) {
        best = { x, y }; bestScore = score; bestOff = off;
      }
    }
  }
  return best;
}

/** The feet y of the clearest horizontal band, for the conga line. */
export function chooseLaneY(items: readonly WorldItem[]): number {
  const obstacles = solid(items);
  let bestY = 345;
  let bestCount = Infinity;
  for (let y = 345; y >= 200; y -= 5) { // larger y first, so ties keep the larger y
    const count = obstacles.filter((o) => Math.abs(o.y - y) < 20).length;
    if (count < bestCount) { bestCount = count; bestY = y; }
  }
  return bestY;
}
