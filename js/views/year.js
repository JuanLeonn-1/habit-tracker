/* The whole year at a glance — one thin bar per day, one row per habit.
   This is the view a tracker earns over time: a month tells you little, but
   twelve months of texture tells you what you actually kept up.

   Read-only on purpose. Cells are five pixels wide; anything tappable at that
   size is a trap, and ticking belongs on Today. */

import { MONTHS, monthDays, daysInMonth, isToday } from '../lib/date.js';
import { doneDays } from '../lib/streaks.js';

let cursor = null;
let scrollLeft = 0;

export function renderYear(store, repaint) {
  if (cursor === null) cursor = new Date().getFullYear();

  const el = document.createElement('section');
  el.append(nav(repaint));

  const habits = store.habits();
  if (habits.length === 0) {
    el.append(empty());
    return el;
  }

  const days = [];
  for (let month = 0; month < 12; month++) days.push(...monthDays(cursor, month));

  const wrap = document.createElement('div');
  wrap.className = 'year-wrap';

  const grid = document.createElement('div');
  grid.className = 'year';
  grid.append(monthHeader());

  const entries = store.getState().entries;
  let overall = 0;
  for (const habit of habits) {
    const done = doneDays(entries, habit.id);
    const total = days.filter((key) => done.has(key)).length;
    overall += total;
    grid.append(habitRow(habit, done, days, total));
  }

  wrap.append(grid);
  // Restore after layout, so ticking through months does not reset the scroll.
  requestAnimationFrame(() => { wrap.scrollLeft = scrollLeft; });
  wrap.addEventListener('scroll', () => { scrollLeft = wrap.scrollLeft; }, { passive: true });

  el.append(wrap);
  el.append(footer(overall, habits.length));
  return el;
}

function nav(repaint) {
  const header = document.createElement('header');
  header.className = 'month-nav';
  header.innerHTML = `
    <button class="month-nav__arrow" data-step="-1" aria-label="Previous year">‹</button>
    <h2 class="month-nav__label">${cursor}</h2>
    <button class="month-nav__arrow" data-step="1" aria-label="Next year">›</button>
  `;
  header.addEventListener('click', (event) => {
    const step = event.target.closest('[data-step]')?.dataset.step;
    if (!step) return;
    cursor += Number(step);
    scrollLeft = 0;
    repaint();
  });
  return header;
}

function monthHeader() {
  const labels = Array.from({ length: 12 }, (_, month) => (
    `<span class="year__month" style="--days:${daysInMonth(cursor, month)}">${MONTHS[month].slice(0, 3)}</span>`
  )).join('');

  const row = document.createElement('div');
  row.className = 'year__row year__row--head';
  row.innerHTML = `
    <div class="year__name"></div>
    <div class="year__cells">${labels}</div>
    <div class="year__total">Days</div>
  `;
  return row;
}

function habitRow(habit, done, days, total) {
  // Built as one HTML string rather than 365 createElement calls — with a dozen
  // habits that is five thousand nodes, and the difference is visible.
  const cells = days.map((key) => (
    `<span class="year__cell"`
    + ` data-done="${done.has(key)}"`
    + ` data-first="${key.slice(8) === '01'}"`
    + ` data-today="${isToday(key)}"></span>`
  )).join('');

  const row = document.createElement('div');
  row.className = 'year__row';
  row.style.setProperty('--pill', `var(--c${habit.color})`);
  row.innerHTML = `
    <div class="year__name">
      <span aria-hidden="true">${habit.icon || ''}</span>
      <span class="year__label">${escapeHtml(habit.name)}</span>
    </div>
    <div class="year__cells" role="img"
         aria-label="${escapeHtml(habit.name)}: ${total} of ${days.length} days in ${cursor}">${cells}</div>
    <div class="year__total">${total}</div>
  `;
  return row;
}

function footer(overall, habitCount) {
  const p = document.createElement('p');
  p.className = 'cal__hint';
  p.textContent = `${overall.toLocaleString()} ticks across ${habitCount} habits in ${cursor}.`;
  return p;
}

function empty() {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = 'No habits yet.';
  return p;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
