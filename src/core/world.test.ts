import { mulberry32 } from './rng';
import { AREA_H, AREA_W, HORIZON_Y, KINDS, initialWorld, isValidWorld, makeOffer, picksOwed, placeItem, type WorldState } from './world';

const empty = initialWorld();

test('constants', () => {
  expect([AREA_W, AREA_H, HORIZON_Y]).toEqual([270, 360, 90]);
  expect(KINDS).toEqual(['tree', 'bush', 'mountain', 'lake', 'house']);
});

test('a pick is owed for every 5 days practised, less the picks used', () => {
  expect(picksOwed(4, empty)).toBe(0);
  expect(picksOwed(5, empty)).toBe(1);
  expect(picksOwed(10, { ...empty, picksUsed: 1 })).toBe(1);
  expect(picksOwed(9, { ...empty, picksUsed: 1 })).toBe(0);
});

test('an offer is 3 distinct valid kinds, and every kind shows up over many seeds', () => {
  const seen = new Set<string>();
  for (let n = 1; n <= 200; n++) {
    const offer = makeOffer(mulberry32(n));
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    for (const k of offer) { expect(KINDS).toContain(k); seen.add(k); }
  }
  expect(seen.size).toBe(KINDS.length);
});

test('placing an item adds it, uses a pick and clears the offer, without mutating the input', () => {
  const w: WorldState = { items: [], picksUsed: 2, offer: ['tree', 'bush', 'lake'] };
  const copy = structuredClone(w);
  const out = placeItem(w, { kind: 'tree', area: 0, x: 10, y: 100 });
  expect(out).toEqual({ items: [{ kind: 'tree', area: 0, x: 10, y: 100 }], picksUsed: 3, offer: null });
  expect(w).toEqual(copy);
});

test('a good world is valid', () => {
  expect(isValidWorld(initialWorld())).toBe(true);
  expect(isValidWorld({ items: [{ kind: 'mountain', area: 0, x: 270, y: 90 }, { kind: 'lake', area: 0, x: 0, y: 360 }], picksUsed: 2, offer: ['tree', 'bush', 'house'] })).toBe(true);
});

const item = (o: object) => ({ kind: 'tree', area: 0, x: 50, y: 150, ...o });
test.each([
  ['unknown kind', { ...empty, items: [item({ kind: 'dragon' })] }],
  ['mountain below the horizon', { ...empty, items: [item({ kind: 'mountain', y: 120 })] }],
  ['y above the horizon', { ...empty, items: [item({ y: 89 })] }],
  ['y below the area', { ...empty, items: [item({ y: 361 })] }],
  ['x out of range', { ...empty, items: [item({ x: -1 })] }],
  ['bad area', { ...empty, items: [item({ area: -1 })] }],
  ['two-kind offer', { ...empty, offer: ['tree', 'bush'] }],
  ['duplicate offer', { ...empty, offer: ['tree', 'tree', 'bush'] }],
  ['unknown kind in offer', { ...empty, offer: ['tree', 'bush', 'dragon'] }],
  ['negative picksUsed', { ...empty, picksUsed: -1 }],
  ['fractional picksUsed', { ...empty, picksUsed: 1.5 }],
  ['items not an array', { ...empty, items: null }],
  ['not an object', null],
])('rejects %s', (_, w) => expect(isValidWorld(w)).toBe(false));
