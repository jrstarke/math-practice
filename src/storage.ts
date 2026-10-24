import { defaultProgress, type Progress } from './core/progress';

export const STORAGE_KEY = 'math-practice-progress';

export interface ProgressStore {
  load(): Progress;
  save(p: Progress): void;
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isIntIn = (x: unknown, lo: number, hi: number) => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;

function isValidOpState(x: unknown): boolean {
  return isObj(x)
    && isIntIn(x.level, 1, 9)
    && Array.isArray(x.window)
    && x.window.length <= 5
    && x.window.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1)
    && isIntIn(x.calibrationLeft, 0, 10);
}

export function isValidProgress(x: unknown): x is Progress {
  return isObj(x)
    && x.version === 1
    && isValidOpState(x.addition)
    && isValidOpState(x.subtraction)
    && isIntIn(x.streak, 0, Number.MAX_SAFE_INTEGER)
    && isIntIn(x.bestStreak, 0, Number.MAX_SAFE_INTEGER)
    && typeof x.muted === 'boolean'
    && typeof x.installTipShown === 'boolean';
}

/** Progress persistence that never throws; falls back to memory when storage is unavailable. */
export function createStore(storage: KV | null): ProgressStore {
  let memory: Progress | null = null;
  return {
    load() {
      if (!storage) return memory ?? defaultProgress();
      try {
        const raw = storage.getItem(STORAGE_KEY);
        const parsed: unknown = raw === null ? null : JSON.parse(raw);
        return isValidProgress(parsed) ? parsed : defaultProgress();
      } catch {
        return defaultProgress();
      }
    },
    save(p) {
      if (!storage) { memory = p; return; }
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(p));
      } catch {
        // Storage full or blocked: progress for this session is lost, but the app keeps working.
      }
    },
  };
}
