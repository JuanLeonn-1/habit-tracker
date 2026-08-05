/* Every date key is built in LOCAL time.
   toISOString() converts to UTC — in a negative offset a habit ticked at 9pm
   lands on the next day, which silently splits a streak in two. That bug is the
   reason all date handling lives here and nowhere else. */

/** Indexed by getDay(), so Sunday stays at 0 — this is a lookup, not an order. */
export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/** Display order: weeks start on Monday, so Sunday lands at the end. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Days from Monday to the given JS day number. */
function sinceMonday(jsDay) {
  return (jsDay + 6) % 7;
}

export const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

/** Date -> "YYYY-MM-DD" in local time. */
export function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" -> Date at local midnight. */
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Whole days from a to b (negative if b is earlier). */
export function daysBetween(aKey, bKey) {
  const a = fromKey(aKey);
  const b = fromKey(bKey);
  // Normalising to midday absorbs the ±1h that a DST boundary would otherwise
  // introduce, which would round the difference to the wrong day.
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}

export function daysSince(key) {
  return daysBetween(key, today());
}

/** Key of the Monday starting that week — weeks run MON..SUN. */
export function weekKey(key) {
  const d = fromKey(key);
  return toKey(addDaysToDate(d, -sinceMonday(d.getDay())));
}

function addDaysToDate(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/** All date keys in a month, in order. */
export function monthDays(year, month) {
  const out = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    out.push(toKey(new Date(year, month, d)));
  }
  return out;
}

/**
 * Six MON..SUN weeks covering the month, including the leading and trailing
 * days from adjacent months — the reference sheet shows those too.
 */
export function calendarWeeks(year, month) {
  const first = new Date(year, month, 1);
  const start = addDaysToDate(first, -sinceMonday(first.getDay()));
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = addDaysToDate(start, w * 7 + d);
      week.push({
        key: toKey(date),
        day: date.getDate(),
        inMonth: date.getMonth() === month,
      });
    }
    weeks.push(week);
  }
  // A month only needs six rows when it starts late; drop a trailing empty one.
  if (weeks[5].every((c) => !c.inMonth)) weeks.pop();
  return weeks;
}

export function monthLabel(year, month) {
  return `${MONTHS[month]} ${year}`;
}

export function isToday(key) {
  return key === today();
}
