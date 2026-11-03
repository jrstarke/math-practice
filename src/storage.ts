import { initialOpState } from './core/adaptive';
import { defaultProgress, type OpKey, type Progress } from './core/progress';

/**
 * Each version lives under its own key, so an older build never reads a newer record and resets her progress.
 * Older keys are read once to migrate and never written, so a rollback still finds the last save it understands.
 */
export const STORAGE_KEY = 'math-practice-progress-v6';
export const V5_STORAGE_KEY = 'math-practice-progress-v5';
export const V4_STORAGE_KEY = 'math-practice-progress-v4';
export const V3_STORAGE_KEY = 'math-practice-progress-v3';
export const V2_STORAGE_KEY = 'math-practice-progress-v2';
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

/** v6 added division and the unlock welcome. */
type ProgressV5 = Omit<Progress, 'version' | 'division' | 'welcome'> & { version: 5 };
/** Same shape as v5; only the meaning of multiplication levels 7-9 differs. */
type ProgressV4 = Omit<ProgressV5, 'version'> & { version: 4 };
type ProgressV3 = Omit<ProgressV4, 'version' | 'multiplication'> & { version: 3 };
type ProgressV2 = Omit<ProgressV3, 'version' | 'unlocked'> & { version: 2 };
type ProgressV1 = Omit<ProgressV2, 'version' | 'total'> & { version: 1 };
const OP_KEYS: readonly OpKey[] = ['addition', 'subtraction'];
const OP_KEYS_V4: readonly OpKey[] = ['addition', 'subtraction', 'multiplication'];
const OP_KEYS_V6: readonly OpKey[] = ['addition', 'subtraction', 'multiplication', 'division'];

function isValidProgressV1(x: unknown): x is ProgressV1 {
  return isObj(x) && x.version === 1 && hasValidCommonFields(x);
}

function isValidProgressV2(x: unknown): x is ProgressV2 {
  return isObj(x) && x.version === 2 && hasValidCommonFields(x) && isIntIn(x.total, 0, Number.MAX_SAFE_INTEGER);
}

/** Accepts only the operations v3 ever knew about; untouched by the v4 upgrade. */
function isValidUnlocked(x: unknown): boolean {
  return Array.isArray(x)
    && x.includes('addition')
    && x.every(k => (OP_KEYS as readonly unknown[]).includes(k))
    && new Set(x).size === x.length;
}

/** Today's v3 checks, kept verbatim under a new name now that v4 is current. */
function isValidProgressV3(x: unknown): x is ProgressV3 {
  return isObj(x) && x.version === 3 && hasValidCommonFields(x)
    && isIntIn(x.total, 0, Number.MAX_SAFE_INTEGER) && isValidUnlocked(x.unlocked);
}

/** Like isValidUnlocked, but also accepts multiplication now that it can be unlocked. */
function isValidUnlockedV4(x: unknown): boolean {
  return Array.isArray(x)
    && x.includes('addition')
    && x.every(k => (OP_KEYS_V4 as readonly unknown[]).includes(k))
    && new Set(x).size === x.length;
}

/** Fields shared by v4 and v5, which differ only in their version number. */
function hasValidV4Fields(x: Record<string, unknown>): boolean {
  return hasValidCommonFields(x) && isValidOpState(x.multiplication)
    && isIntIn(x.total, 0, Number.MAX_SAFE_INTEGER) && isValidUnlockedV4(x.unlocked);
}

function isValidProgressV4(x: unknown): x is ProgressV4 {
  return isObj(x) && x.version === 4 && hasValidV4Fields(x);
}

function isValidProgressV5(x: unknown): x is ProgressV5 {
  return isObj(x) && x.version === 5 && hasValidV4Fields(x);
}

/** Like isValidUnlockedV4, but also accepts division. */
function isValidUnlockedV6(x: unknown): x is OpKey[] {
  return Array.isArray(x)
    && x.includes('addition')
    && x.every(k => (OP_KEYS_V6 as readonly unknown[]).includes(k))
    && new Set(x).size === x.length;
}

/** null, or a countdown of 0-3 for an operation that is unlocked. */
function isValidWelcome(x: unknown, unlocked: OpKey[]): boolean {
  return x === null || (isObj(x) && unlocked.includes(x.op as OpKey) && isIntIn(x.left, 0, 3));
}

export function isValidProgress(x: unknown): x is Progress {
  return isObj(x) && x.version === 6 && hasValidCommonFields(x)
    && isValidOpState(x.multiplication) && isValidOpState(x.division)
    && isIntIn(x.total, 0, Number.MAX_SAFE_INTEGER)
    && isValidUnlockedV6(x.unlocked) && isValidWelcome(x.welcome, x.unlocked);
}

/** v1 had no running total: start it at the best streak, as credit for work already done. */
function upgradeV1(p: ProgressV1): ProgressV2 {
  return { ...p, version: 2, total: p.bestStreak };
}

/** v2 players already practised both operations, so both stay unlocked (never re-locked by an upgrade). */
function upgradeV2(p: ProgressV2): ProgressV3 {
  return { ...p, version: 3, unlocked: ['addition', 'subtraction'] };
}

/** v3 players' unlocks carry over as-is; if she already qualifies for multiplication, the path rule
 * announces it naturally on her next at-level answer rather than during this upgrade. */
function upgradeV3(p: ProgressV3): ProgressV4 {
  return { ...p, version: 4, multiplication: initialOpState() };
}

/**
 * v5 reordered multiplication's top levels (v4: 7 = facts 6-9, 8 = 2-digit × 2-9, 9 = 3-digit × 2-5;
 * v5: 7 = 2-digit × 2-5, 8 = 3-digit × 2-5, 9 = facts 6-9). Each old level goes to the new level closest to
 * what she was practising; a moved level's window is cleared, since its scores were for other problems.
 */
const V4_MULTIPLICATION_LEVEL: Record<number, number> = { 7: 7, 8: 7, 9: 8 };

function upgradeV4(p: ProgressV4): ProgressV5 {
  const { level } = p.multiplication;
  const moved = level in V4_MULTIPLICATION_LEVEL;
  const multiplication = moved ? { ...p.multiplication, level: V4_MULTIPLICATION_LEVEL[level], window: [] } : p.multiplication;
  return { ...p, version: 5, multiplication };
}

/** v5 players start division unstarted; the path rule unlocks it on her next at-level answer if she qualifies. */
function upgradeV5(p: ProgressV5): Progress {
  return { ...p, version: 6, division: initialOpState(), welcome: null };
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
        const v5 = readJson(storage, V5_STORAGE_KEY);
        if (isValidProgressV5(v5)) return upgradeV5(v5);
        const v4 = readJson(storage, V4_STORAGE_KEY);
        if (isValidProgressV4(v4)) return upgradeV5(upgradeV4(v4));
        const v3 = readJson(storage, V3_STORAGE_KEY);
        if (isValidProgressV3(v3)) return upgradeV5(upgradeV4(upgradeV3(v3)));
        const v2 = readJson(storage, V2_STORAGE_KEY);
        if (isValidProgressV2(v2)) return upgradeV5(upgradeV4(upgradeV3(upgradeV2(v2))));
        const v1 = readJson(storage, LEGACY_STORAGE_KEY);
        return isValidProgressV1(v1) ? upgradeV5(upgradeV4(upgradeV3(upgradeV2(upgradeV1(v1))))) : defaultProgress();
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
