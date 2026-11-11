import { initialDayStreak } from './core/days';
import { defaultProgress, type OpKey } from './core/progress';
import { createStore, LEGACY_STORAGE_KEY, STORAGE_KEY, V2_STORAGE_KEY, V3_STORAGE_KEY, V4_STORAGE_KEY, V5_STORAGE_KEY, V6_STORAGE_KEY } from './storage';

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
const v6Extras = { division: { level: 1, window: [], calibrationLeft: 10 }, welcome: null };
const v7Extras = { day: initialDayStreak(), hiddenAt: null };

test('defaults are v7 with multiplication and division unstarted, no welcome and no days yet', () => {
  expect(defaultProgress()).toMatchObject({ version: 7, unlocked: ['addition'], welcome: null });
  expect(defaultProgress()).toMatchObject({ day: initialDayStreak(), hiddenAt: null });
  expect(defaultProgress().division).toEqual({ level: 1, window: [], calibrationLeft: 10 });
  expect(defaultProgress().multiplication).toEqual({ level: 1, window: [], calibrationLeft: 10 });
});

test('each version is stored under its own key so older builds never read it', () => {
  expect(STORAGE_KEY).toBe('math-practice-progress-v7');
  expect(V6_STORAGE_KEY).toBe('math-practice-progress-v6');
  expect(V5_STORAGE_KEY).toBe('math-practice-progress-v5');
  expect(V4_STORAGE_KEY).toBe('math-practice-progress-v4');
  expect(V3_STORAGE_KEY).toBe('math-practice-progress-v3');
  expect(V2_STORAGE_KEY).toBe('math-practice-progress-v2');
  expect(LEGACY_STORAGE_KEY).toBe('math-practice-progress');
});

test('migrates a realistic v1 record', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual({ ...v1, version: 7, total: 61, unlocked: both, multiplication: initialMultiplication, ...v6Extras, ...v7Extras });
});

test('migrates a v2 record, keeping everything and unlocking both', () => {
  const s = mem();
  s.m.set(V2_STORAGE_KEY, JSON.stringify(v2));
  expect(createStore(s).load()).toEqual({ ...v2, version: 7, unlocked: both, multiplication: initialMultiplication, ...v6Extras, ...v7Extras });
});

test('v2 player below the threshold keeps subtraction', () => {
  const s = mem();
  s.m.set(V2_STORAGE_KEY, JSON.stringify({ ...v2, addition: { level: 1, window: [], calibrationLeft: 0 } }));
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
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 7, total: 75 });
});

test('migration is stable across reloads before a save, and loading writes nothing', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  expect(createStore(s).load()).toEqual(createStore(s).load());
  expect([...s.m.keys()]).toEqual([LEGACY_STORAGE_KEY]);
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
});

test('saving a migrated record writes v5 to the new key and leaves the v1 record for rollback', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  const store = createStore(s);
  store.save({ ...store.load(), streak: 59, bestStreak: 61, total: 62 });
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 7, total: 62, streak: 59 });
  expect(JSON.parse(s.m.get(LEGACY_STORAGE_KEY)!)).toEqual(v1);
  expect(createStore(s).load()).toMatchObject({ total: 62, streak: 59 });
});

test('migrates a v3 record, keeping unlocked exactly as-is', () => {
  const s = mem();
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'] };
  delete (v3 as any).multiplication;
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  const loaded = createStore(s).load();
  expect(loaded).toEqual({ ...v3, version: 7, multiplication: { level: 1, window: [], calibrationLeft: 10 } });
});

test('v3 is preferred over v2/v1, and all older keys are left untouched by save', () => {
  const s = mem();
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 90 };
  delete (v3 as any).multiplication;
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  const store = createStore(s);
  store.save(store.load());
  expect(JSON.parse(s.m.get(V3_STORAGE_KEY)!)).toEqual(v3);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 7, total: 90 });
});

test('an invalid v5 record falls back to the older records rather than defaults', () => {
  const s = mem();
  s.m.set(LEGACY_STORAGE_KEY, JSON.stringify(v1));
  s.m.set(STORAGE_KEY, 'not json');
  expect(createStore(s).load()).toEqual({ ...v1, version: 7, total: 61, unlocked: both, multiplication: initialMultiplication, ...v6Extras, ...v7Extras });
});

test('an invalid v5 record falls back to a valid v3 record rather than defaults', () => {
  const s = mem();
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 42 };
  delete (v3 as any).multiplication;
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  s.m.set(STORAGE_KEY, 'not json');
  expect(createStore(s).load()).toEqual({ ...v3, version: 7, multiplication: initialMultiplication });
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

test('a valid v5 record wins over a valid v3 record', () => {
  const s = mem();
  const v4 = { ...defaultProgress(), total: 5 };
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 99 };
  delete (v3 as any).multiplication;
  s.m.set(STORAGE_KEY, JSON.stringify(v4));
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  expect(createStore(s).load()).toEqual(v4);
});

/** A v4 save from the build where multiplication levels 7-9 were facts 6-9, 2-digit × 2-9, 3-digit × 2-5. */
const v4Record = (multiplication: { level: number; window: number[]; calibrationLeft: number }) => ({
  ...defaultProgress(),
  version: 4,
  unlocked: ['addition', 'subtraction', 'multiplication'],
  addition: { level: 7, window: [1, 0.9], calibrationLeft: 0 },
  subtraction: { level: 6, window: [0.8], calibrationLeft: 0 },
  multiplication,
  streak: 4, bestStreak: 30, total: 210,
});

test.each([
  [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6],
  [7, 7], // facts 6-9 → 2-digit × 2-5: she hasn't met the multi-digit levels yet, so start there
  [8, 7], // 2-digit × 2-9 → 2-digit × 2-5
  [9, 8], // 3-digit × 2-5 → its new home at level 8
])('a v4 multiplication level %i becomes level %i', (from, to) => {
  const s = mem();
  s.m.set(V4_STORAGE_KEY, JSON.stringify(v4Record({ level: from, window: [1, 1, 0.5], calibrationLeft: 3 })));
  expect(createStore(s).load().multiplication.level).toBe(to);
});

test('levels 1-6 keep their window; reordered levels start a fresh window, since its scores were for other problems', () => {
  const load = (level: number) => {
    const s = mem();
    s.m.set(V4_STORAGE_KEY, JSON.stringify(v4Record({ level, window: [1, 1, 0.5], calibrationLeft: 3 })));
    return createStore(s).load().multiplication;
  };
  expect(load(6)).toEqual({ level: 6, window: [1, 1, 0.5], calibrationLeft: 3 });
  for (const level of [7, 8, 9]) expect(load(level)).toMatchObject({ window: [], calibrationLeft: 3 });
});

test('migrates a v4 record, keeping every other field exactly', () => {
  const s = mem();
  const v4 = v4Record({ level: 8, window: [1], calibrationLeft: 0 });
  s.m.set(V4_STORAGE_KEY, JSON.stringify(v4));
  expect(createStore(s).load()).toEqual({ ...v4, version: 7, multiplication: { level: 7, window: [], calibrationLeft: 0 } });
});

test('v4 is preferred over v3, and the v4 key is left untouched by save (safe rollback)', () => {
  const s = mem();
  const v4 = v4Record({ level: 9, window: [], calibrationLeft: 0 });
  const v3 = { ...defaultProgress(), version: 3, unlocked: ['addition', 'subtraction'], total: 99 };
  delete (v3 as any).multiplication;
  s.m.set(V4_STORAGE_KEY, JSON.stringify(v4));
  s.m.set(V3_STORAGE_KEY, JSON.stringify(v3));
  const store = createStore(s);
  store.save(store.load());
  expect(JSON.parse(s.m.get(V4_STORAGE_KEY)!)).toEqual(v4);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 7, total: 210, multiplication: { level: 8 } });
});

test('an invalid v5 record falls back to a valid v4 record rather than defaults', () => {
  const s = mem();
  s.m.set(V4_STORAGE_KEY, JSON.stringify(v4Record({ level: 3, window: [], calibrationLeft: 0 })));
  s.m.set(STORAGE_KEY, 'not json');
  expect(createStore(s).load()).toMatchObject({ version: 7, total: 210, multiplication: { level: 3 } });
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
  JSON.stringify({ ...v1, version: 6 }),
  JSON.stringify({ ...defaultProgress(), unlocked: [] }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['subtraction'] }), // addition missing
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'addition'] }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'fractions'] }),
  JSON.stringify({ ...defaultProgress(), unlocked: 'addition' }),
  JSON.stringify({ ...defaultProgress(), multiplication: undefined }), // missing multiplication
  JSON.stringify({ ...defaultProgress(), multiplication: { level: 12, window: [], calibrationLeft: 0 } }), // out of range
  JSON.stringify({ ...defaultProgress(), unlocked: ['multiplication'] }), // addition missing
  JSON.stringify({ ...defaultProgress(), division: undefined }), // missing division
  JSON.stringify({ ...defaultProgress(), division: { level: 0, window: [], calibrationLeft: 0 } }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'division', 'division'] }),
  JSON.stringify({ ...defaultProgress(), welcome: undefined }), // missing welcome
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'division'], welcome: { op: 'division', left: 4 } }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'division'], welcome: { op: 'division', left: -1 } }),
  JSON.stringify({ ...defaultProgress(), unlocked: ['addition', 'division'], welcome: { op: 'division', left: 1.5 } }),
  JSON.stringify({ ...defaultProgress(), welcome: { op: 'fractions', left: 2 } }),
  JSON.stringify({ ...defaultProgress(), welcome: { op: 'division', left: 2 } }), // welcome op not unlocked
  JSON.stringify({ ...defaultProgress(), welcome: 'division' }),
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

/** A v5 save from the build before division: all three ops unlocked, multiplication mid-ladder. */
const v5Record = {
  version: 5,
  unlocked: ['addition', 'subtraction', 'multiplication'],
  addition: { level: 8, window: [1, 0.9], calibrationLeft: 0 },
  subtraction: { level: 6, window: [0.8], calibrationLeft: 0 },
  multiplication: { level: 4, window: [1, 0.5, 1], calibrationLeft: 0 },
  streak: 2, bestStreak: 41, total: 380, muted: true, installTipShown: true,
};

test('migrates a realistic v5 record, keeping everything and adding division unstarted', () => {
  const s = mem();
  s.m.set(V5_STORAGE_KEY, JSON.stringify(v5Record));
  expect(createStore(s).load()).toEqual({ ...v5Record, version: 7, ...v6Extras, ...v7Extras });
});

test('saving after a v5 upgrade writes only the v6 key and leaves the v5 string byte-identical', () => {
  const s = mem();
  const raw = JSON.stringify(v5Record);
  s.m.set(V5_STORAGE_KEY, raw);
  const store = createStore(s);
  store.save(store.load());
  expect(s.m.get(V5_STORAGE_KEY)).toBe(raw);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 7, total: 380 });
  expect([...s.m.keys()].sort()).toEqual([STORAGE_KEY, V5_STORAGE_KEY].sort());
});

test('an invalid v6 record falls back to a valid v5 record', () => {
  const s = mem();
  s.m.set(V5_STORAGE_KEY, JSON.stringify(v5Record));
  s.m.set(STORAGE_KEY, JSON.stringify({ ...defaultProgress(), welcome: { op: 'division', left: 9 } }));
  expect(createStore(s).load()).toMatchObject({ version: 7, total: 380 });
});

test('round-trips a record with division unlocked and a welcome under way', () => {
  const s = mem();
  const p = {
    ...defaultProgress(),
    unlocked: ['addition', 'subtraction', 'multiplication', 'division'] as OpKey[],
    multiplication: { level: 5, window: [1], calibrationLeft: 0 },
    division: { level: 2, window: [], calibrationLeft: 7 },
    welcome: { op: 'division' as OpKey, left: 2 },
  };
  createStore(s).save(p);
  expect(createStore(s).load()).toEqual(p);
});

/** A v6 save from the build before the day streak. */
const v6Record = { ...v5Record, version: 6, unlocked: ['addition', 'subtraction', 'multiplication', 'division'],
  division: { level: 3, window: [1], calibrationLeft: 0 }, welcome: { op: 'division', left: 1 } };

test('migrates a realistic v6 record, keeping everything and adding no days yet', () => {
  const s = mem();
  s.m.set(V6_STORAGE_KEY, JSON.stringify(v6Record));
  expect(createStore(s).load()).toEqual({ ...v6Record, version: 7, ...v7Extras });
});

test('saving after a v6 upgrade writes only the v7 key and leaves the v6 string byte-identical', () => {
  const s = mem();
  const raw = JSON.stringify(v6Record);
  s.m.set(V6_STORAGE_KEY, raw);
  const store = createStore(s);
  store.save(store.load());
  expect(s.m.get(V6_STORAGE_KEY)).toBe(raw);
  expect(JSON.parse(s.m.get(STORAGE_KEY)!)).toMatchObject({ version: 7, total: 380, day: initialDayStreak() });
  expect([...s.m.keys()].sort()).toEqual([STORAGE_KEY, V6_STORAGE_KEY].sort());
});

test('an invalid v7 record falls back to a valid v6 record', () => {
  const s = mem();
  s.m.set(V6_STORAGE_KEY, JSON.stringify(v6Record));
  s.m.set(STORAGE_KEY, JSON.stringify({ ...defaultProgress(), hiddenAt: 'x' }));
  expect(createStore(s).load()).toMatchObject({ version: 7, total: 380 });
});

test.each([
  { day: { ...initialDayStreak(), date: '2026-13-01x' } },
  { day: { ...initialDayStreak(), lastDone: 20261111 } },
  { day: { ...initialDayStreak(), right: -1 } },
  { day: { ...initialDayStreak(), days: 1.5 } },
  { day: undefined },
  { hiddenAt: 'x' },
  { hiddenAt: undefined },
])('a v7 record with bad day-streak fields is not loaded: %o', bad => {
  const s = mem();
  s.m.set(STORAGE_KEY, JSON.stringify({ ...defaultProgress(), total: 5, ...bad }));
  expect(createStore(s).load()).toEqual(defaultProgress());
});

test('a reload mid-day keeps the day count and when the app was hidden', () => {
  const s = mem();
  const p = { ...defaultProgress(), day: { date: '2026-11-11', right: 6, days: 3, lastDone: '2026-11-10', practised: 3 }, hiddenAt: 1_762_870_000_000 };
  createStore(s).save(p);
  expect(createStore(s).load()).toEqual(p);
});
