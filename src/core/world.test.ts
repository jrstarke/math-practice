import { mulberry32 } from './rng';
import { AREA_H, AREA_W, CHEER_LINES, HORIZON_Y, KINDS, PLACE_PROMPT, depthScale, initialWorld, pickCheer, pickPrompt, snapPlacement, zoneOf, isValidWorld, repairWorld, makeOffer, picksOwed, placeItem, type WorldState } from './world';

const empty = initialWorld();

test('constants', () => {
  expect([AREA_W, AREA_H, HORIZON_Y]).toEqual([270, 360, 90]);
  expect(KINDS).toEqual(['tree', 'bush', 'mountain', 'lake', 'house']);
});

test('a pick is owed for every 3 days practised, less the picks used', () => {
  expect(picksOwed(2, empty)).toBe(0);
  expect(picksOwed(3, empty)).toBe(1);
  expect(picksOwed(6, { ...empty, picksUsed: 1 })).toBe(1);
  expect(picksOwed(8, { ...empty, picksUsed: 2 })).toBe(0);
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

test('makeOffer draws from rng exactly three times', () => {
  let n = 0;
  makeOffer(() => { n++; return 0.5; });
  expect(n).toBe(3);
});

test('zones', () => {
  expect(zoneOf('mountain')).toEqual({ x0: 40, x1: 230, y0: 42, y1: 102 });
  expect(zoneOf('tree')).toEqual({ x0: 24, x1: 246, y0: 102, y1: 360 });
  expect(zoneOf('bush')).toEqual(zoneOf('tree'));
  expect(zoneOf('house')).toEqual(zoneOf('tree'));
  expect(zoneOf('lake')).toEqual({ x0: 48, x1: 222, y0: 135, y1: 360 });
});

test('snapPlacement enforces zones and puts mountains on the horizon', () => {
  expect(snapPlacement('mountain', 120, 70)).toEqual({ x: 120, y: 90 });
  expect(snapPlacement('mountain', 120, 200)).toBeNull();
  expect(snapPlacement('tree', 120, 70)).toBeNull();
  expect(snapPlacement('tree', 120, 200)).toEqual({ x: 120, y: 200 });
  expect(snapPlacement('tree', 5, 200)).toBeNull();
  expect(snapPlacement('lake', 120, 110)).toBeNull();
  expect(snapPlacement('lake', 120, 200)).toEqual({ x: 120, y: 200 });
});

test('depthScale grows with y', () => {
  expect(depthScale(90)).toBe(0.4);
  expect(depthScale(360)).toBe(1.15);
  for (let y = 90; y < 360; y += 10) expect(depthScale(y + 10)).toBeGreaterThan(depthScale(y));
});

test('pickCheer never repeats the last line and covers all six', () => {
  expect(CHEER_LINES).toEqual(["That's awesome!", 'That looks great!', 'Cool!', "It's perfect!", 'I love it!', 'Wow!']);
  const seen = new Set<string>();
  let last: string | null = null;
  for (let n = 1; n <= 500; n++) {
    const c = pickCheer(last, mulberry32(n));
    expect(c).not.toBe(last);
    seen.add(c);
    last = c;
  }
  expect(seen.size).toBe(6);
});

test('prompts', () => {
  expect(pickPrompt(3)).toBe("3 days of math! Let's add something to our world!");
  expect(PLACE_PROMPT).toBe('Tap where it goes!');
});

test.each(KINDS)('%s: a non-finite tap is no placement', (kind) => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    expect(snapPlacement(kind, bad, 150)).toBeNull();
    expect(snapPlacement(kind, 100, bad)).toBeNull();
  }
});

test('repairWorld nulls a bad offer, leaves a good one, and never touches the rest', () => {
  const w = { items: [], picksUsed: 1, offer: ['tree', 'tree', 'bush'] };
  expect(repairWorld(w)).toEqual({ ...w, offer: null });
  const good = { items: [], picksUsed: 1, offer: ['tree', 'bush', 'house'] };
  expect(repairWorld(good)).toBe(good);
  expect(repairWorld(null)).toBeNull();
  expect(repairWorld({ ...w, items: null })).toEqual({ ...w, items: null, offer: null });
});
