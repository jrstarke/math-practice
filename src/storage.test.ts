import { defaultProgress } from './core/progress';
import { createStore, STORAGE_KEY } from './storage';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

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
