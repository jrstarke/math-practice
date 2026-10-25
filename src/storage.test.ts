import { defaultProgress } from './core/progress';
import { createStore, LEGACY_STORAGE_KEY, STORAGE_KEY } from './storage';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

const v1 = {
  version: 1,
  addition: { level: 6, window: [1, 0.8, 1], calibrationLeft: 0 },
  subtraction: { level: 5, window: [0.3], calibrationLeft: 0 },
  streak: 58, bestStreak: 61, muted: false, installTipShown: true,
};

test('defaults are v2 with total 0', () => {
  expect(defaultProgress()).toMatchObject({ version: 2, total: 0 });
});

test('v2 is stored under its own key so older builds never read it', () => {
  expect(STORAGE_KEY).toBe('math-practice-progress-v2');
  expect(LEGACY_STORAGE_KEY).toBe('math-practice-progress');
});

test('migrates a realistic v1 record', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual({ ...v1, version: 2, total: 61 });
});

test('migration is stable across reloads before a save, and loading writes nothing', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual(createStore(s).load());
  expect([...s.m.keys()]).toEqual([LEGACY_STORAGE_KEY]);
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
});

test('saving a migrated record writes v2 to the new key and leaves the v1 record for rollback', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  const store = createStore(s);
  store.save({ ...store.load(), streak: 59, bestStreak: 61, total: 62 });
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 2, total: 62, streak: 59 });
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
  expect(createStore(s).load()).toMatchObject({ total: 62, streak: 59 });
});

test('an invalid v2 record falls back to the v1 record rather than defaults', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  s.m.set(STORAGE_KEY, 'not json');
  expect(createStore(s).load()).toEqual({ ...v1, version: 2, total: 61 });
});

test('round-trips', () => {
  const s = mem();
  const p = { ...defaultProgress(), streak: 3, muted: true };
  createStore(s).save(p);
  expect(createStore(s).load()).toEqual(p);
});

test('missing key → defaults', () => expect(createStore(mem()).load()).toEqual(defaultProgress()));

test.each([
  'not json', '{"version":2}', 'null', '[]',
  JSON.stringify({ ...defaultProgress(), addition: { level: 12, window: [], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), addition: { level: 3, window: [2], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), addition: { level: 3, window: [1, 1, 1, 1, 1, 1], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), subtraction: { level: 3.5, window: [], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), subtraction: { level: 3, window: [], calibrationLeft: 11 } }),
  JSON.stringify({ ...defaultProgress(), streak: -1 }),
  JSON.stringify({ ...defaultProgress(), muted: 'yes' }),
  JSON.stringify({ ...defaultProgress(), total: -1 }),
  JSON.stringify({ ...defaultProgress(), total: 1.5 }),
  JSON.stringify({ ...defaultProgress(), total: '3' }),
  JSON.stringify({ ...defaultProgress(), total: undefined }), // v2 without total
  JSON.stringify({ ...v1, addition: { level: 12, window: [], calibrationLeft: 0 } }), // invalid v1 isn't migrated
  JSON.stringify({ ...v1, version: 3 }),
])('invalid stored value %s → defaults', raw => {
  const s = mem();
  s.m.set(STORAGE_KEY, raw);
  expect(createStore(s).load()).toEqual(defaultProgress());
});

test('window containing NaN (stored as null) → defaults', () => {
  const s = mem();
  s.m.set(STORAGE_KEY, JSON.stringify({ ...defaultProgress(), addition: { level: 3, window: [NaN], calibrationLeft: 0 } }));
  expect(createStore(s).load()).toEqual(defaultProgress());
});

test('throwing storage and null storage do not crash', () => {
  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  expect(createStore(bad).load()).toEqual(defaultProgress());
  expect(() => createStore(bad).save(defaultProgress())).not.toThrow();
  const s = createStore(null);
  const p = { ...defaultProgress(), streak: 2 };
  s.save(p);
  expect(s.load()).toEqual(p);
});
