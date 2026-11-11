/** Right answers in a day that count the day toward her days-in-a-row streak. */
export const DAILY_GOAL = 10;

/** Dates are the iPad's local calendar dates as 'YYYY-MM-DD'. */
export interface DayStreak {
  /** The date `right` counts for. */
  date: string | null;
  /** Right answers on `date` (with or without hints; a Pass doesn't count). */
  right: number;
  /** Days in a row, as of `lastDone`. */
  days: number;
  /** The last date she reached the goal. */
  lastDone: string | null;
  /** Days she reached the goal, in total: never lowered by a missed day or a new streak. Not shown yet; Robo's
   * world will grow with it. */
  practised: number;
}

export function initialDayStreak(): DayStreak {
  return { date: null, right: 0, days: 0, lastDone: null, practised: 0 };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function utcDay(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Calendar days from `from` to `to` (negative if `to` is earlier). Daylight saving can't affect it. */
export function daysBetween(from: string, to: string): number {
  return utcDay(to) - utcDay(from);
}

/**
 * Count one right answer on `today`. The goal's answer completes the day: a day or two after the last completed
 * day grows the streak (one missed day is forgiven), anything longer starts over at 1. Starting over is silent.
 */
export function countRightAnswer(s: DayStreak, today: string): { streak: DayStreak; completed: number | null } {
  const right = (s.date === today ? s.right : 0) + 1;
  const counted: DayStreak = { ...s, date: today, right };
  if (right !== DAILY_GOAL) return { streak: counted, completed: null };

  const gap = s.lastDone ? daysBetween(s.lastDone, today) : Infinity;
  // Already done today, or the clock went backwards: leave the streak as it is.
  if (gap <= 0) return { streak: counted, completed: null };
  const days = gap <= 2 ? s.days + 1 : 1;
  return { streak: { ...counted, days, lastDone: today, practised: s.practised + 1 }, completed: days };
}
