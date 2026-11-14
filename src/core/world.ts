import type { Rng } from './rng';
import { pickStyle } from './robo';

export const AREA_W = 270, AREA_H = 360, HORIZON_Y = 90, PICK_EVERY = 3;

export const KINDS = ['tree', 'bush', 'mountain', 'lake', 'house'] as const;
export type WorldKind = (typeof KINDS)[number];

/** `area` is always 0 in release 1; x is in 0..AREA_W and y in HORIZON_Y..AREA_H. */
export interface WorldItem { kind: WorldKind; area: number; x: number; y: number }

export interface WorldState {
  items: WorldItem[];
  /** Picks she has spent; one is owed on day 1 and then for every PICK_EVERY days practised (days 1, 4, 7, ...). */
  picksUsed: number;
  /** The three kinds she is choosing between right now, kept so a reload shows the same three. */
  offer: WorldKind[] | null;
}

export const initialWorld = (): WorldState => ({ items: [], picksUsed: 0, offer: null });

export function picksOwed(practised: number, w: WorldState): number {
  return Math.ceil(practised / PICK_EVERY) - w.picksUsed;
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

const isValidOffer = (o: unknown) =>
  o === null || (Array.isArray(o) && o.length === 3 && o.every(isKind) && new Set(o).size === 3);

/** Strict: items, picksUsed and offer must all be sound. Loading runs `repairWorld` first, so only the offer is forgiven. */
export function isValidWorld(x: unknown): x is WorldState {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const w = x as Record<string, unknown>;
  return Array.isArray(w.items) && w.items.every(isValidItem)
    && isNonNegInt(w.picksUsed)
    && isValidOffer(w.offer);
}

/** A saved offer that is corrupt is just a lost offer (the app makes a fresh one); nothing else is repaired. */
export function repairWorld(x: unknown): unknown {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return x;
  const w = x as Record<string, unknown>;
  return isValidOffer(w.offer) ? x : { ...w, offer: null };
}

export type Zone = { x0: number; x1: number; y0: number; y1: number };

const GROUND_ZONE: Zone = { x0: 24, x1: 246, y0: 102, y1: AREA_H };
const ZONES: Record<WorldKind, Zone> = {
  mountain: { x0: 40, x1: 230, y0: 42, y1: 102 },
  tree: GROUND_ZONE,
  bush: GROUND_ZONE,
  house: GROUND_ZONE,
  lake: { x0: 48, x1: 222, y0: 135, y1: AREA_H },
};

export const zoneOf = (kind: WorldKind): Zone => ZONES[kind];

/** The spot an item lands on, or null when the tap is outside where its kind may go. Mountains sit on the horizon. */
export function snapPlacement(kind: WorldKind, x: number, y: number): { x: number; y: number } | null {
  const z = ZONES[kind];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null; // NaN fails every comparison below and would reach her save
  if (x < z.x0 || x > z.x1 || y < z.y0 || y > z.y1) return null;
  return { x, y: kind === 'mountain' ? HORIZON_Y : y };
}

/** Things lower on the screen are nearer, so drawn bigger. */
export const depthScale = (y: number): number => 0.4 + 0.75 * (y - HORIZON_Y) / (AREA_H - HORIZON_Y);

export const CHEER_LINES: readonly string[] = ["That's awesome!", 'That looks great!', 'Cool!', "It's perfect!", 'I love it!', 'Wow!'];

export const pickCheer = (last: string | null, rng: Rng): string => pickStyle(CHEER_LINES, last, rng);

export const pickPrompt = (days: number): string => `${days} ${days === 1 ? 'day' : 'days'} of math! Let's add something to our world!`;
export const PLACE_PROMPT = 'Tap where it goes!';
