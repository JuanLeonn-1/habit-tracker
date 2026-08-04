/* Which month the Month and Calendar views are showing.
   Shared on purpose: paging back to June in one view and switching to the
   other should not silently jump back to today. */

let cursor = null;

export function current() {
  if (!cursor) {
    const now = new Date();
    cursor = { year: now.getFullYear(), month: now.getMonth() };
  }
  return cursor;
}

export function step(n) {
  const { year, month } = current();
  const date = new Date(year, month + n, 1);
  cursor = { year: date.getFullYear(), month: date.getMonth() };
  return cursor;
}
