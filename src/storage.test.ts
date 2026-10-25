import { defaultProgress, type OpKey } from './core/progress';
import { createStore, LEGACY_STORAGE_KEY, STORAGE_KEY, V2_STORAGE_KEY, V3_STORAGE_KEY } from './storage';

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
const v2 = { ...v1, version: 2, total: 75 };
const both = ['addition', 'subtraction'];
const initialMultiplication = { level: 1, window: [], calibrationLeft: 10 };

test('defaults are v4 with multiplication unstarted', () => {
  expect(defaultProgress()).toMatchObject({ version: 4, unlocked: ['addition'] });
  expect(defaultProgress().multiplication).toEqual({ level: 1, window: [], calibrationLeft: 10 });
});

test('each version is stored under its own key so older builds never read it', () => {
  expect(STORAGE_KEY).toBe('math-practice-progress-v4');
  expect(V3_STORAGE_KEY).toBe('math-practice-progress-v3');
  expect(V2_STORAGE_KEY).toBe('math-practice-progress-v2');
  expect(LEGACY_STORAGE_KEY).toBe('math-practice-progress');
});

test('migrates a realistic v1 record', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual({ ...v1, version: 4, total: 61, unlocked: both, multiplication: initialMultiplication });
});

test('migrates a v2 record, keeping everything and unlocking both', () => {
  const s = mem();
  s.m.set(V2_STORAGE_KEY, JSON.stringify(v2));
  expect(createStore(s).load()).toEqual({ ...v2, version: 4, unlocked: both, multiplication: initialMultiplication });
});

test('v2 player below the threshold keeps subtraction', () => {
  const s = mem();
  s.m.set(V2_STORAGE_KEY, JSON.stringify({ ...v2, addition: { level: 2, window: [], calibrationLeft: 0 } }));
  expect(createStore(s).load().unlocked).toEqual(both);
});

test('v2 is preferred over v1, and both old keys are left untouched by save', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  s.m.set(V2_STORAGE_KEY, JSON.stringify(v2));
  const store = createStore(s);
  expect(store.load().total).toBe(75);
  store.save(store.load());
  expect(JSON.parse(s.m.get(V2_STORAGE_KEY)!)).toEqual(v2);
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 4, total: 75 });
});

test('migration is stable across reloads before a save, and loading writes nothing', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual(createStore(s).load());
  expect([...s.m.keys()]).toEqual([LEGACY_STORAGE_KEY]);
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
});

test('saving a migrated record writes v4 to the new key and leaves the v1 record for rollback', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  const store = createStore(s);
  store.save({ ...store.load(), streak: 59, bestStreak: 61, total: 62 });
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 4, total: 62, streak: 59 });
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
  expect(createStore(s).load()).toMatchObject({ total: 62, streak: 59 });
});

test('migrates a v3 record, keeping unlocked exactly as-is', () => {
  const s = mem();
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'] };
  delete (v3 as any).multiplication;
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  const loaded = createStore(s).load();
  expect(loaded).toEqual({ ...v3, version: 4, multiplication: { level: 1, window: [], calibrationLeft: 10 } });
});

test('v3 is preferred over v2/v1, and all older keys are left untouched by save', () => {
  const s = mem();
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 90 };
  delete (v3 as any).multiplication;
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  const store = createStore(s);
  store.save(store.load());
  expect(JSON.parse(s.m.get(V3_STORAGE_KEY)!)).toEqual(v3);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 4, total: 90 });
});

test('an invalid v4 record falls back to the older records rather than defaults', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  s.m.set(STORAGE_KEY, 'not json');
  expect(createStore(s).load()).toEqual({ ...v1, version: 4, total: 61, unlocked: both, multiplication: initialMultiplication });
});

test('an invalid v4 record falls back to a valid v3 record rather than defaults', () => {
  const s = mem();
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 42 };
  delete (v3 as any).multiplication;
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  s.m.set(STORAGE_KEY, 'not json');
  expect(createStore(s).load()).toEqual({ ...v3, version: 4, multiplication: initialMultiplication });
});

test('round-trips', () => {
  const s = mem();
  const p = { ...defaultProgress(), streak: 3, muted: true };
  createStore(s).save(p);
  expect(createStore(s).load()).toEqual(p);
});

test('round-trips a record with multiplication unlocked and in progress', () => {
  const s = mem();
  const p = {
    ...defaultProgress(),
    unlocked: ['addition', 'subtraction', 'multiplication'] as OpKey[],
    multiplication: { level: 3, window: [1, 0.5], calibrationLeft: 0 },
  };
  createStore(s).save(p);
  expect(createStore(s).load()).toEqual(p);
});

test('a valid v4 record wins over a valid v3 record', () => {
  const s = mem();
  const v4 = { ...defaultProgress(), total: 5 };
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 99 };
  delete (v3 as any).multiplication;
  s.m.set(STORAGE_KEY, JSON.stringify(v4));
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  expect(createStore(s).load()).toEqual(v4);
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
  JSON.stringify({ ...v1, version: 4 }),
  JSON.stringify({ ...defaultProgress(), unlocked: [] }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['subtraction'] }), // addition missing
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'addition'] }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'division'] }),
  JSON.stringify({ ...defaultProgress(), unlocked: 'addition' }),
  JSON.stringify({ ...defaultProgress(), multiplication: undefined }), // missing multiplication
  JSON.stringify({ ...defaultProgress(), multiplication: { level: 12, window: [], calibrationLeft: 0 } }), // out of range
  JSON.stringify({ ...defaultProgress(), unlocked: ['multiplication'] }), // addition missing
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
