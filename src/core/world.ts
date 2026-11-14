import type { Rng } from './rng';

export const AREA_W = 270, AREA_H = 360, HORIZON_Y = 90, PICK_EVERY = 5;

export const KINDS = ['tree', 'bush', 'mountain', 'lake', 'house'] as const;
export type WorldKind = (typeof KINDS)[number];

/** `area` is always 0 in release 1; x is in 0..AREA_W and y in HORIZON_Y..AREA_H. */
export interface WorldItem { kind: WorldKind; area: number; x: number; y: number }

export interface WorldState {
  items: WorldItem[];
  /** Picks she has spent; one is owed for every PICK_EVERY days practised. */
  picksUsed: number;
  /** The three kinds she is choosing between right now, kept so a reload shows the same three. */
  offer: WorldKind[] | null;
}

export const initialWorld = (): WorldState => ({ items: [], picksUsed: 0, offer: null });

export function picksOwed(practised: number, w: WorldState): number {
  return Math.floor(practised / PICK_EVERY) - w.picksUsed;
}

/** Three distinct kinds: a partial Fisher-Yates that draws from `rng` exactly three times. */
export function makeOffer(rng: Rng): WorldKind[] {
  const pool = [...KINDS];
  for (let i = 0; i < 3; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function placeItem(w: WorldState, item: WorldItem): WorldState {
  return { items: [...w.items, item], picksUsed: w.picksUsed + 1, offer: null };
}

const isKind = (x: unknown): x is WorldKind => (KINDS as readonly unknown[]).includes(x);
const isNum = (x: unknown, lo: number, hi: number) => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
const isNonNegInt = (x: unknown) => Number.isInteger(x) && (x as number) >= 0;

function isValidItem(x: unknown): x is WorldItem {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const i = x as Record<string, unknown>;
  return isKind(i.kind) && isNonNegInt(i.area) && isNum(i.x, 0, AREA_W) && isNum(i.y, HORIZON_Y, AREA_H)
    && (i.kind !== 'mountain' || i.y === HORIZON_Y);
}

export function isValidWorld(x: unknown): x is WorldState {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const w = x as Record<string, unknown>;
  return Array.isArray(w.items) && w.items.every(isValidItem)
    && isNonNegInt(w.picksUsed)
    && (w.offer === null || (Array.isArray(w.offer) && w.offer.length === 3 && w.offer.every(isKind) && new Set(w.offer).size === 3));
}
