import { KINDS, depthScale, zoneOf, type WorldItem, type WorldKind } from '../../core/world';
import { chooseLaneY, chooseSpot } from './spot';

const item = (kind: WorldKind, x: number, y: number): WorldItem => ({ kind, area: 0, x, y });

function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

describe('chooseSpot', () => {
  it('no items -> x within 100..170 and y >= 260', () => {
    const p = chooseSpot([]);
    expect(p.x).toBeGreaterThanOrEqual(100);
    expect(p.x).toBeLessThanOrEqual(170);
    expect(p.y).toBeGreaterThanOrEqual(260);
  });

  it("a house at (150,350) -> the spot is not within the house's footprint", () => {
    const p = chooseSpot([item('house', 150, 350)]);
    expect(Math.abs(p.x - 150) >= 24 + 14 || Math.abs(p.y - 350) >= 20).toBe(true);
  });

  it('a house at the very bottom (y=360) -> spot.y < 360 or |dx| >= 38', () => {
    const p = chooseSpot([item('house', 150, 360)]);
    expect(Math.hypot(p.x - 150, 1.5 * (p.y - 360))).toBeGreaterThanOrEqual(26 * depthScale(360));
  });

  it('the spot is always inside the ground zone', () => {
    const rnd = lcg(7);
    const z = zoneOf('house');
    for (let w = 0; w < 30; w++) {
      const items = Array.from({ length: Math.floor(rnd() * 21) }, () => {
        const kind = KINDS[Math.floor(rnd() * KINDS.length)];
        const zn = zoneOf(kind);
        return item(kind, zn.x0 + rnd() * (zn.x1 - zn.x0), zn.y0 + rnd() * (zn.y1 - zn.y0));
      });
      const p = chooseSpot(items);
      expect(p.x).toBeGreaterThanOrEqual(z.x0);
      expect(p.x).toBeLessThanOrEqual(z.x1);
      expect(p.y).toBeGreaterThanOrEqual(z.y0);
      expect(p.y).toBeLessThanOrEqual(z.y1);
    }
  });

  it('a full world (items on a 20-unit grid across the ground) -> finite x and y inside the zone', () => {
    const z = zoneOf('house');
    const items: WorldItem[] = [];
    for (let x = z.x0; x <= z.x1; x += 20) for (let y = z.y0; y <= z.y1; y += 20) items.push(item('tree', x, y));
    const p = chooseSpot(items);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
    expect(p.x).toBeGreaterThanOrEqual(z.x0);
    expect(p.x).toBeLessThanOrEqual(z.x1);
    expect(p.y).toBeGreaterThanOrEqual(z.y0);
    expect(p.y).toBeLessThanOrEqual(z.y1);
  });

  it('mountains are ignored (a world of only mountains behaves like an empty one)', () => {
    const mountains = [item('mountain', 135, 345), item('mountain', 120, 340)];
    expect(chooseSpot(mountains)).toEqual(chooseSpot([]));
  });
});

describe('chooseLaneY', () => {
  it('returns a y in 200..345, and with a house at (150,300) it is not within 20 of 300', () => {
    const empty = chooseLaneY([]);
    expect(empty).toBeGreaterThanOrEqual(200);
    expect(empty).toBeLessThanOrEqual(345);
    const y = chooseLaneY([item('house', 150, 300)]);
    expect(y).toBeGreaterThanOrEqual(200);
    expect(y).toBeLessThanOrEqual(345);
    expect(Math.abs(y - 300)).toBeGreaterThanOrEqual(20);
  });
});
