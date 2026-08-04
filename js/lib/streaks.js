/* Streaks are DERIVED, never stored.
   Recomputing from entries means they cannot drift out of sync after a merge
   between two devices, which a stored counter absolutely would. */

import { today, addDays, weekKey, daysSince, monthDays } from './date.js';

/** Set of date keys this habit was ticked on. */
export function doneDays(entries, habitId) {
  const prefix = `${habitId}|`;
  const set = new Set();
  for (const [key, value] of Object.entries(entries)) {
    if (key.startsWith(prefix) && value && value.done) {
      set.add(key.slice(prefix.length));
    }
  }
  return set;
}

/**
 * Consecutive days up to today.
 *
 * If today is not ticked yet the streak is NOT broken — the day is not over.
 * Counting from yesterday in that case is what stops the app from showing
 * "0" every morning to someone with a 40-day run going.
 */
export function dailyStreak(done) {
  const current = runLengthBack(done, done.has(today()) ? today() : addDays(today(), -1));
  return { current, best: Math.max(bestRun(done, addDays), current) };
}

/**
 * Consecutive weeks with at least one tick, for `weekly` habits.
 *
 * The specific day never matters — planning the week on Friday night or Monday
 * morning both count. Pinning it to a weekday would turn a kept ritual into a
 * broken streak on a technicality.
 */
export function weeklyStreak(done) {
  const weeks = new Set([...done].map(weekKey));
  const thisWeek = weekKey(today());
  const start = weeks.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  const current = runLengthBack(weeks, start, (k) => addDays(k, -7));
  return { current, best: Math.max(bestRun(weeks, (k, n) => addDays(k, n * 7)), current) };
}

function runLengthBack(set, from, step = (k) => addDays(k, -1)) {
  let cursor = from;
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = step(cursor);
  }
  return n;
}

function bestRun(set, stepBy) {
  const keys = [...set].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of keys) {
    run = prev !== null && stepBy(prev, 1) === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export function monthCount(done, year, month) {
  return monthDays(year, month).filter((k) => done.has(k)).length;
}

export function lastDone(done) {
  let latest = null;
  for (const key of done) {
    if (latest === null || key > latest) latest = key;
  }
  return latest;
}

/**
 * Everything a habit row needs to render its stats, shaped by type.
 * `label` is the one-line summary shown next to the row.
 */
export function stats(habit, entries, year, month) {
  const done = doneDays(entries, habit.id);
  const count = monthCount(done, year, month);
  const total = monthDays(year, month).length;

  if (habit.type === 'daily') {
    const { current, best } = dailyStreak(done);
    return { type: 'daily', count, total, current, best, label: streakLabel(current, best, 'day') };
  }

  if (habit.type === 'weekly') {
    const { current, best } = weeklyStreak(done);
    return { type: 'weekly', count, total, current, best, label: streakLabel(current, best, 'week') };
  }

  // flexible — no streak, no target, no penalty for an empty cell.
  const last = lastDone(done);
  return { type: 'flexible', count, total, last, label: lastDoneLabel(last) };
}

function streakLabel(current, best, unit) {
  if (current > 0) return `${current} ${unit}${current === 1 ? '' : 's'} in a row`;
  // A broken streak reports the best run instead of a zero. The number that
  // was earned stays visible; nothing turns red.
  if (best > 0) return `Best: ${best} ${unit}${best === 1 ? '' : 's'}`;
  return 'Not started yet';
}

function lastDoneLabel(last) {
  if (!last) return 'Not done yet';
  const days = daysSince(last);
  if (days === 0) return 'Done today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
