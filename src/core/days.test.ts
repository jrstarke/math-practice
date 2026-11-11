import { describe, expect, it } from 'vitest';
import { countRightAnswer, daysBetween, initialDayStreak, localDate, type DayStreak } from './days';

/** `n` right answers on `today`, starting from `s`; returns the last result and every `completed`. */
function answers(s: DayStreak, today: string, n: number) {
  const completed: (number | null)[] = [];
  let streak = s;
  for (let i = 0; i < n; i++) {
    const r = countRightAnswer(streak, today);
    streak = r.streak;
    completed.push(r.completed);
  }
  return { streak, completed };
}

describe('localDate', () => {
  it('is the local calendar date, zero-padded', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDate(new Date(2026, 10, 11, 0, 0))).toBe('2026-11-11');
  });
});

describe('daysBetween', () => {
  it('counts calendar days across months, years and a daylight-saving change', () => {
    expect(daysBetween('2026-11-10', '2026-11-11')).toBe(1);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetween('2026-11-11', '2026-11-10')).toBe(-1);
  });
});

describe('countRightAnswer', () => {
  it('the 10th right answer of her first day completes day 1; later answers add nothing', () => {
    const r = answers(initialDayStreak(), '2026-11-11', 11);
    expect(r.completed).toEqual([null, null, null, null, null, null, null, null, null, 1, null]);
    expect(r.streak).toEqual({ date: '2026-11-11', right: 11, days: 1, lastDone: '2026-11-11' });
  });

  it('nine answers do not complete the day', () => {
    const r = answers(initialDayStreak(), '2026-11-11', 9);
    expect(r.completed.every(c => c === null)).toBe(true);
    expect(r.streak.right).toBe(9);
  });

  it('the day after a completed day grows the streak, and the count restarts on the new date', () => {
    const s: DayStreak = { date: '2026-11-10', right: 10, days: 4, lastDone: '2026-11-10' };
    expect(countRightAnswer(s, '2026-11-11').streak).toMatchObject({ date: '2026-11-11', right: 1 });
    const r = answers(s, '2026-11-11', 10);
    expect(r.completed[9]).toBe(5);
    expect(r.streak).toEqual({ date: '2026-11-11', right: 10, days: 5, lastDone: '2026-11-11' });
  });

  it('one missed day is forgiven: the streak waits and grows by one', () => {
    const s: DayStreak = { date: '2026-11-09', right: 12, days: 4, lastDone: '2026-11-09' };
    expect(answers(s, '2026-11-11', 10).completed[9]).toBe(5);
  });

  it('two missed days in a row start over at day 1', () => {
    const s: DayStreak = { date: '2026-11-08', right: 12, days: 4, lastDone: '2026-11-08' };
    const r = answers(s, '2026-11-11', 10);
    expect(r.completed[9]).toBe(1);
    expect(r.streak.days).toBe(1);
  });

  it('answers before midnight do not count toward the next day', () => {
    const before = answers(initialDayStreak(), '2026-11-10', 5);
    const after = answers(before.streak, '2026-11-11', 10);
    expect(after.completed.slice(0, 9).every(c => c === null)).toBe(true);
    expect(after.completed[9]).toBe(1);
    // Five more on the 10th would have reached 10 there, but the 10th is over.
    expect(before.streak).toMatchObject({ date: '2026-11-10', right: 5, days: 0, lastDone: null });
  });

  it('a clock moved backwards neither grows nor breaks the streak', () => {
    const s: DayStreak = { date: '2026-11-11', right: 10, days: 3, lastDone: '2026-11-11' };
    const back = answers(s, '2026-11-10', 10);
    expect(back.completed.every(c => c === null)).toBe(true);
    expect(back.streak).toMatchObject({ days: 3, lastDone: '2026-11-11' });
    const forward = answers(back.streak, '2026-11-11', 10);
    expect(forward.completed.every(c => c === null)).toBe(true);
    expect(forward.streak).toMatchObject({ days: 3, lastDone: '2026-11-11' });
  });
});
