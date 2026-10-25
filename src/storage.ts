import { defaultProgress, type Progress } from './core/progress';

/** v2+ lives under its own key, so an older build (which only knows v1) never reads it and resets her progress. */
export const STORAGE_KEY = 'math-practice-progress-v2';
/** Where v1 was saved. Read once to migrate, never written, so a rollback still finds the last v1 save. */
export const LEGACY_STORAGE_KEY = 'math-practice-progress';

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

/** Fields shared by every saved version. */
function hasValidCommonFields(x: Record<string, unknown>): boolean {
  return isValidOpState(x.addition)
    && isValidOpState(x.subtraction)
    && isIntIn(x.streak, 0, Number.MAX_SAFE_INTEGER)
    && isIntIn(x.bestStreak, 0, Number.MAX_SAFE_INTEGER)
    && typeof x.muted === 'boolean'
    && typeof x.installTipShown === 'boolean';
}

type ProgressV1 = Omit<Progress, 'version' | 'total'> & { version: 1 };

function isValidProgressV1(x: unknown): x is ProgressV1 {
  return isObj(x) && x.version === 1 && hasValidCommonFields(x);
}

export function isValidProgress(x: unknown): x is Progress {
  return isObj(x) && x.version === 2 && hasValidCommonFields(x) && isIntIn(x.total, 0, Number.MAX_SAFE_INTEGER);
}

/** v1 had no running total: start it at the best streak, as credit for work already done. */
function upgradeV1(p: ProgressV1): Progress {
  return { ...p, version: 2, total: p.bestStreak };
}

function readJson(storage: KV, key: string): unknown {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Progress persistence that never throws; falls back to memory when storage is unavailable. */
export function createStore(storage: KV | null): ProgressStore {
  let memory: Progress | null = null;
  return {
    load() {
      if (!storage) return memory ?? defaultProgress();
      try {
        const current = readJson(storage, STORAGE_KEY);
        if (isValidProgress(current)) return current;
        const legacy = readJson(storage, LEGACY_STORAGE_KEY);
        return isValidProgressV1(legacy) ? upgradeV1(legacy) : defaultProgress();
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
